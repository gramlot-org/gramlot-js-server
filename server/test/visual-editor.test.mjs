import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, writeFile, rm, symlink, stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {GramlotBuilder} from '@gramlot/gramlot';
import {toTytx, fromTytx} from '@genrojs/tytx';
import {VisualEditorDocuments} from '../src/visual-editor.mjs';
import {startGallery} from '../src/gallery.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
const content = text => `import {Page as BasePage} from '@gramlot/gramlot/page';
export class Page extends BasePage { async main(root) { root.h2(${JSON.stringify(text)}); } }`;
async function fixture(t) {
    const folder = await mkdtemp(join(root, '.editor-'));
    t.after(() => rm(folder, {recursive:true, force:true}));
    const file = join(folder, 'page.js');
    await writeFile(file, content('Initial'), {mode:0o640});
    return {file, folder, service:new VisualEditorDocuments({files:{page:file}, remoteEdit:true})};
}

test('configured documents enforce the write gate, syntax, size, identity and revisions', async t => {
    const {file, folder, service} = await fixture(t);
    const original = await service.document('page');
    assert.equal(original.language, 'javascript');
    assert.equal(original.writable, true);
    const readonly = new VisualEditorDocuments({files:{page:file}});
    assert.equal((await readonly.document('page')).writable, false);
    await assert.rejects(readonly.save({key:'page', content:content('Changed'), revision:original.revision}), /disabled/);
    await assert.rejects(readonly.preview(new GramlotBuilder().root, {key:'page', revision:original.revision, data_root:'data'}), /disabled/);
    await assert.rejects(service.document('../page.js'), /Unknown/);
    for (const invalid of ['export class Page {', 'const x = ;', '\0', '\ud800', 'x'.repeat(2*1024*1024+1)]) {
        await assert.rejects(service.save({key:'page', content:invalid, revision:original.revision}));
        assert.equal(await readFile(file, 'utf8'), original.content);
    }
    const saved = await service.save({key:'page', content:content('Saved'), revision:original.revision});
    assert.notEqual(saved.revision, original.revision);
    assert.equal((await stat(file)).mode & 0o777, 0o640);
    await assert.rejects(service.save({key:'page',content:original.content,revision:original.revision}), /changed on disk/);
    const link = join(folder, 'link.js'); await symlink(file,link);
    await assert.rejects(new VisualEditorDocuments({files:{page:link},remoteEdit:true}).document('page'), /symbolic link/);
});

test('concurrent saves have one winner; saving never executes the module; preview uses saved revisions', async t => {
    const {file, service} = await fixture(t);
    const original = await service.document('page');
    const other = new VisualEditorDocuments({files:{page:file},remoteEdit:true});
    const results = await Promise.allSettled([service,other].map((s,i)=>s.save({key:'page',content:content(`Version ${i}`),revision:original.revision})));
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    assert.equal(results.filter(r=>r.status==='rejected').length,1);
    const first = await service.document('page');
    const marker = 'globalThis.editorModuleExecuted = true;\n';
    const saved = await service.save({key:'page',content:marker+content('Saved preview'),revision:first.revision});
    assert.equal(globalThis.editorModuleExecuted, undefined);
    t.after(()=>delete globalThis.editorModuleExecuted);
    const builder = new GramlotBuilder();
    await service.preview(builder.root,{key:'page',revision:saved.revision,data_root:'scopedData'});
    assert.equal(globalThis.editorModuleExecuted, undefined, 'preview runs in its own process');
    assert.equal(builder.source.getNode('pageRoot.h2_0').value,'Saved preview');
    assert.equal(builder.source.getNode('pageRoot').attr.datapath,'scopedData');
    const next = await service.save({key:'page',content:content('Fresh revision'),revision:saved.revision});
    const fresh = new GramlotBuilder();
    await service.preview(fresh.root,{key:'page',revision:next.revision,data_root:'scopedData'});
    assert.equal(fresh.source.getNode('pageRoot.h2_0').value,'Fresh revision');
    await assert.rejects(service.preview(new GramlotBuilder().root,{key:'page',revision:saved.revision,data_root:'data'}), /changed/);
});

test('configured gallery exposes document commands only on its editor and serves saved preview over RPC', async t => {
    const {file,service} = await fixture(t);
    const document = await service.document('page');
    const runtime = globalThis.Bun ? 'bun' : 'node';
    const app = await startGallery({runtime,editorJavaScript:file,remoteEdit:true});
    t.after(()=>app.close());
    const opened = await fetch(app.url+'/pages/07-tools/02-visual_source');
    const cookie = opened.headers.get('set-cookie').split(';',1)[0];
    const html = await opened.text();
    const {config} = JSON.parse(html.match(/new PageBootstrap\((.*)\)\.run\(\)/s)[1]);
    const call = async (contentType,name,params={}) => {
        const reply = await fetch(app.url+config.rpcUrl,{method:'POST',headers:{'content-type':'application/json',cookie},
            body:toTytx({id:'editor',pageId:config.pageId,contentType,name,params})});
        assert.equal(reply.status,200);
        return fromTytx(await reply.text());
    };
    const main = await call('source','main');
    assert.equal(main.error,undefined);
    assert.match(toTytx(main.value),/codeDocument/);
    assert.match(toTytx(main.value),/javascript/);
    const changed = content('From HTTP');
    const saved = await call('data','editor_document_save',{key:'page',content:changed,revision:document.revision});
    assert.equal(saved.error,undefined);
    assert.equal(await readFile(file,'utf8'),changed);
    const preview = await call('source','editor_document_preview',{key:'page',revision:saved.value.revision,data_root:'pageData'});
    assert.equal(preview.error,undefined);
    assert.equal(preview.value.getNode('pageRoot.h2_0').value,'From HTTP');
    const stale = await call('data','editor_document_save',{key:'page',content:document.content,revision:document.revision});
    assert.match(stale.error.message,/changed on disk/);
    const unknown = await call('data','editor_document_save',{key:'../page.js',content:changed,revision:saved.value.revision});
    assert.match(unknown.error.message,/Unknown/);
    const ordinary = await import(new URL('file://'+app.pages+'/pages/00-html_svg/01-html_basics/01-hello_world.js'));
    assert.equal(new ordinary.Page().editor_document_save,undefined);
});

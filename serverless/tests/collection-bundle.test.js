import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {register} from 'node:module';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,cp,readFile,writeFile,rm,realpath} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {tmpdir} from 'node:os';
import {collections, files} from './standard-collections.js';
import * as core from '@gramlot/gramlot';
import {collectionBundle} from '../src/collection-bundle.js';

test('derived collection retains original identity and the shared runtime',async()=>{
    const collection=collections.find(c=>c.name==='inputs');
    const tree = collections.find(c => c.name === 'tree');
    const treeCode = await collectionBundle(tree, fileURLToPath(files[tree.module]));
    register('data:text/javascript,' + encodeURIComponent(`
        let imports;
        export function initialize(data) { imports = data; }
        export function resolve(name, context, next) {
            return Object.hasOwn(imports, name) ? {url:imports[name], shortCircuit:true} : next(name, context);
        }
    `), {data:{'@gramlot/collections/tree':'data:text/javascript;base64,' + Buffer.from(treeCode).toString('base64')}});
    const code=await collectionBundle(collection,fileURLToPath(files[collection.module]));
    const previous=globalThis.GramlotStandalone;
    globalThis.GramlotStandalone=core;
    try {
        const module=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
        assert.equal(module.buildId,collection.buildId);
        assert.ok(module.default instanceof core.ComponentCollection);
        assert.doesNotMatch(code,/class ComponentCollection/);
    } finally {globalThis.GramlotStandalone=previous;}
});

test('artifact tampering stops derived bundling',async t=>{
    const collection=collections.find(c=>c.name==='inputs');
    const root=await mkdtemp(join(tmpdir(),'gramlot-export-integrity-'));
    t.after(()=>rm(root,{recursive:true,force:true}));
    await cp(dirname(dirname(fileURLToPath(files[collection.module]))),root,{recursive:true});
    const file=join(root,'assets/collection.js');
    await writeFile(file,(await readFile(file,'utf8'))+'\n// changed');
    await assert.rejects(collectionBundle(collection,join(root,'assets/index.js')),/fingerprint mismatch/);
});

test('file-derived layout uses the window runtime factory and sanitizes reactive drawer labels', async t => {
    const {JSDOM} = await import('jsdom');
    const {window} = new JSDOM('<main id="gramlot-root"></main>');
    t.after(() => window.close());
    // JSDOM has no layout/resize observer; browser geometry is tested by the file export probe.
    window.ResizeObserver = class {observe() {} unobserve() {} disconnect() {}};
    window.requestAnimationFrame = () => 0;
    window.cancelAnimationFrame = () => {};
    Object.defineProperty(window.document, 'fonts', {value:new window.EventTarget()});
    const collection = collections.find(c => c.name === 'layout');
    const code = await collectionBundle(collection, fileURLToPath(files[collection.module]));
    assert.doesNotMatch(code, /DOMPurify \d+\./);
    let calls = 0;
    const previous = globalThis.GramlotStandalone;
    globalThis.GramlotStandalone = {...core, createDOMPurify(view) {
        assert.equal(view, window); calls++;
        return core.createDOMPurify(view);
    }};
    t.after(() => {globalThis.GramlotStandalone = previous;});
    const {default: layout} = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
    const app = new core.Gramlot({document:window.document, transport:false, collections:[layout]});
    t.after(() => app.dispose());
    const builder = new core.GramlotBuilder(null, {collections:[layout]});
    const border = builder.root.borderContainer({id:'border'});
    border.contentPane({region:'center'});
    border.contentPane({region:'right', drawer:true, drawer_label:'^caption'});
    app.data.setItem('caption', '<b>Safe</b><img src=x onerror="bad()">');
    app.src.startSource(builder.toTytx());
    await new Promise(resolve => setTimeout(resolve, 0));
    const label = window.document.getElementById('border').shadowRoot.querySelector('.separator[data-side=right] button');
    assert.equal(calls, 1);
    assert.equal(label.querySelector('b').textContent, 'Safe');
    assert.equal(label.querySelector('[onerror]'), null);
    app.data.setItem('caption', '<em>Updated</em><script>bad()</script>');
    assert.equal(label.querySelector('em').textContent, 'Updated');
    assert.equal(label.querySelector('script'), null);
});


test('derived grid keeps its declared input dependency external', async () => {
    const collection = collections.find(c => c.name === 'grid');
    const code = await collectionBundle(collection, fileURLToPath(files[collection.module]));
    assert.match(code, /from "@gramlot\/collections\/inputs"/);
    assert.doesNotMatch(code, /class EditingSession|class FieldState/);
});

async function runtimeFixture(t, source, assets = []) {
    const root = await realpath(await mkdtemp(join(tmpdir(), 'gramlot-runtime-exports-')));
    t.after(() => rm(root, {recursive:true, force:true}));
    const files = new Map([
        ...assets, ['grammar.json', Buffer.from('{}')], ['commands.json', Buffer.from('{}')],
        ['assets/index.js', Buffer.from('')], ['assets/collection.js', Buffer.from(source + '\nexport default {};')],
    ]);
    const metadata = {name:'probe', grammar:'grammar.json', commands:'commands.json',
        module:'assets/index.js', css:[], dependencies:[], files:[...files.keys()]};
    const buildId = await core.collectionBuildId(metadata, files);
    files.set('assets/index.js', Buffer.from(`export {default} from "./collection.js";\nexport * from "./collection.js";\nexport const buildId = "${buildId}";\n`));
    await mkdir(join(root, 'assets'));
    for (const [name, bytes] of files) await writeFile(join(root, name), bytes);
    return collectionBundle({name:'probe', grammar:{}, module:'/probe/assets/index.js',
        buildId, css:[], dependencies:[]}, join(root, 'assets/index.js'));
}

test('derived collections use the window codec and public class identities', async t => {
    const code = await runtimeFixture(t, `
        import {Bag, toTytx, fromTytx} from '@gramlot/gramlot';
        import {ComponentCollection} from '@gramlot/gramlot/components';
        import {Page} from '@gramlot/gramlot/page';
        export {Bag, toTytx, ComponentCollection, Page};
        export const roundTrip = value => fromTytx(toTytx(value));
    `);
    const previous = globalThis.GramlotStandalone;
    globalThis.GramlotStandalone = core;
    t.after(() => {globalThis.GramlotStandalone = previous;});
    const module = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
    for (const name of ['Bag', 'toTytx', 'ComponentCollection', 'Page']) {
        assert.equal(module[name], core[name]);
    }
    const result = module.roundTrip(new core.Bag({amount:42, active:true}));
    assert.ok(result instanceof core.Bag);
    assert.equal(result.getItem('amount'), 42);
    assert.equal(result.getItem('active'), true);
});

for (const entry of ['components', 'page']) {
    test(`derived collection rejects core-only exports from /${entry}`, async t => {
        await assert.rejects(runtimeFixture(t,
            `export {toTytx} from '@gramlot/gramlot/${entry}';`), /No matching export.*toTytx/);
    });
}

 test('verified assets remain readable from an opaque collection module', async t => {
    const bytes = Buffer.from('Copyright — chart license\n');
    const code = await runtimeFixture(t,
        "export const license = new URL('./license.txt', import.meta.url);",
        [['assets/license.txt', bytes]]);
    const module = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
    const response = await fetch(module.license);
    assert.equal(response.headers.get('content-type'), 'text/plain');
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
});

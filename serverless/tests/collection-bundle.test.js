import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,readFile,writeFile,rm} from 'node:fs/promises';
import {dirname,join} from 'node:path';
import {tmpdir} from 'node:os';
import {buildGallery} from '@gramlot/gramlot-examples';
import * as core from '@gramlot/gramlot';
import {collectionBundle} from '../src/collection-bundle.js';

test('derived collection retains original identity and the shared runtime',async()=>{
    const gallery=buildGallery(), collection=gallery.collections.find(c=>c.name==='inputs');
    const code=await collectionBundle(collection,gallery.assets[collection.module].file);
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
    const gallery=buildGallery(), collection=gallery.collections.find(c=>c.name==='inputs');
    const root=await mkdtemp(join(tmpdir(),'gramlot-export-integrity-'));
    t.after(()=>rm(root,{recursive:true,force:true}));
    await cp(dirname(dirname(gallery.assets[collection.module].file)),root,{recursive:true});
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
    const gallery = buildGallery(), collection = gallery.collections.find(c => c.name === 'layout');
    const code = await collectionBundle(collection, gallery.assets[collection.module].file);
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

import test from 'node:test';
import assert from 'node:assert/strict';
import {fromTytx, toTytx} from '@genrojs/tytx';
import {Page} from '@gramlot/gramlot/page';
import {UploadTarget} from '@gramlot/gramlot/server';
import {GramlotWorkerServer} from '../src/gramlot-worker-server.js';
import {WorkerTransport} from '../src/worker-transport.js';

function channel(PageClass) {
    const worker = new EventTarget(), scope = new EventTarget();
    let terminated = false;
    const send = target => data => {
        const copy = structuredClone(data);
        queueMicrotask(() => { if (!terminated) target.dispatchEvent(new MessageEvent('message', {data:copy})); });
    };
    worker.postMessage = send(scope); scope.postMessage = send(worker); worker.terminate = () => { terminated = true; };
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'self'); globalThis.self = scope;
    try { new GramlotWorkerServer(PageClass); }
    finally { if (previous) Object.defineProperty(globalThis, 'self', previous); else delete globalThis.self; }
    return new WorkerTransport(worker);
}
async function control(transport, pageId, name, params) {
    return fromTytx(await transport.call(toTytx({id:crypto.randomUUID(), pageId, contentType:'upload', name, params})));
}

test('Worker uploads bounded chunks with metadata, progress, single-use authorization and status', async () => {
    let seen;
    class Sink extends UploadTarget {
        constructor() { super({maxBytes:700000}); this.size = 0; this.chunks = []; }
        write(chunk) { this.chunks.push(chunk.byteLength); this.size += chunk.byteLength; }
        finish() { return {state:'completed', result:{size:this.size, chunks:this.chunks, fields:seen.fields}}; }
        abort() { return {state:'unsaved'}; }
        status() { return {state:'pending'}; }
    }
    class UploadPage extends Page {
        main(root) { root.div('Upload'); }
        receive(metadata) { seen = metadata; return new Sink(); }
    }
    UploadPage.registerUpload('receive');
    const transport = channel(UploadPage);
    try {
        const {pageId, capabilities} = await transport.open();
        assert.ok(capabilities.includes('upload'));
        const metadata = {name:'a.bin', size:600000, mediaType:'application/octet-stream', context:{recordId:'saved-123'}, fields:{label:'example'}};
        const prepared = await control(transport, pageId, 'prepare', {operation:'receive', metadata});
        assert.deepEqual(seen, metadata);
        const {transferId, authorization} = prepared.value;
        const file = new Blob([new Uint8Array(metadata.size)]);
        const progress = [];
        const outcome = await transport.upload({pageId, transferId, authorization, file}, n => progress.push(n));
        assert.deepEqual(progress, [262144,524288,600000]);
        assert.deepEqual(outcome, {state:'completed', result:{size:600000, chunks:[262144,262144,75712], fields:{label:'example'}}});
        assert.deepEqual((await control(transport, pageId, 'status', {transferId})).value, outcome);
        await assert.rejects(transport.upload({pageId, transferId, authorization, file}, () => {}), /authorization/);
    } finally { transport.dispose(); }
});

test('Worker denies undeclared and protected operations and rejects mismatched size', async () => {
    class Sink extends UploadTarget {
        constructor() { super({maxBytes:10}); }
        write() {} finish() { return {state:'completed', result:null}; }
        abort() { return {state:'unsaved'}; } status() { return {state:'pending'}; }
    }
    class UploadPage extends Page { main(root) { root.div('Upload'); } open() { return new Sink(); } secure() { return new Sink(); } }
    UploadPage.registerUpload('open'); UploadPage.registerUpload('secure', {auth:'editor'});
    const transport = channel(UploadPage);
    try {
        const {pageId} = await transport.open();
        const metadata = {name:'a', size:2, mediaType:'', context:{}, fields:{}};
        assert.ok((await control(transport, pageId, 'prepare', {operation:'open', metadata:{...metadata,context:'bad'}})).error);
        const {context, ...withoutContext} = metadata;
        assert.ok((await control(transport, pageId, 'prepare', {operation:'open', metadata:withoutContext})).error);
        assert.equal((await control(transport, pageId, 'prepare', {operation:'missing', metadata})).error.code, 'not_found');
        assert.equal((await control(transport, pageId, 'prepare', {operation:'secure', metadata})).error.code, 'not_authenticated');
        const {transferId, authorization} = (await control(transport, pageId, 'prepare', {operation:'open', metadata})).value;
        await assert.rejects(transport.upload({pageId, transferId, authorization, file:new Blob(['abc'])}, () => {}), /size/);
        assert.deepEqual((await control(transport, pageId, 'status', {transferId})).value, {state:'unsaved'});
    } finally { transport.dispose(); }
});

test('cancellation during a Worker write cleans up and never commits', async () => {
    let release, started;
    const writing = new Promise(resolve => { started = resolve; });
    const gate = new Promise(resolve => { release = resolve; });
    const calls = [];
    class Sink extends UploadTarget {
        constructor() { super({maxBytes:600000}); }
        async write() { calls.push('write'); started(); await gate; }
        finish() { calls.push('finish'); return {state:'completed', result:'unexpected'}; }
        abort() { calls.push('abort'); return {state:'unsaved'}; }
        status() { return {state:'pending'}; }
    }
    class UploadPage extends Page { main(root) { root.div('Upload'); } receive() { return new Sink(); } }
    UploadPage.registerUpload('receive');
    const transport = channel(UploadPage);
    try {
        const {pageId} = await transport.open();
        const metadata = {name:'a', size:300000, mediaType:'', context:{}, fields:{}};
        const {transferId, authorization} = (await control(transport, pageId, 'prepare', {operation:'receive', metadata})).value;
        const uploading = transport.upload({pageId, transferId, authorization, file:new Blob([new Uint8Array(metadata.size)])}, () => {});
        await writing;
        const cancel = control(transport, pageId, 'cancel', {transferId});
        await new Promise(resolve => setImmediate(resolve));
        release();
        assert.deepEqual((await cancel).value, {state:'unsaved'});
        await assert.rejects(uploading, /writable/);
        assert.deepEqual((await control(transport, pageId, 'status', {transferId})).value, {state:'unsaved'});
        assert.deepEqual(calls, ['write','abort']);
    } finally { release(); transport.dispose(); }
});

test('closing a page cleans a prepared target', async () => {
    let aborted;
    const cleanup = new Promise(resolve => { aborted = resolve; });
    class Sink extends UploadTarget {
        constructor() { super({maxBytes:1}); }
        write() {} finish() { return {state:'completed',result:null}; }
        abort() { aborted(); return {state:'unsaved'}; } status() { return {state:'pending'}; }
    }
    class UploadPage extends Page { main(root) { root.div('Upload'); } receive() { return new Sink(); } }
    UploadPage.registerUpload('receive');
    const transport = channel(UploadPage);
    try {
        const {pageId} = await transport.open();
        await control(transport, pageId, 'prepare', {operation:'receive', metadata:{name:'a',size:1,mediaType:'',context:{},fields:{}}});
        transport.close(pageId);
        await cleanup;
        assert.equal((await control(transport, pageId, 'status', {transferId:'absent'})).error.code, 'page_expired');
    } finally { transport.dispose(); }
});

test('closing the page during preparation aborts the newly returned target', async () => {
    let release, started, aborted = 0;
    const gate = new Promise(resolve => { release = resolve; });
    const preparing = new Promise(resolve => { started = resolve; });
    class Sink extends UploadTarget {
        constructor() { super({maxBytes:1}); }
        write() {} finish() { return {state:'completed', result:null}; }
        abort() { aborted++; return {state:'unsaved'}; } status() { return {state:'pending'}; }
    }
    class UploadPage extends Page {
        main(root) { root.div('Upload'); }
        async receive() { started(); await gate; return new Sink(); }
    }
    UploadPage.registerUpload('receive');
    const transport = channel(UploadPage);
    try {
        const {pageId} = await transport.open();
        const request = control(transport, pageId, 'prepare', {operation:'receive', metadata:{name:'a',size:1,mediaType:'',context:{},fields:{}}});
        await preparing;
        transport.close(pageId);
        await new Promise(resolve => setImmediate(resolve));
        release();
        assert.equal((await request).error.code, 'page_expired');
        assert.equal(aborted, 1);
    } finally { release(); transport.dispose(); }
});

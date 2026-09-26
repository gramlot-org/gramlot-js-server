import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {Page, source} from '@jsr/genro__gramlot/page';
import {WorkerHost} from '../src/worker-host.js';
import {WorkerTransport} from '../src/worker-transport.js';
import {Gramlot} from '@jsr/genro__gramlot';
import {mount} from '../src/standalone.js';

// Browser-like endpoints with structured cloning; actual Worker execution is
// covered by scripts/verify_worker_host_browser.mjs.
function channel(PageClass) {
    const worker = new EventTarget();
    const scope = new EventTarget();
    let terminated = false;
    const send = target => data => {
        const copy = structuredClone(data);
        queueMicrotask(() => { if (!terminated) target.dispatchEvent(new MessageEvent('message', {data: copy})); });
    };
    worker.postMessage = send(scope);
    scope.postMessage = send(worker);
    worker.terminate = () => { terminated = true; };
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'self');
    globalThis.self = scope;
    let host;
    try { host = new WorkerHost(PageClass); }
    finally { if (previous) Object.defineProperty(globalThis, 'self', previous); else delete globalThis.self; }
    return {worker, host, transport: new WorkerTransport(worker), terminated: () => terminated};
}
class Hello extends Page {
    main(root) { root.h1('Hello Worker'); root.section(null, {id: 'details'}); return null; }
    details(root, {name}) { root.p(name); }
    broken() { throw new TypeError('Page failed'); }
}
source(Hello.prototype.details);
source(Hello.prototype.broken);

const document = () => new JSDOM('<div id="gramlot-root"></div>').window.document;

test('Worker host uses shared main/Source execution, typed Source and normal live rendering', async () => {
    const {transport, host, terminated} = channel(Hello);
    const {pageId} = await transport.open();
    const doc = document();
    const app = new Gramlot({pageId, transport, document: doc});
    await app.start();
    const nodes = app.source.getItem('main').getNodes();
    assert.equal(doc.querySelectorAll('h1, section').length, 2);
    assert.equal(nodes[0].value, 'Hello Worker');
    await app.remoteSource(nodes[1], 'details', {name: 'From Worker'});
    assert.equal(doc.querySelector('#details').textContent, 'From Worker');
    nodes[0].setValue('Live');
    assert.equal(doc.querySelector('h1').textContent, 'Live');
    await assert.rejects(app.remoteSource(nodes[1], 'main'), /Source method not found/);
    await assert.rejects(app.remoteSource(nodes[1], 'broken'), {name: 'TypeError', message: 'Page failed'});
    assert.equal(host.pages.size, 1);
    app.dispose();
    assert.equal(terminated(), true);
    assert.equal(transport.pending.size, 0);
    assert.equal(doc.querySelector('h1'), null);
    await assert.rejects(transport.main(pageId), /disposed/);
});

test('aborted Worker request drops its late reply without cancelling another request', async () => {
    let release;
    class Slow extends Hello {
        async wait(root) { await new Promise(resolve => { release = resolve; }); root.p('late'); }
    }
    source(Slow.prototype.wait);
    const {transport} = channel(Slow);
    const {pageId} = await transport.open();
    const abort = new AbortController();
    const pending = transport.source(pageId, 'wait', {}, abort.signal);
    await new Promise(resolve => setImmediate(resolve));
    abort.abort();
    await assert.rejects(pending, {name: 'AbortError'});
    assert.equal(transport.pending.size, 0);
    release();
    assert.match(await transport.main(pageId), /Hello Worker/);
    transport.dispose();
});

test('Worker crash rejects pending requests and terminates its owned Worker', async () => {
    const {worker, transport, terminated} = channel(Hello);
    const pending = transport.open();
    worker.dispatchEvent(new Event('error'));
    await assert.rejects(pending, /communication failed/);
    assert.equal(terminated(), true);
    assert.equal(transport.pending.size, 0);
    await assert.rejects(transport.open(), /disposed/);
});

test('Worker rejects unsupported operations, pages and malformed CSS', async () => {
    for (const PageClass of [class {}, class extends Hello { static css = ['/external.css', 1]; }]) {
        const {transport} = channel(PageClass);
        await assert.rejects(transport.open(), {name: 'TypeError'});
        transport.dispose();
    }
    class Styled extends Hello { static css = ['/theme.css', '/runner.css']; }
    const styled = channel(Styled);
    assert.deepEqual((await styled.transport.open()).css, Styled.css);
    styled.transport.dispose();
    const {transport} = channel(Hello);
    await assert.rejects(transport.request('fetch', {}), /Unknown Worker operation/);
    const {pageId} = await transport.open();
    await assert.rejects(transport.source(pageId, null, {}), /Source method not found/);
    await assert.rejects(transport.source('unknown', 'details', {}), /Unknown, expired or unowned page/);
    await assert.rejects(transport.source(pageId, 'details', {uncloneable() {}}), {name: 'DataCloneError'});
    assert.equal(transport.pending.size, 0);
    transport.dispose();
});

test('standalone mount owns startup and failure cleanup', async t => {
    const endpoints = [];
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'Worker');
    t.after(() => { if (previous) Object.defineProperty(globalThis, 'Worker', previous); else delete globalThis.Worker; });
    globalThis.Worker = function () {
        const endpoint = channel(Hello);
        // mount creates its own transport; remove the helper's listener first.
        endpoint.worker.removeEventListener('message', endpoint.transport.receive);
        endpoints.push(endpoint);
        return endpoint.worker;
    };
    const doc = document();
    const app = await mount({workerUrl: 'page-worker.js', document: doc});
    assert.equal(doc.querySelector('h1').textContent, 'Hello Worker');
    app.dispose();
    assert.equal(endpoints[0].terminated(), true);
    await assert.rejects(mount({workerUrl: 'page-worker.js', document: new JSDOM('').window.document}));
    assert.equal(endpoints[1].terminated(), true);
});

test('standalone waits for Page.css and removes its styles on disposal or load failure', async t => {
    class Styled extends Hello { static css = ['/theme.css', '/runner.css']; }
    const endpoints = [];
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'Worker');
    t.after(() => { if (previous) Object.defineProperty(globalThis, 'Worker', previous); else delete globalThis.Worker; });
    globalThis.Worker = function () {
        const endpoint = channel(Styled);
        endpoint.worker.removeEventListener('message', endpoint.transport.receive);
        endpoints.push(endpoint);
        return endpoint.worker;
    };
    const doc = document();
    const loading = mount({workerUrl: 'page-worker.js', document: doc});
    await new Promise(resolve => setImmediate(resolve));
    const links = [...doc.querySelectorAll('link[rel="stylesheet"]')];
    assert.deepEqual(links.map(link => link.getAttribute('href')), Styled.css);
    assert.equal(doc.querySelector('h1'), null);
    links[0].dispatchEvent(new doc.defaultView.Event('load'));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(doc.querySelector('h1'), null);
    links[1].dispatchEvent(new doc.defaultView.Event('load'));
    const app = await loading;
    assert.equal(doc.querySelector('h1').textContent, 'Hello Worker');
    app.renderer.onDispose(app.source.getItem('main').getNodes()[0], () => {
        throw new Error('injected cleanup failure');
    });
    assert.throws(() => app.dispose(), /Renderer cleanup failed/);
    app.dispose();
    assert.equal(doc.querySelectorAll('link[rel="stylesheet"]').length, 0);
    assert.equal(endpoints[0].terminated(), true);

    const failedDoc = document();
    const failed = mount({workerUrl: 'page-worker.js', document: failedDoc});
    await new Promise(resolve => setImmediate(resolve));
    failedDoc.querySelector('link').dispatchEvent(new failedDoc.defaultView.Event('error'));
    await assert.rejects(failed, /Stylesheet failed to load/);
    assert.equal(failedDoc.querySelectorAll('link[rel="stylesheet"]').length, 0);
    assert.equal(endpoints[1].terminated(), true);
});

test('explicit assetRoot resolves declared root CSS inside a local export directory', async t => {
    class Styled extends Hello { static css = ['/themes/theme.css']; }
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'Worker');
    t.after(() => { if (previous) Object.defineProperty(globalThis, 'Worker', previous); else delete globalThis.Worker; });
    const endpoints = [];
    globalThis.Worker = function () {
        const endpoint = channel(Styled);
        endpoint.worker.removeEventListener('message', endpoint.transport.receive);
        endpoints.push(endpoint);
        return endpoint.worker;
    };
    const doc = document();
    const loading = mount({workerUrl: 'page-worker.js', document: doc,
        assetRoot: 'file:///export/site/'});
    await new Promise(resolve => setImmediate(resolve));
    const link = doc.querySelector('link[rel="stylesheet"]');
    assert.equal(link.href, 'file:///export/site/themes/theme.css');
    link.dispatchEvent(new doc.defaultView.Event('load'));
    const app = await loading;
    app.dispose();
    assert.equal(endpoints[0].terminated(), true);
    assert.equal(doc.querySelector('link'), null);

    await assert.rejects(mount({workerUrl: 'page-worker.js', document: document(),
        assetRoot: 'file:///export/site'}), /ending in \/|directory URL/);
    assert.equal(endpoints[1].terminated(), true);
});

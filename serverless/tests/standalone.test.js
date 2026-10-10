import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {fromTytx, toTytx} from '@genrojs/tytx';
import {Page} from '@gramlot/gramlot/page';
import {GramlotWorkerServer} from '../src/gramlot-worker-server.js';
import {WorkerTransport} from '../src/worker-transport.js';
import {Gramlot} from '@gramlot/gramlot';
import {mount} from '../src/standalone.js';

// Browser-like endpoints with structured cloning; actual Worker execution is
// covered by scripts/verify_worker_host_browser.mjs.
function channel(PageClass, options) {
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
    let server;
    try { server = new GramlotWorkerServer(PageClass, options); }
    finally { if (previous) Object.defineProperty(globalThis, 'self', previous); else delete globalThis.self; }
    return {worker, server, transport: new WorkerTransport(worker), terminated: () => terminated};
}
class Hello extends Page {
    main(root) { root.h1('Hello Worker'); root.section(null, {id: 'details'}); return null; }
    details(root, {name}) { root.p(name); }
    broken() { throw new TypeError('Page failed'); }
}
Hello.registerSource('details');
Hello.registerSource('broken');

const document = () => new JSDOM('<div id="gramlot-root"></div>').window.document;

/** The response envelope of one request envelope sent through transport.call. JSON.parse keeps a
 * fragment document as its TYTX string; decode = fromTytx decodes the value as well. */
async function call(transport, pageId, contentType, name, params = {}, {signal, decode = JSON.parse} = {}) {
    const id = crypto.randomUUID();
    const response = decode(await transport.call(toTytx({id, pageId, contentType, name, params}), signal));
    assert.equal(response.id, id);
    assert.equal(response.contentType, contentType);
    return response;
}

test('Worker server uses shared main/Source execution, typed Source and normal live rendering', async () => {
    const {transport, server, terminated} = channel(Hello);
    const {pageId} = await transport.open();
    const doc = document();
    const app = new Gramlot({pageId, transport, document: doc});
    await app.start();
    const nodes = app.src.source.getItem('main').getNodes();
    assert.equal(doc.querySelectorAll('h1, section').length, 2);
    assert.equal(nodes[0].value, 'Hello Worker');
    await app.src.remoteSource(nodes[1], 'details', {name: 'From Worker'});
    assert.equal(doc.querySelector('#details').textContent, 'From Worker');
    nodes[0].setValue('Live');
    assert.equal(doc.querySelector('h1').textContent, 'Live');
    await assert.rejects(app.src.remoteSource(nodes[1], 'missing'), {name: 'RpcError', code: 'not_found'});
    await assert.rejects(app.src.remoteSource(nodes[1], 'broken'),
        {name: 'RpcError', code: 'application_error', remoteName: 'TypeError', message: 'Page failed'});
    assert.equal(server.pages.size, 1);
    app.dispose();
    assert.equal(terminated(), true);
    assert.equal(transport.pending.size, 0);
    assert.equal(doc.querySelector('h1'), null);
    await assert.rejects(call(transport, pageId, 'source', 'main'), /disposed/);
});

test('aborted Worker request drops its late reply without cancelling another request', async () => {
    let release;
    class Slow extends Hello {
        async wait(root) { await new Promise(resolve => { release = resolve; }); root.p('late'); }
    }
    Slow.registerSource('wait');
    const {transport} = channel(Slow);
    const {pageId} = await transport.open();
    const abort = new AbortController();
    const pending = call(transport, pageId, 'source', 'wait', {}, {signal: abort.signal});
    await new Promise(resolve => setImmediate(resolve));
    abort.abort();
    await assert.rejects(pending, {name: 'AbortError'});
    assert.equal(transport.pending.size, 0);
    release();
    assert.match((await call(transport, pageId, 'source', 'main')).value, /Hello Worker/);
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

test('Worker rejects unknown messages, invalid envelopes, unsupported pages and malformed CSS', async () => {
    for (const PageClass of [class {}, class extends Hello { static css = ['/external.css', 1]; }]) {
        const {transport} = channel(PageClass);
        await assert.rejects(transport.open(), {name: 'TypeError'});
        transport.dispose();
    }
    class Styled extends Hello { static css = ['/theme.css', '/runner.css']; }
    const styled = channel(Styled);
    assert.deepEqual((await styled.transport.open()).resources, {css: Styled.css, js: []});
    styled.transport.dispose();
    const {transport} = channel(Hello);
    await assert.rejects(transport.request({operation: 'main'}), {name: 'TypeError', message: 'Unknown Worker message'});
    const {pageId, capabilities} = await transport.open();
    assert.deepEqual(capabilities, []);
    await assert.rejects(transport.call('{'), {name: 'InvalidRequest'});
    await assert.rejects(transport.call(toTytx({id: 'r', pageId, contentType: 'source', name: 'main', params: null})),
        {name: 'InvalidRequest'});
    assert.equal((await call(transport, pageId, 'source', 'missing')).error.code, 'not_found');
    assert.equal((await call(transport, 'unknown', 'source', 'details')).error.code, 'page_expired');
    await assert.rejects(transport.request({text: 'x', uncloneable() {}}), {name: 'DataCloneError'});
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

function workers(t, PageClass, options) {
    const endpoints = [];
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'Worker');
    t.after(() => { if (previous) Object.defineProperty(globalThis, 'Worker', previous); else delete globalThis.Worker; });
    globalThis.Worker = function () {
        const endpoint = channel(PageClass, options);
        endpoint.worker.removeEventListener('message', endpoint.transport.receive);
        endpoints.push(endpoint);
        return endpoint.worker;
    };
    return endpoints;
}
const module = text => `data:text/javascript,${encodeURIComponent(text)}`;

class Formula extends Page {
    static title = 'Companion';
    main(root) {
        root.div('^pronto', {id: 'pronto'});
        root.dataFormula({result_path: 'pronto', func: 'prepara', base: '=base', _init: true});
        root.dataSetter({destination_path: 'base', value: 'ok'});
    }
}

test('PageBootstrap writes Page.css links and receives the Worker transport in its config', async t => {
    class Styled extends Hello { static css = ['/theme.css', '/runner.css']; }
    const endpoints = workers(t, Styled);
    const doc = document();
    const app = await mount({workerUrl: 'page-worker.js', document: doc});
    assert.equal(doc.title, 'Gramlot');
    assert.deepEqual([...doc.querySelectorAll('link[rel="stylesheet"]')].map(link => link.getAttribute('href')), Styled.css);
    assert.equal(doc.querySelector('h1').textContent, 'Hello Worker');
    assert.equal(app.rpc.transport, doc.defaultView.gramlot.rpc.transport);
    assert.equal(app.rpc.transport.worker, endpoints[0].worker);
    app.dispose();
    assert.equal(endpoints[0].terminated(), true);
});

test('the window imports the logic module named by the Worker and registers its Logic', async t => {
    const endpoints = workers(t, Formula, {logic: '/page_aux.js'});
    const doc = document();
    const app = await mount({workerUrl: 'page-worker.js', document: doc, modules: {
        '/page_aux.js': module('export class Logic { prepara(kwargs) { return `${kwargs.base}: window`; } }'),
    }});
    assert.equal(doc.title, 'Companion');
    assert.equal(doc.querySelector('#pronto').textContent, 'ok: window');
    assert.equal(endpoints[0].server.logic, '/page_aux.js');
    app.dispose();
    assert.equal(endpoints[0].terminated(), true);
});

test('a missing or failing logic module stops startup and releases the Worker', async t => {
    const endpoints = workers(t, Formula, {logic: '/page_aux.js'});
    await assert.rejects(mount({workerUrl: 'page-worker.js', document: document()}),
        {name: 'TypeError', message: 'Standalone module not provided: /page_aux.js'});
    assert.equal(endpoints[0].terminated(), true);
    const doc = document();
    const beacons = [];
    doc.defaultView.navigator.sendBeacon = url => { beacons.push(url); return true; };
    await assert.rejects(mount({workerUrl: 'page-worker.js', document: doc,
        modules: {'/page_aux.js': module('throw new Error("broken companion");')}}), /import failed: broken companion/);
    // WorkerBootstrap.closePage releases the Worker instead of sending a close beacon.
    assert.deepEqual(beacons, []);
    assert.equal(endpoints[1].terminated(), true);
    assert.equal(doc.defaultView.gramlot, undefined);
});

test('explicit assetRoot resolves declared root CSS inside a local export directory', async t => {
    class Styled extends Hello { static css = ['/themes/theme.css']; }
    const endpoints = workers(t, Styled);
    const doc = document();
    const app = await mount({workerUrl: 'page-worker.js', document: doc, assetRoot: 'file:///export/site/'});
    assert.equal(doc.querySelector('link[rel="stylesheet"]').href, 'file:///export/site/themes/theme.css');
    app.dispose();
    assert.equal(endpoints[0].terminated(), true);

    await assert.rejects(mount({workerUrl: 'page-worker.js', document: document(),
        assetRoot: 'file:///export/site'}), /ending in \//);
    assert.equal(endpoints.length, 1);
    class Escaping extends Hello { static css = ['../outside.css']; }
    const escaping = workers(t, Escaping);
    await assert.rejects(mount({workerUrl: 'page-worker.js', document: document(),
        assetRoot: 'file:///export/site/'}), /root-relative without traversal/);
    assert.equal(escaping[0].terminated(), true);
});

test('the Worker returns Page.css then the same-name stylesheet, and no CSS with inlineCss', async () => {
    class Styled extends Hello { static css = ['/theme.css']; }
    const linked = channel(Styled, {stylesheet: '/assets/styles/index.css', logic: '/index.js'});
    assert.deepEqual((await linked.transport.open()).resources,
        {css: ['/theme.css', '/assets/styles/index.css'], js: [{url: '/index.js', group: null}]});
    linked.transport.dispose();
    const inline = channel(Styled, {stylesheet: '/assets/styles/index.css', inlineCss: true});
    assert.deepEqual((await inline.transport.open()).resources, {css: [], js: []});
    inline.transport.dispose();
});

class Contract extends Page {
    static title = 'Contract fixture';
    main(root) { root.h1('Contract fixture'); }
    check_fragment(root, {text = 'check'} = {}) { root.span(text); }
    check_fragment_auth(root) {
        root.span('check-public');
        root.div(null, {auth: 'admin'}).span('check-refused');
    }
    check_endpoint({value}) { return value; }
    check_endpoint_auth() { return 'allowed'; }
    check_endpoint_raise() { throw new Error('check'); }
}
Contract.registerSource('check_fragment');
Contract.registerSource('check_fragment_auth');
Contract.registerEndpoint('check_endpoint');
Contract.registerEndpoint('check_endpoint_auth', {auth: 'admin'});
Contract.registerEndpoint('check_endpoint_raise');

test('GC-230 §205: the envelope part of the conformance list (items 10, 12-16) over postMessage', async () => {
    const {transport, server} = channel(Contract);
    const {pageId, capabilities} = await transport.open();
    assert.deepEqual(capabilities, []);
    // 10 · source/main: an envelope echoing id and contentType, the fragment document as a string.
    assert.equal(typeof (await call(transport, pageId, 'source', 'main')).value, 'string');
    // 12 · outcomes of an unknown page, fragment and endpoint, and of data/main.
    const code = async (...args) => (await call(transport, ...args)).error?.code;
    assert.equal(await code('0'.repeat(32), 'source', 'main'), 'page_expired');
    assert.equal(await code(pageId, 'source', 'gramlot_conformance_missing'), 'not_found');
    assert.equal(await code(pageId, 'data', 'gramlot_conformance_missing'), 'not_found');
    assert.equal(await code(pageId, 'data', 'main'), 'not_found');
    // 13 · a fragment with params; an endpoint answering typed values, a date included.
    assert.match((await call(transport, pageId, 'source', 'check_fragment', {text: 'gramlot-conformance'})).value,
        /gramlot-conformance/);
    for (const value of [3, 'x', new Date(Date.UTC(2020, 0, 1))]) {
        assert.deepEqual((await call(transport, pageId, 'data', 'check_endpoint', {value}, {decode: fromTytx})).value, value);
    }
    // 14 · auth is closed without the auth capability; 15 · a raising endpoint is application_error.
    assert.equal(await code(pageId, 'data', 'check_endpoint_auth'), 'not_authenticated');
    const {error} = await call(transport, pageId, 'data', 'check_endpoint_raise');
    assert.deepEqual([error.code, error.name, error.message], ['application_error', 'Error', 'check']);
    // 16 · the close message {pageId} without id; main of the closed page is page_expired.
    transport.close(pageId);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(server.pages.size, 0);
    assert.equal(await code(pageId, 'source', 'main'), 'page_expired');
    transport.dispose();
    assert.doesNotThrow(() => transport.close(pageId));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {Page as BasePage, source} from '@gramlot/gramlot/page';
import {logicBundle} from '../src/bundles.js';
import {JSDOM} from 'jsdom';
import {Page} from '../examples/quickstart/page.js';
import {WorkerHost} from '../src/worker-host.js';
import {mount} from '../src/standalone.js';

// The README quick start, run through mount with the page module's Logic imported by the window.
// The Worker is a structured-clone channel; the real export is opened by
// scripts/verify_quickstart_browser.mjs in headless Chromium.
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
    try { new WorkerHost(PageClass, options); }
    finally { if (previous) Object.defineProperty(globalThis, 'self', previous); else delete globalThis.self; }
    return {worker, terminated: () => terminated};
}

test('the quick start greets Ada and follows the field while typing', async t => {
    const endpoints = [];
    const previous = Object.getOwnPropertyDescriptor(globalThis, 'Worker');
    t.after(() => { if (previous) Object.defineProperty(globalThis, 'Worker', previous); else delete globalThis.Worker; });
    globalThis.Worker = function () {
        const endpoint = channel(Page, {logic: '/page.js'});
        endpoints.push(endpoint);
        return endpoint.worker;
    };
    const logic = await logicBundle({file: fileURLToPath(new URL('../examples/quickstart/page.js', import.meta.url))},
        {bundle: true, platform: 'browser', write: false});
    globalThis.GramlotStandalone = {Page: BasePage, source};
    t.after(() => { delete globalThis.GramlotStandalone; });
    const {window} = new JSDOM('<div id="gramlot-root"></div>');
    const app = await mount({workerUrl: 'page-worker.js', document: window.document,
        modules: {'/page.js': `data:text/javascript,${encodeURIComponent(logic)}`}});
    assert.equal(window.document.title, 'Hello');
    const field = window.document.querySelector('#name');
    assert.equal(field.value, 'Ada');
    assert.equal(window.document.querySelector('#greeting').textContent, 'Hello, Ada');
    field.value = 'Grace';
    field.dispatchEvent(new window.Event('input', {bubbles: true}));
    assert.equal(window.document.querySelector('#greeting').textContent, 'Hello, Grace');
    app.dispose();
    assert.equal(endpoints[0].terminated(), true);
});

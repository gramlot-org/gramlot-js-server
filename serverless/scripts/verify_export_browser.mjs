/** Open an actual exported artifact; no custom runtime or application DOM. */
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const [artifact, playwrightEntry, executablePath, expectedText, method = '', engineName = 'chromium'] = process.argv.slice(2);
if (!expectedText) throw new Error('Usage: verify_export_browser.mjs HTML PLAYWRIGHT EXECUTABLE TEXT [SOURCE_METHOD] [ENGINE]');
const engine = (await import(pathToFileURL(resolve(playwrightEntry))))[engineName];
const browser = await engine.launch({headless: true, ...(executablePath === '-' ? {} : {executablePath})});
try {
    const context = await browser.newContext();
    const external = [];
    await context.route(/^https?:/, route => { external.push(route.request().url()); return route.abort(); });
    const page = await context.newPage();
    const errors = [];
    let closedWorkers = 0;
    page.on('worker', worker => worker.on('close', () => closedWorkers++));
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(pathToFileURL(resolve(artifact)).href);
    await page.waitForFunction(() => globalThis.gramlot?.state === 'started');
    assert.equal(await page.locator('#gramlot-root h1').textContent(), expectedText);
    const result = await page.evaluate(async method => {
        const app = globalThis.gramlot;
        const contents = app.src.source.getItem('main');
        // The 0.2.0 wire names the Source class (__cls): main holds the root's GramlotBuilderBag class.
        if (contents.constructor !== app.src.source.constructor) throw Error('main lost its typed Source');
        const heading = contents.getNodes()[0];
        heading.setValue('Updated');
        heading.setAttr({title: 'Live attribute'});
        const update = [document.querySelector('h1').textContent, document.querySelector('h1').title];
        app.src.builder.wrapSource(contents).strong('Inserted');
        const inserted = contents.getNodes().at(-1);
        const insert = document.querySelector('#gramlot-root strong').textContent;
        contents.popNode(inserted.label);
        const deleted = !document.querySelector('#gramlot-root strong');
        let remote = null, cleared = null;
        if (method) {
            const target = contents.getNodes().find(node => node.attr.id === 'details');
            await app.src.remoteSource(target, method, {text:'From Worker'});
            remote = document.querySelector('#details').textContent;
            target.value.clear();
            cleared = document.querySelector('#details').textContent;
        }
        const transport = app.rpc.transport;
        app.dispose();
        let rejected = false;
        const envelope = JSON.stringify({id: 'check', pageId: app.pageId, contentType: 'source', name: 'main', params: {}});
        try { await transport.call(envelope); } catch { rejected = true; }
        return {update, insert, deleted, remote, cleared, state:app.state, rejected, closed:transport.closed,
            pending:transport.pending.size, remaining:app.src.renderer.records.size,
            children:document.querySelector('#gramlot-root').childNodes.length};
    }, method);
    assert.deepEqual(result, {update:['Updated', 'Live attribute'], insert:'Inserted', deleted:true,
        remote:method ? 'From Worker' : null, cleared:method ? '' : null, state:'disposed', rejected:true,
        closed:true, pending:0, remaining:0, children:0});
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(closedWorkers, 1);
    assert.deepEqual(external, []);
    assert.deepEqual(errors, []);
    console.log(`${engineName} ${browser.version()} PASS: exported file, main, Source live (text, attribute, insert, delete), ${method ? 'remote Source, clear, ' : ''}dispose (state, transport rejects), Worker termination, no HTTP(S) or browser errors.`);
} finally { await browser.close(); }

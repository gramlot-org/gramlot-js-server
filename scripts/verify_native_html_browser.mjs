/** Open an actual exported artifact; no custom runtime or application DOM. */
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const [artifact, playwrightEntry, executablePath, expectedText, method = '', engineName = 'chromium'] = process.argv.slice(2);
if (!expectedText) throw new Error('Usage: verify_native_html_browser.mjs HTML PLAYWRIGHT EXECUTABLE TEXT [SOURCE_METHOD] [ENGINE]');
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
        const contents = app.source.getItem('main');
        if (contents.constructor.tytxSuffix !== 'SOURCE') throw Error('main lost its typed Source');
        const heading = contents.getNodes()[0];
        heading.setValue('Updated');
        const update = document.querySelector('h1').textContent;
        app.builder.wrapSource(contents).strong('Inserted');
        const inserted = contents.getNodes().at(-1);
        const insert = document.querySelector('#gramlot-root strong').textContent;
        contents.popNode(inserted.label);
        const deleted = !document.querySelector('#gramlot-root strong');
        let remote = null;
        if (method) {
            const target = contents.getNodes().find(node => node.attr.id === 'details');
            await app.remoteSource(target, method, {text:'From Worker'});
            remote = document.querySelector('#details').textContent;
        }
        const transport = app.transport;
        app.dispose();
        return {update, insert, deleted, remote, closed:transport.closed,
            pending:transport.pending.size, remaining:app.renderer.records.size,
            children:document.querySelector('#gramlot-root').childNodes.length};
    }, method);
    assert.deepEqual(result, {update:'Updated', insert:'Inserted', deleted:true,
        remote:method ? 'From Worker' : null, closed:true, pending:0, remaining:0, children:0});
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(closedWorkers, 1);
    assert.deepEqual(external, []);
    assert.deepEqual(errors, []);
    console.log(`${engineName} ${browser.version()} PASS: exported file, main, Source live, ${method ? 'remote Source, ' : ''}Worker termination, no HTTP(S) or browser errors.`);
} finally { await browser.close(); }

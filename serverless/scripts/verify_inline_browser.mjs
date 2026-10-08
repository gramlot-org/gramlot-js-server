/** Real browser: an exported file whose Source carries inline code. The page compiles the inline code
 * of the Source it receives from its Worker, main and remote, under the CSP of the single file. */
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const [artifact, playwrightEntry, executablePath = '-', engineName = 'chromium'] = process.argv.slice(2);
if (!playwrightEntry) throw new Error('Usage: verify_inline_browser.mjs HTML PLAYWRIGHT [EXECUTABLE] [ENGINE]');
const engine = (await import(pathToFileURL(resolve(playwrightEntry))))[engineName];
const browser = await engine.launch({headless: true, ...(executablePath === '-' ? {} : {executablePath})});
try {
    const context = await browser.newContext();
    const external = [];
    await context.route(/^https?:/, route => { external.push(route.request().url()); return route.abort(); });
    await context.addInitScript(() => {
        globalThis.violations = [];
        document.addEventListener('securitypolicyviolation',
            event => globalThis.violations.push(`${event.effectiveDirective} ${event.blockedURI}`));
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(pathToFileURL(resolve(artifact)).href);
    await page.waitForFunction(() => globalThis.gramlot?.state === 'started');
    assert.equal(await page.locator('#gramlot-root h1').textContent(), 'Hello Inline');
    const result = await page.evaluate(async () => {
        const app = globalThis.gramlot;
        const byId = id => document.getElementById(id);
        app.data.setItem('a', 3);
        byId('go').click();
        byId('span').click();
        const main = [app.data.getItem('doubled'), app.data.getItem('next'), byId('expression').textContent,
            byId('expression').getAttribute('title'), app.data.getItem('clicked'), app.data.getItem('connected')];
        app.data.setItem('a', -1);
        const otherwise = app.data.getItem('doubled');
        const target = app.src.source.getItem('main').getNodes().find(node => node.attr.id === 'details');
        await app.src.remoteSource(target, 'details', {text: 'From Worker'});
        app.data.setItem('b', 'remote');
        const remote = [app.data.getItem('remote'), byId('details').textContent];
        app.dispose();
        return {main, otherwise, remote};
    });
    assert.deepEqual(result, {main: [6, 4, '30', '103', 'action', 'click'], otherwise: -1, remote: ['remote!', 'From Worker']});
    assert.deepEqual(await page.evaluate(() => globalThis.violations), []);
    assert.deepEqual(external, []);
    assert.deepEqual(errors, []);
    console.log(`${engineName} ${browser.version()} PASS: inline code of main and of a remote Source under the CSP ` +
        'of the single file, no CSP violation, no HTTP(S) or browser errors.');
} finally { await browser.close(); }

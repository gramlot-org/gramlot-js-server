/** Real browser: the quick-start page as one exported file and as a directory export.
 * Typing in the field changes the greeting through a method of the page module's Logic. */
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from '../src/build.js';
import {buildDirectory} from '../src/build-directory.js';

const [playwrightEntry, engineName = 'chromium', executablePath] = process.argv.slice(2);
if (!playwrightEntry) throw new Error('Usage: verify_quickstart_browser.mjs PLAYWRIGHT [ENGINE] [EXECUTABLE]');
const examples = resolve(import.meta.dirname, '../examples/quickstart');
const engine = (await import(pathToFileURL(resolve(playwrightEntry))))[engineName];
const folder = await mkdtemp(join(tmpdir(), 'gramlot-serverless-quickstart-'));
let browser;
try {
    const file = join(folder, 'hello.html');
    await build({page: join(examples, 'page.js'), output: file});
    const site = join(folder, 'site');
    await buildDirectory({pages: {index: join(examples, 'styled.js')}, output: site,
        assets: [{source: join(examples, 'theme.css'), target: 'theme.css'}]});
    browser = await engine.launch({headless: true, ...(executablePath ? {executablePath} : {})});
    const context = await browser.newContext();
    const external = [];
    await context.route(/^https?:/, route => { external.push(route.request().url()); return route.abort(); });
    for (const [artifact, styled] of [[file, false], [join(site, 'index.html'), true]]) {
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(String(error)));
        page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
        await page.goto(pathToFileURL(artifact).href);
        await page.waitForFunction(() => globalThis.gramlot?.state === 'started');
        assert.equal(await page.title(), 'Hello');
        assert.equal(await page.locator('#name').inputValue(), 'Ada');
        assert.equal(await page.locator('#greeting').textContent(), 'Hello, Ada');
        await page.locator('#name').fill('Grace');
        assert.equal(await page.locator('#greeting').textContent(), 'Hello, Grace');
        const color = await page.locator('#greeting').evaluate(node => getComputedStyle(node).color);
        assert.equal(color, styled ? 'rgb(0, 0, 128)' : 'rgb(0, 0, 0)');
        assert.equal(page.workers().length, 1);
        assert.deepEqual(errors, []);
        await page.close();
    }
    assert.deepEqual(external, []);
    console.log(`${engineName} ${browser.version()} PASS: quick start as one file and as a directory export, ` +
        'Ada greeted, typing Grace updates the greeting, theme.css applied in the directory export, no HTTP(S).');
} finally {
    await browser?.close();
    await rm(folder, {recursive: true, force: true});
}

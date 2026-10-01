/** Real browser: the core page avvio built as one standalone file under the strict CSP.
 * Its companion avvio_aux.js counts every call on globalThis.gramlotSentinel: the
 * window runs the _init formula, the Worker never runs the companion. */
import assert from 'node:assert/strict';
import {mkdtemp, readFile, realpath, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {build} from '../src/build.js';

const [playwrightEntry, engineName = 'chromium', executablePath] = process.argv.slice(2);
if (!playwrightEntry) throw new Error('Usage: verify_worker_sentinel_browser.mjs PLAYWRIGHT [ENGINE] [EXECUTABLE]');
// The fixture exists only in a core checkout linked with npm install --no-save.
const core = await realpath(fileURLToPath(new URL('../node_modules/@gramlot/gramlot', import.meta.url)));
const page = join(core, 'tests/fixtures/logic/avvio.js');
const engine = (await import(pathToFileURL(resolve(playwrightEntry))))[engineName];
const folder = await mkdtemp(join(tmpdir(), 'gramlot-serverless-sentinel-'));
let browser;
try {
    const artifact = join(folder, 'avvio.html');
    await build({page, output: artifact});
    const html = await readFile(artifact, 'utf8');
    const tampered = join(folder, 'tampered.html');
    // One byte added inside the runtime script: its hash no longer matches the CSP.
    await writeFile(tampered, html.replace('<script>', '<script> '));
    browser = await engine.launch({headless: true, ...(executablePath ? {executablePath} : {})});
    const context = await browser.newContext();
    const external = [];
    await context.route(/^https?:/, route => { external.push(route.request().url()); return route.abort(); });
    await context.addInitScript(() => {
        globalThis.violations = [];
        document.addEventListener('securitypolicyviolation',
            event => globalThis.violations.push(`${event.effectiveDirective} ${event.blockedURI}`));
    });

    const view = await context.newPage();
    const errors = [];
    view.on('pageerror', error => errors.push(String(error)));
    view.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await view.goto(pathToFileURL(artifact).href);
    await view.waitForFunction(() => globalThis.gramlot?.state === 'started');
    assert.equal(await view.title(), 'Provider fixture');
    assert.match(await view.locator('#pronto').textContent(), /^ok: /);
    const window = await view.evaluate(() => globalThis.gramlotSentinel);
    assert.ok(window >= 1, `window sentinel ${window}`);
    const workers = view.workers();
    assert.equal(workers.length, 1);
    assert.equal(await workers[0].evaluate(() => globalThis.gramlotSentinel ?? 0), 0);
    assert.deepEqual(await view.evaluate(() => globalThis.violations), []);
    assert.deepEqual(errors, []);

    const blocked = await context.newPage();
    await blocked.goto(pathToFileURL(tampered).href);
    await blocked.waitForFunction(() => globalThis.violations.length > 0);
    assert.equal(await blocked.evaluate(() => globalThis.gramlot), undefined);
    assert.deepEqual(await blocked.evaluate(() => globalThis.violations), ['script-src-elem inline']);
    assert.equal(blocked.workers().length, 0);
    assert.deepEqual(external, []);
    console.log(`${engineName} ${browser.version()} PASS: avvio under the strict CSP (script hash, no 'unsafe-eval'), ` +
        `named logic in the window (sentinel ${window}), Worker sentinel 0, altered script blocked, no HTTP(S).`);
} finally {
    await browser?.close();
    await rm(folder, {recursive: true, force: true});
}

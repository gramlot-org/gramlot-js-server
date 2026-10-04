/** Build the page-module fixture (Page and Logic in one module, core theme, Page.css and
 * page.css) as one file and as a directory, then open both from disk in a real browser. */
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {build} from '../src/build.js';
import {buildDirectory} from '../src/build-directory.js';

const [playwrightEntry, engineName = 'chromium'] = process.argv.slice(2);
if (!playwrightEntry) throw new Error('Usage: verify_page_module_browser.mjs PLAYWRIGHT [ENGINE]');
const page = fileURLToPath(new URL('../tests/fixtures/page-module/page.js', import.meta.url));
const folder = await mkdtemp(join(tmpdir(), 'gramlot-page-module-'));
const engine = (await import(pathToFileURL(resolve(playwrightEntry))))[engineName];
const browser = await engine.launch({headless: true});
try {
    await build({page, output: join(folder, 'page.html')});
    // buildDirectory copies the listed assets; the command on a folder lists every file of it.
    await buildDirectory({pages: {index: page}, output: join(folder, 'site'),
        assets: [{source: fileURLToPath(new URL('../tests/fixtures/page-module/local.css', import.meta.url)), target: 'local.css'}]});
    for (const artifact of [join(folder, 'page.html'), join(folder, 'site/index.html')]) {
        const context = await browser.newContext();
        const external = [];
        await context.route(/^https?:/, route => { external.push(route.request().url()); return route.abort(); });
        const tab = await context.newPage();
        const errors = [];
        tab.on('pageerror', error => errors.push(String(error)));
        tab.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
        await tab.goto(pathToFileURL(artifact).href);
        await tab.waitForFunction(() => globalThis.gramlot?.state === 'started');
        const result = await tab.evaluate(() => {
            const pronto = document.querySelector('#pronto');
            const style = getComputedStyle(pronto);
            return {text: pronto.textContent, sentinel: globalThis.gramlotModuleSentinel, color: style.color,
                weight: style.fontWeight, theme: getComputedStyle(document.documentElement).getPropertyValue('--gramlot-brand-blue').trim()};
        });
        assert.match(result.text, /^ok: /);
        assert.deepEqual({...result, text: undefined}, {text: undefined, sentinel: 1, color: 'rgb(0, 0, 128)', weight: '700', theme: '#456bc4'});
        assert.deepEqual(external, []);
        assert.deepEqual(errors, []);
        await context.close();
        console.log(`${engineName} ${browser.version()} PASS ${artifact.endsWith('page.html') ? 'one file' : 'directory'}: ` +
            `Logic of the page module, core theme, Page.css and page.css, no network or browser errors.`);
    }
} finally {
    await browser.close();
    await rm(folder, {recursive: true, force: true});
}

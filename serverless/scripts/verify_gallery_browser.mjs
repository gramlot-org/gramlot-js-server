/**
 * The command `gramlot-serverless gallery` opened from disk in a real browser:
 * `node scripts/verify_gallery_browser.mjs PLAYWRIGHT_ENTRY [ENGINE]`.
 * The gallery page loads its logo, script and theme, opens an example in its frame and passes
 * the theme to it; every example starts without errors or network requests, and b08, c03, c08
 * and c09 call methods of the Logic of their page module.
 */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {mkdtemp, rm} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const [playwrightEntry, engineName = 'chromium'] = process.argv.slice(2);
if (!playwrightEntry) throw new Error('Usage: verify_gallery_browser.mjs PLAYWRIGHT_ENTRY [ENGINE]');
const catalog = createRequire(import.meta.url).resolve('@gramlot/gramlot-examples/catalog.json');
const keys = [catalog, fileURLToPath(new URL('../gallery/catalog.json', import.meta.url))]
    .flatMap(file => JSON.parse(readFileSync(file, 'utf8')).families.flatMap(family => family.examples.map(({key}) => key)));

// One behaviour per page with named logic, from scripts/verify_pages_browser.mjs of gramlot-examples.
const LOGIC = {
    async b08(page, text) {
        await page.click('#freeze');
        assert.equal(await text('#frozen'), 'true');
        await page.click('#add');
        await page.click('#removeLast');
        await page.click('#removeLast');
        assert.equal(await page.locator('#items li').count(), 3, 'the removal waits for the thaw');
        await page.click('#thaw');
        assert.equal(await page.locator('#items li').count(), 1);
        assert.equal(await text('#count'), '1');
    },
    async c03(page, text) {
        assert.equal(await text('#final'), '80');
        await page.fill('#price', '120');
        await page.waitForFunction(() => document.getElementById('final').textContent === '108');
        assert.equal(await text('#changes'), '1');
    },
    async c08(page, text) {
        await page.selectOption('#topic', 'svg');
        await page.click('#load');
        await page.waitForSelector('#remote-title');
        assert.equal(await text('#remote-title'), 'SVG');
    },
    async c09(page, text) {
        await page.click('#press', {modifiers: ['Shift']});
        assert.equal(await text('#presses'), 'Pressed 1 times');
        assert.equal(await text('#modifiers'), 'with Shift');
        await page.click('#loadExtras');
        await page.waitForSelector('#extras-title');
        await page.click('#freeze');
        await page.click('#removeNote');
        assert.equal(await page.locator('#notes > *').count(), 2);
        await page.click('#thaw');
        assert.equal(await page.locator('#notes > *').count(), 1);
    },
};

/** A tab that collects page errors, console errors and any HTTP(S) request. */
async function open(context, url) {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(url);
    await page.waitForFunction(() => ['started', 'failed'].includes(window.gramlot?.state));
    assert.equal(await page.evaluate(() => window.gramlot.state), 'started', `${url}: ${errors.join('; ')}`);
    return {page, errors};
}

const folder = await mkdtemp(join(tmpdir(), 'gramlot-static-gallery-check-'));
const engine = (await import(pathToFileURL(resolve(playwrightEntry))))[engineName];
const browser = await engine.launch({headless: true});
try {
    const output = join(folder, 'gallery');
    execFileSync(process.execPath, [fileURLToPath(new URL('../src/cli.js', import.meta.url)), 'gallery', output], {stdio: 'inherit'});
    const context = await browser.newContext();
    const external = [];
    await context.route(/^https?:/, route => { external.push(route.request().url()); return route.abort(); });

    const {page, errors} = await open(context, pathToFileURL(join(output, 'index.html')).href);
    await page.waitForFunction(() => document.querySelector('.gallery-logo')?.complete);
    assert.ok(await page.evaluate(() => document.querySelector('.gallery-logo').naturalWidth > 0), 'logo');
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--gramlot-brand-blue').trim()), '#456bc4');
    await page.evaluate(() => { document.getElementById('open-c03').closest('details').open = true; });
    await page.click('#open-c03');
    const frame = page.frameLocator('#frame-c03');
    await frame.locator('#final').waitFor();
    assert.equal(await frame.locator('#final').textContent(), '80');
    assert.equal(await page.getAttribute('#frame-c03', 'src'), 'c03/index.html');
    await page.selectOption('#gallery-theme', 'dark');
    await frame.locator('html[data-theme="dark"]').waitFor({state: 'attached'});
    assert.deepEqual(errors, [], 'gallery page');
    await page.close();

    for (const key of keys) {
        const {page, errors} = await open(context, pathToFileURL(join(output, key, 'index.html')).href);
        assert.ok(await page.evaluate(() => document.getElementById('gramlot-root').childElementCount > 0), key);
        await LOGIC[key]?.(page, selector => page.locator(selector).textContent());
        assert.deepEqual(errors, [], key);
        await page.close();
    }
    assert.deepEqual(external, []);
    console.log(`${engineName} ${browser.version()} PASS gramlot-serverless gallery from disk: gallery page, frame and theme, ` +
        `${keys.length} examples, Logic of b08, c03, c08 and c09, no errors or network requests`);
} finally {
    await browser.close();
    await rm(folder, {recursive: true, force: true});
}

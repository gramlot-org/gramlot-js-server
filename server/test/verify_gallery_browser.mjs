/**
 * The installed command `gramlot <runtime> gallery --mount /js` opened in a real browser:
 * `node test/verify_gallery_browser.mjs node|bun PLAYWRIGHT_ENTRY [ENGINE]`.
 * The gallery page loads its logo, script and theme under the prefix, opens an example in its
 * frame and passes the theme to it; every example route starts without errors or failed
 * requests, and b08, c03, c08 and c09 call methods of the Logic of their page module.
 */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {createInterface} from 'node:readline';
import {fileURLToPath, pathToFileURL} from 'node:url';

const [runtime, playwrightEntry, engineName = 'chromium'] = process.argv.slice(2);
if (!['node', 'bun'].includes(runtime) || !playwrightEntry) {
    throw new Error('Usage: verify_gallery_browser.mjs node|bun PLAYWRIGHT_ENTRY [ENGINE]');
}
const MOUNT = '/js';
const catalog = createRequire(import.meta.url).resolve('@gramlot/gramlot-examples/catalog.json');
const keys = JSON.parse(readFileSync(catalog, 'utf8')).families.flatMap(family => family.examples.map(({key}) => key));

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

/** A tab that collects page errors, console errors and failed requests. */
async function open(browser, url) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('response', response => {
        if (response.status() >= 400 && !response.url().endsWith('/favicon.ico')) errors.push(`${response.status()} ${response.url()}`);
    });
    await page.goto(url);
    await page.waitForFunction(() => ['started', 'failed'].includes(window.gramlot?.state));
    assert.equal(await page.evaluate(() => window.gramlot.state), 'started', `${url}: ${errors.join('; ')}`);
    return {page, errors};
}

const cli = fileURLToPath(new URL('../src/cli.mjs', import.meta.url));
const child = spawn(runtime, [cli, runtime, 'gallery', '--port', '0', '--mount', MOUNT], {stdio: ['ignore', 'pipe', 'inherit']});
const engine = (await import(pathToFileURL(resolve(playwrightEntry))))[engineName];
let browser;
try {
    const gallery = await new Promise((done, fail) => {
        const timer = setTimeout(() => fail(new Error('startup timeout')), 20000);
        createInterface({input: child.stdout}).once('line', line => { clearTimeout(timer); done(line.match(/(http\S+)/)[1]); });
        child.once('exit', code => { clearTimeout(timer); fail(new Error(`gallery exit ${code}`)); });
    });
    assert.ok(gallery.endsWith(`${MOUNT}/`), gallery);
    browser = await engine.launch({headless: true});

    const {page, errors} = await open(browser, gallery);
    assert.ok(await page.evaluate(() => document.querySelector('.gallery-logo').naturalWidth > 0), 'logo');
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--gramlot-brand-blue').trim()), '#456bc4');
    await page.evaluate(() => { document.getElementById('open-c03').closest('details').open = true; });
    await page.click('#open-c03');
    const frame = page.frameLocator('#frame-c03');
    await frame.locator('#final').waitFor();
    assert.equal(await page.getAttribute('#frame-c03', 'src'), 'c03');
    assert.equal(await page.evaluate(() => document.getElementById('frame-c03').contentWindow.location.pathname), `${MOUNT}/c03`);
    await page.selectOption('#gallery-theme', 'dark');
    await page.waitForFunction(() => document.getElementById('frame-c03').contentDocument.documentElement.getAttribute('data-theme') === 'dark');
    assert.deepEqual(errors, [], 'gallery page');
    await page.close();

    for (const key of keys) {
        const {page, errors} = await open(browser, `${gallery}${key}`);
        assert.ok(await page.evaluate(() => document.getElementById('gramlot-root').childElementCount > 0), key);
        await LOGIC[key]?.(page, selector => page.locator(selector).textContent());
        assert.deepEqual(errors, [], key);
        await page.close();
    }
    console.log(`${engineName} ${browser.version()} PASS gramlot ${runtime} gallery under ${MOUNT}: gallery page, frame and theme, ` +
        `${keys.length} examples, Logic of b08, c03, c08 and c09, no errors or failed requests`);
} finally {
    await browser?.close();
    child.kill();
}

/** Actual file-origin export: prepared components use one runtime factory, without HTTP. */
import assert from 'node:assert/strict';
import {mkdtemp, rm, readFile, readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {runtimeAsset} from '@gramlot/gramlot/server';
import {buildGallery} from '@gramlot/gramlot-examples';
import {buildDirectory} from '../src/build-directory.js';

const [playwrightEntry, engineName = 'chromium'] = process.argv.slice(2);
if (!playwrightEntry) throw new Error('Usage: verify_shared_sanitizer_browser.mjs PLAYWRIGHT [ENGINE]');
const engine = (await import(pathToFileURL(resolve(playwrightEntry))))[engineName];
const folder = await mkdtemp(join(tmpdir(), 'gramlot-shared-sanitizer-'));
let browser;
try {
    const gallery = buildGallery();
    const assets = Object.entries(gallery.assets)
        .filter(([url]) => /^\/gramlot\/collections\/(inputs|layout|editors|grid)\//.test(url))
        .map(([url, {file}]) => ({source:file, target:url.slice(1)}));
    const output = join(folder, 'site');
    await buildDirectory({pages:{index:resolve(import.meta.dirname, '../tests/fixtures/shared-sanitizer/page.js'), plain:resolve(import.meta.dirname, '../tests/fixtures/shared-sanitizer/plain.js')},
        output, assets, collections:gallery.collections.filter(({name}) => ['inputs', 'layout', 'editors', 'grid'].includes(name))});
    const parserMarker='Wrong `markdown-it` preset';
    const runtimeText=await readFile(join(output,'assets/standalone.js'),'utf8');
    const libraryText=await readFile(runtimeAsset('gramlot-markdown.js'),'utf8');
    assert.equal(runtimeText.split(parserMarker).length,libraryText.split(parserMarker).length,'one embedded parser implementation');
    for(const name of await readdir(join(output,'assets/workers'))) {
        const text=await readFile(join(output,'assets/workers',name),'utf8');
        assert.ok(!text.includes(parserMarker),'Workers do not carry a second parser');
    }
    browser = await engine.launch({headless:true});
    const context = await browser.newContext();
    context.setDefaultTimeout(20000);
    const external = [], errors = [];
    await context.route(/^https?:/, route => {external.push(route.request().url()); return route.abort();});
    await context.addInitScript(library => {
        window.markdownBlobs=[];
        const original=URL.createObjectURL;
        URL.createObjectURL=function(blob) {
            const url=original.call(this,blob);
            // The optional library is minified and carries its markdown-it license.
            blob.text().then(text=>{if(text===library) window.markdownBlobs.push({url,text});});
            return url;
        };
    }, libraryText);
    const page = await context.newPage();
    page.on('console', message => {if (message.type() === 'error') errors.push(message.text());});
    page.on('pageerror', error => errors.push(String(error)));
    await page.goto(pathToFileURL(join(output, 'plain/index.html')).href);
    await page.waitForFunction(() => globalThis.gramlot?.state === 'started');
    assert.equal(await page.evaluate(()=>window.markdownBlobs.length),0,'unused editors do not load Markdown');
    await page.goto(pathToFileURL(join(output, 'index.html')).href);
    await page.waitForFunction(() => globalThis.gramlot?.state === 'started', null, {timeout:20000}).catch(error => {console.error(errors); throw error;});
    await page.waitForFunction(() => document.getElementById('html')?.engine);
    await page.evaluate(async () => {
        await document.getElementById('html').ready;
    });
    const drawer = page.locator('#border .separator[data-side=right] button');
    await drawer.locator('b').waitFor();
    assert.equal(await drawer.locator('b').textContent(), 'Safe drawer');
    assert.equal(await drawer.locator('[onerror]').count(), 0);
    await page.evaluate(() => {
        window.originalEditor = document.getElementById('html').engine;
        gramlot.data.setItem('caption', '<em>Changed</em><script>window.attack=1</script>');
        gramlot.data.setItem('html', '<p onclick="window.attack=1">Updated editor</p>');
    });
    assert.equal(await drawer.locator('em').textContent(), 'Changed');
    assert.equal(await drawer.locator('script').count(), 0);
    const rich = page.locator('#html').locator('iframe').contentFrame();
    await rich.locator('p').filter({hasText:'Updated editor'}).waitFor();
    assert.equal(await rich.locator('script,[onclick]').count(), 0);
    const preview = page.locator('#markdown').locator('iframe').contentFrame();
    await preview.locator('strong').filter({hasText:'Safe markdown'}).waitFor();
    assert.equal(await preview.locator('script').count(), 0);
    assert.equal(await page.evaluate(() => document.getElementById('html').engine === window.originalEditor), true);
    assert.equal(await page.evaluate(() => window.attack), undefined);
    await page.evaluate(async () => {
        const editor=document.getElementById('richMarkdown');await editor.ready;
        window.markdownEngine=editor.engine;
        editor.engine.view.dispatch(editor.engine.view.state.tr.insertText('Edited ',1));
        if(!editor.undo()) throw new Error('Markdown undo failed');
        gramlot.data.setItem('markdown','# Updated Markdown');
        if(editor.engine!==window.markdownEngine) throw new Error('Markdown engine replaced');
        const [a,b]=await Promise.all([GramlotStandalone.loadMarkdown(),GramlotStandalone.loadMarkdown()]);
        if(a!==b) throw new Error('Markdown module duplicated');
    });
    assert.equal(await page.evaluate(()=>window.markdownBlobs.length),1,'preview and editor share one lazy module');
    const gridCell = page.locator('#editable-grid tr[data-row=r1] td[data-field=name]');
    await gridCell.dblclick();
    const cellInput = page.locator('#editable-grid gramlot-textbox input');
    await cellInput.fill('After');
    await cellInput.press('Enter');
    await page.waitForFunction(() => gramlot.data.getItem('rows.r1.name') === 'After');
    assert.equal(await gridCell.textContent(), 'After');
    assert.equal(page.workers().length, 1);
    assert.deepEqual(external, []);
    assert.deepEqual(errors, []);
    console.log(`${engineName} PASS: file-origin Worker, prepared layout/editors, lazy Jodit, reactive sanitization, stable engine, shared input collection in editable grid, no HTTP(S).`);
} finally {
    await browser?.close();
    await rm(folder, {recursive:true, force:true});
}

import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {buildDirectory} from '../src/build-directory.js';
const [playwrightEntry, galleryEntry] = process.argv.slice(2);
if (!playwrightEntry || !galleryEntry) throw new Error('Expected Playwright and examples gallery modules');
const {chromium} = await import(pathToFileURL(resolve(playwrightEntry)));
const {buildGallery} = await import(pathToFileURL(resolve(galleryEntry)));
const gallery = buildGallery();
const collection = gallery.collections.find(item => item.name === 'uploads');
if (!collection) throw new Error('Upload collection missing from examples gallery');
const folder = await mkdtemp(join(tmpdir(), 'gramlot-worker-upload-ui-'));
let browser;
try {
    const site = join(folder, 'site');
    await buildDirectory({pages:{index:resolve('serverless/tests/fixtures/upload/ui.js')}, output:site,
        collections:[collection], assets:[{source:gallery.assets[collection.module].file, target:collection.module.slice(1)}]});
    browser = await chromium.launch({headless:true});
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => { errors.push(error.message); console.log('PAGE ERROR', error.message); });
    page.on('console', message => { if (message.type() === 'error') console.log('CONSOLE', message.text()); });
    await page.goto(pathToFileURL(join(site, 'index.html')).href);
    await page.waitForFunction(() => globalThis.gramlot?.state === 'started', null, {timeout:10000});
    const uploader = page.locator('#uploader');
    await uploader.locator('input[type=file]').setInputFiles({name:'sample.bin', mimeType:'application/octet-stream', buffer:Buffer.alloc(600000)});
    await page.evaluate(() => { const row = globalThis.gramlot.data.getItem('uploads').getNodes()[0].value;
        row.getItem('metadata').setItem('description', 'browser'); });
    await uploader.getByRole('button', {name:'Upload'}).click();
    await uploader.locator('li').getByText('completed', {exact:false}).waitFor();
    const row = await page.evaluate(() => { const item = globalThis.gramlot.data.getItem('uploads').getNodes()[0].value;
        return {status:item.getItem('status'), loaded:item.getItem('loaded'), result:item.getItem('result')}; });
    assert.deepEqual(row, {status:'completed', loaded:600000, result:{size:600000, fields:{description:'browser'}}});
    assert.deepEqual(errors, []);
    console.log('PASS: shared uploader sends a selected file and metadata to a real Worker.');
} finally { await browser?.close(); await rm(folder, {recursive:true, force:true}); }

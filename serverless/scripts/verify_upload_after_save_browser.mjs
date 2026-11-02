/** Verify that queued files wait for the application's saved-record signal. */
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
const gallery = buildGallery(), collection = gallery.collections.find(item => item.name === 'uploads');
const folder = await mkdtemp(join(tmpdir(), 'gramlot-worker-upload-after-save-'));
let browser;
try {
    const site = join(folder, 'site');
    await buildDirectory({pages:{index:resolve('serverless/tests/fixtures/upload/after-save.js')}, output:site,
        collections:[collection], assets:[{source:gallery.assets[collection.module].file, target:collection.module.slice(1)}]});
    browser = await chromium.launch({headless:true});
    const page = await browser.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(join(site, 'index.html')).href);
    await page.waitForFunction(() => globalThis.gramlot?.state === 'started');
    const uploader = page.locator('#uploader');
    await uploader.locator('input[type=file]').setInputFiles({name:'attachment.txt', mimeType:'text/plain', buffer:Buffer.from('example')});
    const before = await page.evaluate(() => globalThis.gramlot.data.getItem('uploads').getNodes()[0].value.getItem('status'));
    assert.equal(before, 'queued');
    await page.evaluate(() => {
        const data = globalThis.gramlot.data;
        data.getItem('context').setItem('recordId', 'saved-record');
        data.getItem('uploads').getNodes()[0].value.getItem('metadata').setItem('title', 'Attachment');
        data.setItem('ready', true);
    });
    await uploader.locator('li').getByText('completed', {exact:false}).waitFor();
    const result = await page.evaluate(() => globalThis.gramlot.data.getItem('uploads').getNodes()[0].value.getItem('result'));
    assert.deepEqual(result, {size:7, fields:{title:'Attachment'}, context:{recordId:'saved-record'}});
    assert.deepEqual(errors, []);
    console.log('PASS: file remains queued until record save and carries shared context separately from file fields.');
} finally { await browser?.close(); await rm(folder, {recursive:true,force:true}); }

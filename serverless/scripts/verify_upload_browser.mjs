import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from '../src/build.js';
const [playwrightEntry] = process.argv.slice(2);
if (!playwrightEntry) throw new Error('Expected Playwright module');
const {chromium} = await import(pathToFileURL(resolve(playwrightEntry)));
const folder = await mkdtemp(join(tmpdir(), 'gramlot-worker-upload-'));
let browser;
try {
    const file = join(folder, 'upload.html');
    await build({page:resolve('serverless/tests/fixtures/upload/page.js'), output:file});
    browser = await chromium.launch({headless:true});
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(file).href);
    await page.waitForFunction(() => globalThis.gramlot?.state === 'started');
    const actual = await page.evaluate(async () => {
        const app = globalThis.gramlot;
        const metadata = {name:'sample.bin', size:600000, mediaType:'application/octet-stream', context:{}, fields:{description:'browser'}};
        const {transferId, authorization} = await app.rpc.call('upload', 'prepare', {operation:'receive', metadata});
        const progress = [];
        const outcome = await app.rpc.transport.upload({pageId:app.pageId, transferId, authorization,
            file:new File([new Uint8Array(metadata.size)], metadata.name, {type:metadata.mediaType})}, n => progress.push(n));
        const status = await app.rpc.call('upload', 'status', {transferId});
        return {outcome, status, progress};
    });
    assert.deepEqual(actual, {outcome:{state:'completed',result:{size:600000,fields:{description:'browser'}}},
        status:{state:'completed',result:{size:600000,fields:{description:'browser'}}}, progress:[262144,524288,600000]});
    assert.deepEqual(errors, []);
    console.log('PASS: file uploaded to Worker in bounded chunks; progress, metadata and outcome verified.');
} finally { await browser?.close(); await rm(folder, {recursive:true, force:true}); }

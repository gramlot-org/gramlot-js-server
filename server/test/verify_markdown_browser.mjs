/** Hosted prepared collections must import one optional Markdown module on demand. */
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {GramlotServer} from '@gramlot/gramlot/server';
import {buildGallery} from '@gramlot/gramlot-examples';
import {startServer} from '../src/node.mjs';
import {Page as Plain} from '../../serverless/tests/fixtures/shared-sanitizer/plain.js';
import {Page as Editors} from '../../serverless/tests/fixtures/shared-sanitizer/page.js';
const [entry,engineName='chromium']=process.argv.slice(2);
const engine=(await import(pathToFileURL(resolve(entry))))[engineName];
class Server extends GramlotServer {
    async resolvePage(path) {return path==='/editors'?Editors:Plain;}
    async resolveResources() {return {css:[],js:[]};}
}
const gallery=buildGallery();
const app=await startServer({server:new Server({collections:Plain.gramlots}),assets:gallery.assets});
let browser;
try {
    browser=await engine.launch({headless:true});const page=await browser.newPage();
    const requests=[],errors=[];
    page.on('request',r=>{if(r.url().includes('gramlot-markdown.js')) requests.push(r.url());});
    page.on('pageerror',e=>errors.push(String(e)));
    await page.goto(app.url);await page.waitForFunction(()=>window.gramlot?.state==='started');
    assert.equal(requests.length,0);
    await page.goto(app.url+'/editors');
    await page.waitForFunction(()=>document.getElementById('richMarkdown')?.engine);
    await page.evaluate(async()=>{await document.getElementById('markdown').ready;});
    assert.equal(requests.length,1);
    await page.locator('#markdown iframe').contentFrame().locator('strong').filter({hasText:'Safe markdown'}).waitFor();
    assert.deepEqual(errors,[]);
    console.log(`${engineName} PASS: hosted prepared collections, no parser at startup, one lazy request for editor and preview.`);
} finally {await browser?.close();await app.close();}

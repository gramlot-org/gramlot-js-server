import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {buildDirectory} from '../src/build-directory.js';
const [playwrightEntry,galleryEntry]=process.argv.slice(2);
if (!playwrightEntry || !galleryEntry) throw new Error('Expected Playwright and gallery modules');
const {chromium}=await import(pathToFileURL(resolve(playwrightEntry)));
const {buildGallery}=await import(pathToFileURL(resolve(galleryEntry)));
const gallery=buildGallery(),entry=gallery.routes.editable_image;
const collections=gallery.collections.filter(item=>item.name!=='menu-trial');
const assets=Object.entries(gallery.assets).filter(([url])=>url.startsWith('/gallery/dist/') || url.startsWith('/gramlot/collections/') || url.startsWith('/themes/')).map(([url,{file}])=>({source:file,target:url.slice(1)}));
const folder=await mkdtemp(join(tmpdir(),'screen-capture-worker-'));let browser;
try {const site=join(folder,'site');await buildDirectory({pages:{index:entry.page},output:site,collections,assets});
 browser=await chromium.launch({headless:true});
 const context=await browser.newContext(),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.displayTracks=[];window.displayActivation=[];Object.defineProperty(navigator.mediaDevices,'getDisplayMedia',{configurable:true,value:()=>{window.displayActivation.push(navigator.userActivation.isActive);const c=document.createElement('canvas');c.width=128;c.height=64;const ctx=c.getContext('2d'),stream=c.captureStream(10);const timer=setInterval(()=>{ctx.fillStyle='#28a';ctx.fillRect(0,0,128,64);if(stream.getTracks().every(t=>t.readyState==='ended'))clearInterval(timer);},50);window.displayTracks.push(...stream.getTracks());return Promise.resolve(stream);}});});
 await page.goto(pathToFileURL(join(site,'index.html')).href);await page.waitForFunction(()=>globalThis.gramlot?.state==='started');
 for(const id of ['local-image','server-image']) {
  const target=page.locator(`#${id}`);await target.getByRole('button',{name:'Capture screen'}).click();
  await page.getByRole('dialog',{name:'Edit image'}).waitFor();assert.equal(await page.evaluate(()=>window.displayTracks.at(-1).readyState),'ended');
  await page.getByRole('dialog',{name:'Edit image'}).getByRole('button',{name:'Confirm'}).click();await target.locator('img').waitFor({state:'visible'});
 }
 assert.deepEqual(await page.evaluate(()=>window.displayActivation),[true,true]);assert.deepEqual(errors,[]);console.log('PASS Worker: simulated screen capture, crop and both destinations');
}finally{await browser?.close();await rm(folder,{recursive:true,force:true});}

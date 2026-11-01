import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from '../src/build.js';
const [playwrightEntry]=process.argv.slice(2);
if (!playwrightEntry) throw new Error('Expected Playwright module');
const {chromium}=await import(pathToFileURL(resolve(playwrightEntry)));
const dir=await mkdtemp(join(tmpdir(),'camera-single-'));let browser;
try{
 const output=join(dir,'index.html');await build({page:resolve('serverless/tests/fixtures/camera/browser.js'),output});
 browser=await chromium.launch({headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
 const ctx=await browser.newContext({permissions:['camera']}),p=await ctx.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await p.goto(pathToFileURL(output).href);await p.waitForFunction(()=>globalThis.gramlot?.state==='started');
 await p.locator('#take-photo').click();const dialog=p.getByRole('dialog',{name:'Take photo'}),capture=dialog.getByRole('button',{name:'Capture'});await capture.waitFor();await p.waitForFunction(()=>!document.querySelector('.gramlot-camera-dialog button.primary').disabled);await capture.click();
 await p.waitForFunction(()=>globalThis.gramlot.data.getItem('gramlot.device.camera.url')?.startsWith('data:image/jpeg'));
 if(errors.length)throw new Error(errors.join('\n'));console.log('PASS single-file Worker: browser camera is available through shared device provider');
}finally{await browser?.close();await rm(dir,{recursive:true,force:true})}

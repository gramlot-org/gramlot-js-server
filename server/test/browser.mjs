import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {pathToFileURL,fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const [runtime,playwright,executablePath]=process.argv.slice(2);
if(!executablePath)throw Error('Usage: node test/browser.mjs RUNTIME PLAYWRIGHT_ENTRY CHROMIUM');
const {chromium}=await import(pathToFileURL(playwright));
const child=spawn(runtime,[fileURLToPath(new URL('./browser-host.mjs',import.meta.url))],{stdio:['ignore','pipe','inherit']});
let browser;
try {
 const {plain:url,strict,permissive}=JSON.parse(await new Promise((res,rej)=>{const timer=setTimeout(()=>rej(Error('startup timeout')),10000);createInterface({input:child.stdout}).once('line',line=>{clearTimeout(timer);res(line);});child.once('exit',code=>{clearTimeout(timer);rej(Error(`exit ${code}`));});}));
 browser=await chromium.launch({headless:true,executablePath});
 const page=await browser.newPage(), errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.goto(url);await page.waitForFunction(()=>window.gramlot?.state==='started');
 assert.equal(await page.locator('h1').textContent(),'Hello World');
 const result=await page.evaluate(async()=>{
  const app=window.gramlot, source=app.source.getItem('main');
  source.getNodes()[0].setValue('Updated');const updated=document.querySelector('h1').textContent;
  const child=app.builder.wrapSource(source).p('Added');const inserted=document.querySelector('p').textContent;
  source.popNode(child.label);const deleted=document.querySelector('p')===null;
  await app.remoteSource(source.getNodes()[1],'details');const remote=document.getElementById('slot').textContent;
  app.dispose();return {updated,inserted,deleted,remote,records:app.renderer.records.size,dom:document.getElementById('gramlot-root').childNodes.length};
 });
 assert.deepEqual(result,{updated:'Updated',inserted:'Added',deleted:true,remote:'Remote HTML',records:0,dom:0});
 await page.waitForFunction(async pageId => (await fetch('/gramlot/main', {
  method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({pageId})
 })).status===404, await page.evaluate(()=>window.gramlot.pageId));
 await page.goto(url);await page.waitForFunction(()=>window.gramlot?.state==='started');
 const pageId=await page.evaluate(()=>window.gramlot.pageId);
 await page.goto('about:blank');
 let closed=false;
 for(let attempt=0;attempt<40;attempt++){
  const response=await fetch(url+'/gramlot/main',{
   method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({pageId})
  });
  if(response.status===404){closed=true;break;}
  await new Promise(resolve=>setTimeout(resolve,50));
 }
 assert.equal(closed,true,'pagehide beacon closes the server page');
 assert.deepEqual(errors,[]);
 // Mount prefix /app served by the adapter; the page module's Logic; the application CSP in both profiles.
 const open=async address=>{const response=await page.goto(address);await page.waitForFunction(()=>['started','failed'].includes(window.gramlot?.state));return response;};
 for(const base of [strict,permissive]){
  const response=await open(base+'/avvio');
  assert.match(response.headers()['content-security-policy'],/script-src 'nonce-[\w-]+'/);
  assert.deepEqual(await page.evaluate(()=>({state:window.gramlot.state,pronto:document.getElementById('pronto').textContent,
   sentinel:globalThis.gramlotSentinel,logic:performance.getEntriesByType('resource').some(e=>new URL(e.name).pathname==='/app/avvio.js')})),
   {state:'started',pronto:'ok: init',sentinel:1,logic:true});
 }
 assert.deepEqual(errors,[]);
 await open(permissive+'/inline');
 assert.deepEqual(await page.evaluate(()=>[window.gramlot.state,document.getElementById('inline').textContent]),['started','42']);
 assert.deepEqual(errors,[]);
 await open(strict+'/inline');
 assert.equal(await page.evaluate(()=>window.gramlot.state),'failed');
 assert.equal(errors.length,1);
 assert.match(errors[0],/div '.*' node value: inline code blocked by the Content Security Policy/);console.log('PASS installed host, mount prefix and strict/permissive CSP '+runtime);
}finally{await browser?.close();child.kill();await new Promise(r=>child.exitCode!==null?r():child.once('exit',r));}

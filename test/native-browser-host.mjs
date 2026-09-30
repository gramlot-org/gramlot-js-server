import {createServer} from 'node:http';
import {copyFile, mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Host, Page, source} from '@gramlot/native-html/server';
const {startNativeServer} = await import(globalThis.Bun ? 'gramlot-js-server/bun' : 'gramlot-js-server/native');
class HtmlPage extends Page {
 main(root) { root.h1('Hello World'); root.div(null, {id:'slot'}); }
 details(root) { root.span('Remote HTML'); }
}
source(HtmlPage.prototype.details);
class TestHost extends Host {
 async resolvePage() { return HtmlPage; }
 async resolveResources() { return {css: [], js: []}; }
}
const STRICT_CSP = "script-src 'nonce-{nonce}'; object-src 'none'; base-uri 'none'";
const PERMISSIVE_CSP = "script-src 'nonce-{nonce}' 'unsafe-eval'; object-src 'none'; base-uri 'none'";
const MOUNT = '/app';
// The core's avvio page (named logic in avvio_aux.js) from the linked core checkout, and an inline page.
const pageModule = import.meta.resolve('@gramlot/native-html/page');
const fixtures = new URL('../../tests/fixtures/logic/', pageModule);
const pages = await mkdtemp(join(tmpdir(), 'gramlot-js-server-browser-'));
await writeFile(join(pages, 'avvio.js'), `export {Page} from ${JSON.stringify(new URL('avvio.js', fixtures).href)};\n`);
await copyFile(new URL('avvio_aux.js', fixtures), join(pages, 'avvio_aux.js'));
await writeFile(join(pages, 'inline.js'), `import {Page as BasePage} from ${JSON.stringify(pageModule)};
export class Page extends BasePage { main(root) { root.div('==a * 2', {id: 'inline', a: 21}); } }\n`);

/** A server that strips MOUNT before forwarding to backend, as a reverse proxy does; other paths 404. */
async function front(backend) {
 const hopByHop = ['connection', 'keep-alive', 'transfer-encoding', 'content-length'];
 const server = createServer(async (incoming, outgoing) => {
  if (!incoming.url.startsWith(MOUNT + '/')) { outgoing.writeHead(404); outgoing.end(); return; }
  const chunks = [];
  for await (const chunk of incoming) chunks.push(chunk);
  const response = await fetch(backend + incoming.url.slice(MOUNT.length), {method: incoming.method,
   headers: incoming.headers['content-type'] ? {'content-type': incoming.headers['content-type']} : {},
   body: ['GET', 'HEAD'].includes(incoming.method) ? undefined : Buffer.concat(chunks)});
  outgoing.writeHead(response.status, Object.fromEntries([...response.headers].filter(([name]) => !hopByHop.includes(name))));
  outgoing.end(Buffer.from(await response.arrayBuffer()));
 });
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 return server;
}
const app = await startNativeServer({host:new TestHost()});
const mounted = [];
for (const policy of [STRICT_CSP, PERMISSIVE_CSP]) {
 const backend = await startNativeServer({pages, mountPath: MOUNT, contentSecurityPolicy: policy});
 mounted.push({backend, server: await front(backend.url)});
}
const [strict, permissive] = mounted.map(({server}) => `http://127.0.0.1:${server.address().port}${MOUNT}`);
console.log(JSON.stringify({plain: app.url, strict, permissive}));
for (const signal of ['SIGTERM','SIGINT']) process.once(signal,async()=>{
 await app.close();
 for (const {backend, server} of mounted) { await backend.close(); server.closeAllConnections(); server.close(); }
 await rm(pages, {recursive: true});
 process.exit(0);
});

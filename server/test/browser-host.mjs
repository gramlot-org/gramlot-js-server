import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Host, Page, source} from '@gramlot/gramlot/server';
const {startServer} = await import(globalThis.Bun ? '@gramlot/gramlot-js-server/bun' : '@gramlot/gramlot-js-server/node');
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
// A page module with Page and Logic (the core's avvio fixture) and an inline page. The folder is
// inside the package, so the module resolves @gramlot/gramlot/page in Node; the browser resolves
// it through the import map of the bootstrap.
const pageModule = import.meta.resolve('@gramlot/gramlot/page');
const pages = await mkdtemp(join(fileURLToPath(new URL('./', import.meta.url)), '.browser-'));
await writeFile(join(pages, 'avvio.js'), `import {Page as BasePage} from '@gramlot/gramlot/page';
export class Page extends BasePage {
    static title = 'Provider fixture';
    main(root) {
        root.div('^pronto', {id: 'pronto'});
        root.dataFormula({result_path: 'pronto', func: 'prepara', base: '=base', _init: true});
        root.dataSetter({destination_path: 'base', value: 'ok'});
    }
}
export class Logic {
    prepara(kwargs) {
        globalThis.gramlotSentinel = (globalThis.gramlotSentinel ?? 0) + 1;
        return kwargs.base + ': ' + kwargs._reason;
    }
}
`);
await writeFile(join(pages, 'inline.js'), `import {Page as BasePage} from ${JSON.stringify(pageModule)};
export class Page extends BasePage { main(root) { root.div('==a * 2', {id: 'inline', a: 21}); } }\n`);

const app = await startServer({host:new TestHost()});
// The adapter itself serves the mount prefix: no front server strips it.
const mounted = [];
for (const policy of [STRICT_CSP, PERMISSIVE_CSP]) {
 mounted.push(await startServer({pages, mountPath: MOUNT, contentSecurityPolicy: policy}));
}
const [strict, permissive] = mounted.map(backend => `${backend.url}${MOUNT}`);
console.log(JSON.stringify({plain: app.url, strict, permissive}));
for (const signal of ['SIGTERM','SIGINT']) process.once(signal,async()=>{
 await app.close();
 for (const backend of mounted) await backend.close();
 await rm(pages, {recursive: true});
 process.exit(0);
});

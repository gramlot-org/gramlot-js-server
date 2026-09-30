import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir, mkdtemp, rm, symlink, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Host, Page, source} from '@gramlot/native-html/server';
const {startNativeServer} = await import(globalThis.Bun ? '../src/native-bun.mjs' : '../src/native-node.mjs');

class HtmlPage extends Page {
    main(root) { root.h1('Hello World'); }
    details(root) { root.p('Remote HTML'); }
}
source(HtmlPage.prototype.details);
class TestHost extends Host {
    async resolvePage(path) { return path === '/' ? HtmlPage : super.resolvePage(path); }
    async resolveResources() { return {css: [], js: []}; }
}

test('real listener serves packaged runtime and typed main/remote; errors and shutdown', async () => {
    const host = new TestHost();
    const failures = [];
    const app = await startNativeServer({host, ownerForRequest: request => request.headers.get('x-owner'),
        onError: error => failures.push(error)});
    let pageId;
    try {
        const opened = await fetch(app.url, {headers: {'x-owner': 'alice'}});
        assert.equal(opened.status, 200);
        const html = await opened.text();
        pageId = bootstrap(html).argument.config.pageId;
        assert.ok(!html.includes('<h1>'));
        assert.equal(bootstrap(html).argument.config.closeUrl, '/gramlot/close');
        const asset = await fetch(app.url + '/assets/gramlot.js');
        assert.equal(asset.status, 200);
        assert.match(asset.headers.get('content-type'), /javascript/);
        assert.ok((await asset.text()).length > 1000);
        const post = (path, payload, owner = 'alice') => fetch(app.url + path, {
            method: 'POST', headers: {'content-type': 'application/json', 'x-owner': owner}, body: JSON.stringify(payload),
        });
        const main = await post('/gramlot/main', {pageId});
        assert.equal(main.status, 200);
        assert.match(await main.text(), /Hello World/);
        const remote = await post('/gramlot/source', {pageId, method: 'details'});
        assert.equal(remote.status, 200);
        assert.match(await remote.text(), /Remote HTML/);
        assert.equal((await post('/gramlot/main', {pageId}, 'bob')).status, 404);
        for (const method of ['main', 'missing', 'constructor']) {
            const unknown = await post('/gramlot/source', {pageId, method});
            assert.equal(unknown.status, 404, method);
            assert.equal(await unknown.text(), 'Unknown Source method', method);
        }
        assert.equal((await post('/gramlot/main', {pageId, excess: 'a'.repeat(5000)})).status, 413);
        assert.equal((await fetch(app.url + '/gramlot/main')).status, 405);
        assert.equal((await fetch(app.url + '/missing')).status, 404);
        for (const [body, contentType, status] of [
            ['{', 'application/json', 400], ['{}', 'application/json', 400],
            ['{}', 'text/plain', 415],
        ]) {
            const invalid = await fetch(app.url + '/gramlot/main', {
                method: 'POST', headers: {'content-type': contentType}, body,
            });
            assert.equal(invalid.status, status);
        }
        assert.equal((await post('/gramlot/close', {pageId}, 'bob')).status, 200);
        assert.equal((await post('/gramlot/main', {pageId})).status, 200);
        assert.equal((await post('/gramlot/close', {pageId})).status, 200);
        assert.equal((await post('/gramlot/main', {pageId})).status, 404);
        assert.equal((await post('/gramlot/close', {pageId})).status, 200);
        assert.equal((await fetch(app.url + '/gramlot/close')).status, 405);
        const expiring = await fetch(app.url, {headers: {'x-owner': 'alice'}});
        const expiringId = bootstrap(await expiring.text()).argument.config.pageId;
        host.pages.get(expiringId).expires = 0;
        assert.equal((await post('/gramlot/main', {pageId: expiringId})).status, 404);
        assert.deepEqual(failures, []);
    } finally { await app.close(); }
    assert.equal(host.pages.size, 0);
    await assert.rejects(fetch(app.url));
});

const STRICT_CSP = "script-src 'nonce-{nonce}'; object-src 'none'; base-uri 'none'";
const PERMISSIVE_CSP = "script-src 'nonce-{nonce}' 'unsafe-eval'; object-src 'none'; base-uri 'none'";
const PAGE_MODULE = import.meta.resolve('@gramlot/native-html/page');

/** The nonce, runtime URL and PageBootstrap argument of a bootstrap document. */
function bootstrap(html) {
    const [, nonce, body] = html.match(/<script type="module" nonce="([^"]+)">(.*?)<\/script>/s);
    const runtime = JSON.parse(body.match(/import \{PageBootstrap\} from (".*?");/)[1]);
    return {nonce, runtime, argument: JSON.parse(body.match(/new PageBootstrap\((.*)\)\.run\(\)/s)[1])};
}

/** A pages folder with index.js, companions, a README, a theme and an escaping symlink. */
async function pagesFolder() {
    const folder = await mkdtemp(join(tmpdir(), 'gramlot-js-server-'));
    const pages = join(folder, 'pages');
    await mkdir(join(pages, 'themes'), {recursive: true});
    await writeFile(join(pages, 'index.js'), `import {Page as BasePage} from ${JSON.stringify(PAGE_MODULE)};
export class Page extends BasePage {
    static css = ['/themes/theme.css', 'local.css', 'https://cdn.example/remote.css', '/assets/app.css'];
    main(root) { root.h1('Hello'); }
}
`);
    await writeFile(join(pages, 'index.css'), 'h1 { color: red; }');
    await writeFile(join(pages, 'index_aux.js'), 'export class Logic {}');
    await writeFile(join(pages, 'index.md'), '# Readme');
    await writeFile(join(pages, 'themes', 'theme.css'), 'body { margin: 0; }');
    await writeFile(join(folder, 'outside.css'), 'secret');
    await symlink(join(folder, 'outside.css'), join(pages, 'escape.css'));
    return {folder, pages};
}

test('mount prefix: bootstrap URLs carry it once; requests arrive without it', async () => {
    const {folder, pages} = await pagesFolder();
    const app = await startNativeServer({pages, mountPath: '/app/'});
    try {
        const html = await (await fetch(app.url + '/')).text();
        const {runtime, argument} = bootstrap(html);
        assert.equal(runtime, '/app/assets/gramlot.js');
        assert.deepEqual(argument.config, {pageId: argument.config.pageId, mainUrl: '/app/gramlot/main',
            sourceUrl: '/app/gramlot/source', closeUrl: '/app/gramlot/close', rootId: 'gramlot-root'});
        assert.deepEqual(argument.resources, {
            css: ['/app/themes/theme.css', 'local.css', 'https://cdn.example/remote.css', '/app/assets/app.css', '/app/index.css'],
            js: [{url: '/app/index_aux.js', group: null}],
        });
        assert.ok(!html.includes('<link'));
        assert.ok(!html.includes('/app/app/'));
        const main = await fetch(app.url + '/gramlot/main', {method: 'POST',
            headers: {'content-type': 'application/json'}, body: JSON.stringify({pageId: argument.config.pageId})});
        assert.match(await main.text(), /Hello/);
    } finally { await app.close(); await rm(folder, {recursive: true}); }
});

for (const [name, policy] of [['strict', STRICT_CSP], ['permissive', PERMISSIVE_CSP]]) {
    test(`${name} CSP: the application policy is sent with the bootstrap nonce of each opening`, async () => {
        const {folder, pages} = await pagesFolder();
        const app = await startNativeServer({pages, contentSecurityPolicy: policy});
        try {
            const first = await fetch(app.url + '/'), second = await fetch(app.url + '/');
            const nonces = [];
            for (const response of [first, second]) {
                const {nonce} = bootstrap(await response.text());
                assert.equal(response.headers.get('content-security-policy'), policy.replace('{nonce}', nonce));
                nonces.push(nonce);
            }
            assert.notEqual(nonces[0], nonces[1]);
            for (const path of ['/assets/gramlot.js', '/index.css', '/missing']) {
                assert.equal((await fetch(app.url + path)).headers.get('content-security-policy'), null);
            }
        } finally { await app.close(); await rm(folder, {recursive: true}); }
    });
}

test('companions and Page.css files below the pages folder; every other file 404', async () => {
    const {folder, pages} = await pagesFolder();
    const app = await startNativeServer({pages, mountPath: '/app'});
    try {
        for (const [path, type, body] of [['/themes/theme.css', 'text/css', 'body { margin: 0; }'],
            ['/index.css', 'text/css', 'h1 { color: red; }'], ['/index_aux.js', 'text/javascript', 'export class Logic {}']]) {
            const response = await fetch(app.url + path);
            assert.equal(response.status, 200);
            assert.ok(response.headers.get('content-type').startsWith(type));
            assert.equal(await response.text(), body);
            const head = await fetch(app.url + path, {method: 'HEAD'});
            assert.equal(head.status, 200);
            assert.equal(await head.text(), '');
        }
        for (const path of ['/index.js', '/index.md', '/missing.css', '/escape.css', '/assets/app.css',
            '/%2e%2e/outside.css', '/themes/%2e%2e/%2e%2e/outside.css', '/x%00.css', '/app/index.css']) {
            assert.equal((await fetch(app.url + path)).status, 404, path);
        }
        assert.equal((await fetch(app.url + '/index.css', {method: 'POST'})).status, 405);
        assert.equal((await fetch(app.url + '/%E0.css')).status, 400);
    } finally { await app.close(); await rm(folder, {recursive: true}); }
});

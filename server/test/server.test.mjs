import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir, mkdtemp, readFile, rm, symlink, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {toTytx} from '@genrojs/tytx';
import {GramlotServer, NAME_SYNTAX, Page, checkProtocol} from '@gramlot/gramlot/server';
const {startServer} = await import(globalThis.Bun ? '../src/bun.mjs' : '../src/node.mjs');

class HtmlPage extends Page {
    main(root) { root.h1('Hello World'); }
    details(root) { root.p('Remote HTML'); }
}
HtmlPage.registerSource('details');
class TestServer extends GramlotServer {
    async resolvePage(path) { return path === '/' ? HtmlPage : super.resolvePage(path); }
    async resolveResources() { return {css: [], js: []}; }
}

test('real listener serves packaged runtime and the envelope on rpc; errors and shutdown', async () => {
    const server = new TestServer();
    const failures = [];
    const app = await startServer({server, ownerForRequest: request => request.headers.get('x-owner'),
        onError: error => failures.push(error)});
    let pageId;
    try {
        const opened = await fetch(app.url, {headers: {'x-owner': 'alice'}});
        assert.equal(opened.status, 200);
        const html = await opened.text();
        const {config} = bootstrap(html).argument;
        pageId = config.pageId;
        assert.ok(!html.includes('<h1>'));
        assert.deepEqual(config, {pageId, rpcUrl: '/gramlot/rpc', closeUrl: '/gramlot/close',
            rootId: 'gramlot-root', capabilities: [], nameSyntax: NAME_SYNTAX.toJSON()});
        // The application's own identity system replaces the owner cookie.
        assert.deepEqual(opened.headers.getSetCookie(), []);
        const asset = await fetch(app.url + '/assets/gramlot.js');
        assert.equal(asset.status, 200);
        assert.match(asset.headers.get('content-type'), /javascript/);
        assert.ok((await asset.text()).length > 1000);
        const post = (path, body, owner = 'alice') => fetch(app.url + path, {
            method: 'POST', headers: {'content-type': 'application/json', 'x-owner': owner}, body,
        });
        const call = async (contentType, name, {id = pageId, owner = 'alice', params = {}, ...fields} = {}) => {
            const response = await post('/gramlot/rpc', toTytx({id: 'r1', pageId: id, contentType, name, params, ...fields}), owner);
            assert.equal(response.status, 200);
            assert.match(response.headers.get('content-type'), /^application\/json/);
            // JSON.parse keeps the fragment document as its TYTX string.
            const envelope = JSON.parse(await response.text());
            assert.equal(envelope.id, 'r1');
            assert.equal(envelope.contentType, contentType);
            return envelope;
        };
        assert.match((await call('source', 'main')).value, /Hello World/);
        assert.match((await call('source', 'details')).value, /Remote HTML/);
        assert.equal((await call('source', 'main', {owner: 'bob'})).error.code, 'page_expired');
        for (const name of ['missing', 'constructor']) {
            assert.equal((await call('source', name)).error.code, 'not_found', name);
        }
        // No size limit: a large envelope is answered like any other.
        assert.match((await call('source', 'main', {excess: 'a'.repeat(100000)})).value, /Hello World/);
        assert.equal((await fetch(app.url + '/gramlot/rpc')).status, 405);
        assert.equal((await fetch(app.url + '/missing')).status, 404);
        for (const [body, contentType, status] of [
            ['{', 'application/json', 400], ['{}', 'application/json', 400],
            [JSON.stringify({id: 'r', pageId, contentType: 'source', name: 'main', params: null}), 'application/json', 400],
            ['{}', 'text/plain', 415],
        ]) {
            const invalid = await fetch(app.url + '/gramlot/rpc', {
                method: 'POST', headers: {'content-type': contentType}, body,
            });
            assert.equal(invalid.status, status, body);
        }
        for (const removed of ['/gramlot/main', '/gramlot/source']) {
            assert.equal((await post(removed, JSON.stringify({pageId}))).status, 405, removed);
        }
        const close = (owner = 'alice') => post('/gramlot/close', JSON.stringify({pageId}), owner);
        assert.equal((await close('bob')).status, 200);
        assert.match((await call('source', 'main')).value, /Hello World/);
        const closed = await close();
        assert.equal(closed.status, 200);
        assert.deepEqual(await closed.json(), {ok: true});
        assert.equal((await call('source', 'main')).error.code, 'page_expired');
        assert.equal((await close()).status, 200);
        assert.equal((await post('/gramlot/close', '{')).status, 400);
        assert.equal((await post('/gramlot/close', '{}')).status, 400);
        assert.equal((await fetch(app.url + '/gramlot/close')).status, 405);
        const expiring = await fetch(app.url, {headers: {'x-owner': 'alice'}});
        const expiringId = bootstrap(await expiring.text()).argument.config.pageId;
        server.pages.get(expiringId).expires = 0;
        assert.equal((await call('source', 'main', {id: expiringId})).error.code, 'page_expired');
        assert.deepEqual(failures, []);
    } finally { await app.close(); }
    assert.equal(server.pages.size, 0);
    await assert.rejects(fetch(app.url));
});

const STRICT_CSP = "script-src 'nonce-{nonce}'; object-src 'none'; base-uri 'none'";
const PERMISSIVE_CSP = "script-src 'nonce-{nonce}' 'unsafe-eval'; object-src 'none'; base-uri 'none'";
const PAGE_MODULE = import.meta.resolve('@gramlot/gramlot/page');

/** The nonce, runtime URL and PageBootstrap argument of a bootstrap document. */
function bootstrap(html) {
    const [, nonce, body] = html.match(/<script type="module" nonce="([^"]+)">(.*?)<\/script>/s);
    const runtime = JSON.parse(body.match(/import \{PageBootstrap\} from (".*?");/)[1]);
    return {nonce, runtime, argument: JSON.parse(body.match(/new PageBootstrap\((.*)\)\.run\(\)/s)[1])};
}

/** The `name=value` cookie that a page response sets, to send back as the browser does. */
const ownerCookie = response => response.headers.getSetCookie()[0].split(';')[0];

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

test('mount prefix: bootstrap URLs carry it once; requests carry it, outside it 404, the bare prefix redirects', async () => {
    const {folder, pages} = await pagesFolder();
    const app = await startServer({pages, mountPath: '/app/'});
    try {
        const opened = await fetch(app.url + '/app/');
        const html = await opened.text();
        const {runtime, argument} = bootstrap(html);
        assert.equal(runtime, '/app/assets/gramlot.js');
        assert.equal((await fetch(app.url + runtime)).status, 200);
        assert.deepEqual(argument.config, {pageId: argument.config.pageId, rpcUrl: '/app/gramlot/rpc',
            closeUrl: '/app/gramlot/close', rootId: 'gramlot-root', capabilities: [], nameSyntax: NAME_SYNTAX.toJSON()});
        assert.deepEqual(argument.resources, {
            css: ['/app/themes/gramlot-base/theme.css', '/app/themes/theme.css', 'local.css', 'https://cdn.example/remote.css',
                '/app/assets/app.css', '/app/index.css'],
            js: [{url: '/app/index_aux.js', group: null}],
        });
        assert.ok(!html.includes('<link'));
        assert.ok(!html.includes('/app/app/'));
        const main = await fetch(app.url + argument.config.rpcUrl, {method: 'POST',
            headers: {'content-type': 'application/json', cookie: ownerCookie(opened)},
            body: toTytx({id: 'r1', pageId: argument.config.pageId, contentType: 'source', name: 'main', params: {}})});
        assert.match(JSON.parse(await main.text()).value, /Hello/);
        for (const path of ['/', '/assets/gramlot.js', '/gramlot/rpc', '/index.css', '/application/', '/appx']) {
            assert.equal((await fetch(app.url + path)).status, 404, path);
        }
        const bare = await fetch(app.url + '/app?x=1', {redirect: 'manual'});
        assert.equal(bare.status, 301);
        assert.equal(bare.headers.get('location'), '/app/?x=1');
    } finally { await app.close(); await rm(folder, {recursive: true}); }
});

for (const [name, policy] of [['strict', STRICT_CSP], ['permissive', PERMISSIVE_CSP]]) {
    test(`${name} CSP: the application policy is sent with the bootstrap nonce of each opening`, async () => {
        const {folder, pages} = await pagesFolder();
        const app = await startServer({pages, contentSecurityPolicy: policy});
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
    const app = await startServer({pages, mountPath: '/app'});
    try {
        for (const [path, type, body] of [['/themes/theme.css', 'text/css', 'body { margin: 0; }'],
            ['/index.css', 'text/css', 'h1 { color: red; }'], ['/index_aux.js', 'text/javascript', 'export class Logic {}'],
            ['/index.js', 'text/javascript', await readFile(join(pages, 'index.js'), 'utf8')]]) {
            const response = await fetch(app.url + '/app' + path);
            assert.equal(response.status, 200);
            assert.ok(response.headers.get('content-type').startsWith(type));
            assert.equal(await response.text(), body);
            const head = await fetch(app.url + '/app' + path, {method: 'HEAD'});
            assert.equal(head.status, 200);
            assert.equal(await head.text(), '');
        }
        for (const path of ['/index.mjs', '/index.md', '/missing.js', '/missing.css', '/escape.css', '/assets/app.css',
            '/%2e%2e/outside.css', '/themes/%2e%2e/%2e%2e/outside.css', '/x%00.css', '/app/index.css']) {
            assert.equal((await fetch(app.url + '/app' + path)).status, 404, path);
        }
        assert.equal((await fetch(app.url + '/index.css')).status, 404);
        assert.equal((await fetch(app.url + '/app/index.css', {method: 'POST'})).status, 405);
        assert.equal((await fetch(app.url + '/app/%E0.css')).status, 400);
    } finally { await app.close(); await rm(folder, {recursive: true}); }
});

test('a page module that exports Logic is the page logic and is served as JavaScript', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'gramlot-js-server-'));
    const module = `import {Page as BasePage} from ${JSON.stringify(PAGE_MODULE)};
export class Page extends BasePage { main(root) { root.h1('One module'); } }
export class Logic { greeting(kwargs) { return 'Hello, ' + kwargs.name; } }
`;
    await writeFile(join(folder, 'single.js'), module);
    const app = await startServer({pages: folder});
    try {
        const {argument} = bootstrap(await (await fetch(app.url + '/single')).text());
        assert.deepEqual(argument.resources, {css: ['/themes/gramlot-base/theme.css'], js: [{url: '/single.js', group: null}]});
        const response = await fetch(app.url + '/single.js');
        assert.equal(response.status, 200);
        assert.ok(response.headers.get('content-type').startsWith('text/javascript'));
        assert.equal(await response.text(), module);
    } finally { await app.close(); await rm(folder, {recursive: true}); }
});

test('assets: application files by GET and HEAD under the prefix; a malformed entry is refused', async () => {
    const {folder, pages} = await pagesFolder();
    const logo = join(folder, 'logo.svg');
    await writeFile(logo, '<svg/>');
    const app = await startServer({pages, mountPath: '/app', assets: {'/img/logo.svg': {file: logo, type: 'image/svg+xml'}}});
    try {
        const response = await fetch(app.url + '/app/img/logo.svg');
        assert.equal(response.status, 200);
        assert.equal(response.headers.get('content-type'), 'image/svg+xml');
        assert.equal(await response.text(), '<svg/>');
        assert.equal(await (await fetch(app.url + '/app/img/logo.svg', {method: 'HEAD'})).text(), '');
        assert.equal((await fetch(app.url + '/app/img/logo.svg', {method: 'POST'})).status, 405);
        assert.equal((await fetch(app.url + '/img/logo.svg')).status, 404);
    } finally { await app.close(); await rm(folder, {recursive: true}); }
    await assert.rejects(startServer({pages, assets: {'img/logo.svg': {file: logo, type: 'image/svg+xml'}}}), /root-relative/);
});

test('<path>/index.html opens the page <path> and /index.html the index, as on a static host', async () => {
    const folder = await mkdtemp(join(tmpdir(), 'gramlot-js-server-'));
    for (const [file, title] of [['index.js', 'Home'], ['about.js', 'About']]) {
        await writeFile(join(folder, file), `import {Page as BasePage} from ${JSON.stringify(PAGE_MODULE)};
export class Page extends BasePage { static title = ${JSON.stringify(title)}; main(root) { root.h1(${JSON.stringify(title)}); } }
`);
    }
    const app = await startServer({pages: folder, mountPath: '/site'});
    const title = async path => (await (await fetch(app.url + path)).text()).match(/<title>(.*?)<\/title>/)?.[1];
    try {
        for (const [path, expected] of [['/site/', 'Home'], ['/site/index.html', 'Home'], ['/site/about', 'About'],
            ['/site/about/index.html', 'About'], ['/site/about/', 'About']]) {
            assert.equal(await title(path), expected, path);
        }
        for (const path of ['/site/missing/index.html', '/site/about/index.htm', '/site/about.html']) {
            assert.equal((await fetch(app.url + path)).status, 404, path);
        }
    } finally { await app.close(); await rm(folder, {recursive: true}); }
});

test('/themes/* comes from the core under the prefix, before assets; a pages folder file answers other theme paths', async () => {
    const {folder, pages} = await pagesFolder();
    const app = await startServer({pages, mountPath: '/app',
        assets: {'/themes/gramlot-base/theme.css': {file: join(folder, 'outside.css'), type: 'text/css'}}});
    try {
        const core = await readFile(new URL(import.meta.resolve('@gramlot/gramlot/themes/gramlot-base/theme.css')), 'utf8');
        const response = await fetch(app.url + '/app/themes/gramlot-base/theme.css');
        assert.equal(response.status, 200);
        assert.ok(response.headers.get('content-type').startsWith('text/css'));
        assert.equal(await response.text(), core);
        assert.equal(await (await fetch(app.url + '/app/themes/gramlot-base/theme.css', {method: 'HEAD'})).text(), '');
        assert.equal(await (await fetch(app.url + '/app/themes/theme.css')).text(), 'body { margin: 0; }');
        const readme = await fetch(app.url + '/app/themes/gramlot-base/README.md');
        assert.equal(readme.status, 200);
        assert.ok(readme.headers.get('content-type').startsWith('text/markdown'));
        assert.equal((await fetch(app.url + '/app/themes/gramlot-base/theme.css', {method: 'POST'})).status, 405);
        for (const path of ['/themes/gramlot-base/theme.css', '/app/themes/%2e%2e/package.json',
            '/app/themes/%2e%2e/package.css', '/app/themes/missing.css']) {
            assert.equal((await fetch(app.url + path)).status, 404, path);
        }
    } finally { await app.close(); await rm(folder, {recursive: true}); }
});

test('/themes/* is served by a plain GramlotServer too, under the prefix; the page opens with the base theme', async () => {
    const app = await startServer({server: new TestServer(), mountPath: '/app'});
    try {
        const core = await readFile(new URL(import.meta.resolve('@gramlot/gramlot/themes/gramlot-base/theme.css')), 'utf8');
        const response = await fetch(app.url + '/app/themes/gramlot-base/theme.css');
        assert.equal(response.status, 200);
        assert.ok(response.headers.get('content-type').startsWith('text/css'));
        assert.equal(await response.text(), core);
        assert.equal(await (await fetch(app.url + '/app/themes/gramlot-base/theme.css', {method: 'HEAD'})).text(), '');
        assert.equal((await fetch(app.url + '/app/themes/gramlot-base/theme.css', {method: 'POST'})).status, 405);
        for (const path of ['/themes/gramlot-base/theme.css', '/app/themes/%2e%2e/package.json', '/app/themes/missing.css']) {
            assert.equal((await fetch(app.url + path)).status, 404, path);
        }
        const opened = await (await fetch(app.url + '/app/')).text();
        assert.deepEqual(bootstrap(opened).argument.resources.css, ['/app/themes/gramlot-base/theme.css']);
    } finally { await app.close(); }
});

// The check of the renewal of a page (item 18) takes 2.5 times the pageTtl of the server.
for (const [label, options] of [['without a mount prefix', {}],
    ['with a mount prefix and a policy', {mountPath: '/app', contentSecurityPolicy: STRICT_CSP}]]) {
    test(`GC-230: checkProtocol passes on the conformance page, ${label}`, async () => {
        const pages = fileURLToPath(new URL('./fixtures/conformance/', import.meta.url));
        const app = await startServer({pages, pageTtl: 1, ...options});
        try { await checkProtocol(app.url + (options.mountPath ?? ''), '/', {pageTtl: 1}); }
        finally { await app.close(); }
    });
}

test('GC-230 §135: each browser is its own owner by the cookie gramlot_owner; ownerForRequest replaces it', async () => {
    for (const [mountPath, path] of [['', '/'], ['/app', '/app/']]) {
        const {folder, pages} = await pagesFolder();
        const app = await startServer({pages, mountPath});
        try {
            const first = await fetch(app.url + path);
            const [setCookie, ...others] = first.headers.getSetCookie();
            assert.deepEqual(others, []);
            const [pair, ...attributes] = setCookie.split('; ');
            assert.match(pair, /^gramlot_owner=[A-Za-z0-9_-]{32}$/);
            assert.deepEqual(attributes, [`Path=${mountPath || '/'}`, 'HttpOnly', 'SameSite=Lax']);
            const call = async (opened, cookie) => {
                const {pageId, rpcUrl} = bootstrap(await opened.clone().text()).argument.config;
                const response = await fetch(app.url + rpcUrl, {method: 'POST',
                    headers: {'content-type': 'application/json', ...(cookie ? {cookie} : {})},
                    body: toTytx({id: 'r1', pageId, contentType: 'source', name: 'main', params: {}})});
                return JSON.parse(await response.text());
            };
            assert.match((await call(first, pair)).value, /Hello/);
            assert.equal((await call(first)).error.code, 'page_expired');
            assert.equal((await call(first, `${pair}x`)).error.code, 'page_expired');
            assert.equal((await call(first, 'gramlot_owner=')).error.code, 'page_expired');
            // The browser that sends its cookie again keeps its value; a browser without one gets another.
            const again = await fetch(app.url + path, {headers: {cookie: pair}});
            assert.equal(ownerCookie(again), pair);
            assert.match((await call(again, pair)).value, /Hello/);
            const other = await fetch(app.url + path);
            assert.notEqual(ownerCookie(other), pair);
            assert.equal((await call(first, ownerCookie(other))).error.code, 'page_expired');
            // A close message without the cookie of the page leaves it open.
            const {pageId, closeUrl} = bootstrap(await first.text()).argument.config;
            const close = cookie => fetch(app.url + closeUrl, {method: 'POST',
                headers: {'content-type': 'application/json', ...(cookie ? {cookie} : {})}, body: JSON.stringify({pageId})});
            assert.equal((await close()).status, 200);
            assert.equal(app.gramlotServer.pages.has(pageId), true);
            assert.equal((await close(pair)).status, 200);
            assert.equal(app.gramlotServer.pages.has(pageId), false);
        } finally { await app.close(); await rm(folder, {recursive: true}); }
    }
});

test('every 405 lists the methods of the URL in Allow; the runtime is no-cache, the other responses no-store', async () => {
    const {folder, pages} = await pagesFolder();
    const logo = join(folder, 'logo.svg');
    await writeFile(logo, '<svg/>');
    const app = await startServer({pages, mountPath: '/app', assets: {'/img/logo.svg': {file: logo, type: 'image/svg+xml'}}});
    const send = (method, path) => fetch(app.url + '/app' + path,
        {method, ...(['POST', 'PUT', 'PATCH'].includes(method) ? {body: '{}'} : {})});
    try {
        for (const [path, allow, methods] of [
            ['/', 'GET', ['POST', 'HEAD', 'PUT', 'DELETE', 'PATCH']],
            ['/index.html', 'GET', ['HEAD', 'POST']],
            ['/assets/gramlot.js', 'GET, HEAD', ['POST', 'PUT', 'DELETE', 'PATCH']],
            ['/themes/gramlot-base/theme.css', 'GET, HEAD', ['POST', 'DELETE']],
            ['/img/logo.svg', 'GET, HEAD', ['POST', 'DELETE']],
            ['/index.css', 'GET, HEAD', ['POST', 'DELETE']],
            ['/index_aux.js', 'GET, HEAD', ['POST', 'DELETE']],
            ['/gramlot/rpc', 'POST', ['GET', 'HEAD', 'PUT', 'DELETE']],
            ['/gramlot/close', 'POST', ['GET', 'HEAD', 'PUT', 'DELETE']],
        ]) {
            for (const method of methods) {
                const response = await send(method, path);
                assert.equal(response.status, 405, `${method} ${path}`);
                assert.equal(response.headers.get('allow'), allow, `${method} ${path}`);
            }
        }
        const cache = async path => (await send('GET', path)).headers.get('cache-control');
        assert.equal(await cache('/assets/gramlot.js'), 'no-cache');
        for (const path of ['/', '/themes/gramlot-base/theme.css', '/img/logo.svg', '/index.css', '/missing']) {
            assert.equal(await cache(path), 'no-store', path);
        }
        assert.equal((await send('GET', '/assets/gramlot.js')).headers.get('x-content-type-options'), 'nosniff');
    } finally { await app.close(); await rm(folder, {recursive: true}); }
});

for (const [label, contentType, status] of [
    ['jsonp', 'application/jsonp', 415],
    ['JSON suffix', 'application/json-extra', 415],
    ['missing media type', null, 415],
    ['empty media type', '', 415],
    ['invalid UTF-8', 'application/json', 400],
    ['UTF-8 text', 'application/json', 200],
    ['leading byte order mark', 'application/json', 200],
    ['mixed-case JSON', 'Application/JSON', 200],
    ['charset parameter', 'application/json; charset=utf-8', 200],
    ['media-type whitespace', 'application/json ; charset=UTF-8', 200],
]) {
    for (const path of ['/gramlot/rpc', '/gramlot/close']) {
        test(`HTTP input boundary: ${label} on ${path}, before page execution`, async () => {
            const calls = [];
            const failures = [];
            class InputPage extends HtmlPage {
                echo({value}) { calls.push(value); return value; }
            }
            InputPage.registerEndpoint('echo');
            class InputServer extends TestServer {
                async resolvePage() { return InputPage; }
            }
            const app = await startServer({server: new InputServer(), onError: error => failures.push(error)});
            try {
                const opened = await fetch(app.url);
                const {pageId} = bootstrap(await opened.text()).argument.config;
                const value = label === 'UTF-8 text' ? 'caffè ☕ 漢字' : 'invalid-byte';
                const cookie = ownerCookie(opened);
                const payload = path === '/gramlot/rpc'
                    ? {id: 'boundary', pageId, contentType: 'data', name: 'echo', params: {value}}
                    : {pageId, value};
                let body = Buffer.from(JSON.stringify(payload));
                if (label === 'invalid UTF-8') body[body.indexOf('invalid-byte')] = 0xff;
                if (label === 'leading byte order mark') body = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), body]);
                const headers = {cookie, ...(contentType === null ? {} : {'content-type': contentType})};
                const response = await fetch(app.url + path, {method: 'POST', headers, body});
                assert.equal(response.status, status);
                if (status === 200) {
                    assert.match(response.headers.get('content-type'), /^application\/json/);
                    const answer = await response.json();
                    if (path === '/gramlot/rpc') assert.equal(answer.value, value);
                    else assert.deepEqual(answer, {ok: true});
                } else {
                    assert.match(response.headers.get('content-type'), /^text\/plain/);
                    assert.equal(await response.text(), status === 415 ? 'Expected application/json' : 'Request body is not UTF-8');
                }
                assert.deepEqual(calls, path === '/gramlot/rpc' && status === 200 ? [value] : []);
                const after = await fetch(app.url + '/gramlot/rpc', {
                    method: 'POST', headers: {'content-type': 'application/json', cookie},
                    body: toTytx({id: 'alive', pageId, contentType: 'source', name: 'main', params: {}}),
                });
                assert.equal(after.status, 200);
                const answer = await after.json();
                if (path === '/gramlot/close' && status === 200) assert.equal(answer.error.code, 'page_expired');
                else assert.match(answer.value, /Hello World/);
                assert.deepEqual(failures, []);
            } finally {
                await app.close();
            }
        });
    }
}

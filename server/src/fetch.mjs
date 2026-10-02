/** Gramlot host protocol over Request/Response, shared by the Node and Bun socket bridges. */
import {readFile, realpath, stat} from 'node:fs/promises';
import {isAbsolute, join, relative, sep} from 'node:path';
import {FileHost, PageExpired, PageNotFound, SourceNotFound, HostCapacity} from '@gramlot/gramlot/server';

const COMPANION_TYPES = {'.css': 'text/css; charset=utf-8', '_aux.js': 'text/javascript; charset=utf-8'};

const inside = (filename, folder) => {
    const rel = relative(folder, filename);
    return rel === '' || !(rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel));
};

/** Real path of the file of path when it is below the real pages folder, else null. */
async function companionFile(pagesDir, path) {
    try {
        const root = await realpath(pagesDir);
        const real = await realpath(join(root, ...path.split('/').filter(Boolean)));
        return inside(real, root) && (await stat(real)).isFile() ? real : null;
    } catch (error) {
        if (['ENOENT', 'ENOTDIR', 'ERR_INVALID_ARG_VALUE'].includes(error.code)) return null;
        throw error;
    }
}

/** mountPath is passed to openPage as the mount prefix of browser URLs; request paths
 * arrive without it, at the root or behind a server that strips the mount. GET and HEAD
 * serve a .css or _aux.js file whose real path is below host.pagesDir: the FileHost
 * companions and Page.css files placed there. contentSecurityPolicy is the application's
 * policy, sent on each HTML page with {nonce} replaced by the bootstrap nonce.
 */
export async function createDispatch({pages, host = null, ownerForRequest = async () => null,
                                            mountPath = '', contentSecurityPolicy = null, ...options} = {}) {
    host ??= new FileHost(pages, options);
    const trimmed = mountPath.replace(/^\/+|\/+$/g, '');
    const prefix = trimmed ? `/${trimmed}` : '';
    const runtime = await readFile(new URL(import.meta.resolve('@gramlot/gramlot/runtime')));
    return {host, prefix, async fetch(request) {
        if (new URL(request.url).pathname === host.runtimeUrl) {
            if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', {status: 405});
            return new Response(request.method === 'HEAD' ? null : runtime, {
                headers: {'Content-Type': 'text/javascript; charset=utf-8', 'X-Content-Type-Options': 'nosniff'},
            });
        }
        const url = new URL(request.url);
        const reply = (body, status, type = 'text/plain; charset=utf-8', headers = {}) =>
            new Response(body, {status, headers: {'Content-Type': type, 'Cache-Control': 'no-store', ...headers}});
        const suffix = Object.keys(COMPANION_TYPES).find(end => url.pathname.endsWith(end));
        if (suffix && host.pagesDir !== undefined) {
            if (!['GET', 'HEAD'].includes(request.method)) return reply('Method not allowed', 405);
            let path;
            try { path = decodeURIComponent(url.pathname); }
            catch { return reply('Invalid path', 400); }
            const filename = await companionFile(host.pagesDir, path);
            if (!filename) return reply('Not found', 404);
            return reply(request.method === 'HEAD' ? null : await readFile(filename), 200, COMPANION_TYPES[suffix]);
        }
        const owner = await ownerForRequest(request);
        try {
            if (url.pathname === host.mainUrl || url.pathname === host.sourceUrl || url.pathname === host.closeUrl) {
                if (request.method !== 'POST') return reply('Method not allowed', 405);
                if (!request.headers.get('content-type')?.startsWith('application/json')) {
                    return reply('Expected application/json', 415);
                }
                let payload;
                try {
                    // main accepts just pageId. Bound reads even without Content-Length.
                    const reader = request.body?.getReader();
                    if (!reader) return reply('Missing main payload', 400);
                    const chunks = [];
                    let size = 0;
                    while (true) {
                        const {value, done} = await reader.read();
                        if (done) break;
                        size += value.byteLength;
                        if (size > 4096) { await reader.cancel(); return reply('Payload too large', 413); }
                        chunks.push(value);
                    }
                    payload = JSON.parse(await new Blob(chunks).text());
                } catch { return reply('Invalid main payload', 400); }
                if (typeof payload?.pageId !== 'string') return reply('Missing pageId', 400);
                if (url.pathname === host.closeUrl) {
                    host.closePage(payload.pageId, {owner});
                    return reply(JSON.stringify({ok: true}), 200, 'application/json');
                }
                if (url.pathname === host.sourceUrl) {
                    if (typeof payload.method !== 'string' || (payload.params != null &&
                        (typeof payload.params !== 'object' || Array.isArray(payload.params)))) return reply('Invalid Source request', 400);
                    return reply(await host.source(payload.pageId, payload.method, payload.params ?? {}, {owner}), 200, 'application/json');
                }
                return reply(await host.main(payload.pageId, {owner}), 200, 'application/json');
            }
            if (request.method !== 'GET') return reply('Method not allowed', 405);
            let path;
            try { path = decodeURIComponent(url.pathname); }
            catch { return reply('Invalid path', 400); }
            const {html, nonce} = await host.openPage(path, {owner, prefix});
            const headers = contentSecurityPolicy === null ? {}
                : {'Content-Security-Policy': contentSecurityPolicy.replaceAll('{nonce}', nonce)};
            return reply(html, 200, 'text/html; charset=utf-8', headers);
        } catch (error) {
            if (error instanceof SourceNotFound) return reply('Unknown Source method', 404);
            if (error instanceof PageExpired || error instanceof PageNotFound) return reply('Not found', 404);
            if (error instanceof HostCapacity) return reply('Page registry capacity reached', 503);
            // Unexpected application errors remain visible to the owning adapter.
            throw error;
        }
    }};
}

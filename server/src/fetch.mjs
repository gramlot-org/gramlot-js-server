/** Gramlot server protocol (GC-230) over Request/Response, shared by the Node and Bun socket bridges. */
import {readFile, realpath, stat} from 'node:fs/promises';
import {dirname, extname, isAbsolute, join, relative, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {GramlotFileServer, PageExpired, PageNotFound, SourceNotFound, ServerCapacity, runtimeAsset} from '@gramlot/gramlot/server';

const COMPANION_TYPES = {'.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8'};
// Media types of the files of the core themes, by extension; any other extension is binary.
const MEDIA_TYPES = {
    '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
    '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
    '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
};
// The themes folder of the installed core (export ./themes/*).
const THEMES = dirname(dirname(fileURLToPath(import.meta.resolve('@gramlot/gramlot/themes/gramlot-base/theme.css'))));

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

/** mountPath is the mount prefix: openPage adds it to the browser URLs and every request
 * path carries it; the adapter removes it, answers 404 outside it and redirects the prefix
 * without its final slash. GET and HEAD serve a .css or .js file whose real path is below
 * server.pagesDir: the page modules, whose Logic reaches the browser, the GramlotFileServer companions
 * and Page.css files placed there. assets maps a URL path (without the prefix) to
 * {file, type}: application files served by GET and HEAD. /themes/<path> answers the file of
 * the core themes whose real path is inside their folder, with the media type of its
 * extension; when the core has no such file the request goes on. Order: runtime, themes,
 * assets, companions, pages. A GET of <path>/index.html opens
 * the page <path>, and /index.html the index, as a static host does. contentSecurityPolicy is the
 * application's policy, sent on each HTML page with {nonce} replaced by the bootstrap nonce.
 */
export async function createDispatch({pages, server = null, ownerForRequest = async () => null,
                                            mountPath = '', contentSecurityPolicy = null, assets = {}, ...options} = {}) {
    server ??= new GramlotFileServer(pages, options);
    const trimmed = mountPath.replace(/^\/+|\/+$/g, '');
    const prefix = trimmed ? `/${trimmed}` : '';
    for (const [path, asset] of Object.entries(assets)) {
        if (!path.startsWith('/') || typeof asset?.file !== 'string' || typeof asset?.type !== 'string') {
            throw new TypeError(`Asset ${path} needs a root-relative URL path, a file and a media type`);
        }
    }
    const runtime = await readFile(runtimeAsset());
    return {server, prefix, async fetch(request) {
        const url = new URL(request.url);
        const reply = (body, status, type = 'text/plain; charset=utf-8', headers = {}) =>
            new Response(body, {status, headers: {'Content-Type': type, 'Cache-Control': 'no-store', ...headers}});
        if (prefix && url.pathname === prefix) return reply(null, 301, undefined, {Location: `${prefix}/${url.search}`});
        if (prefix && !url.pathname.startsWith(`${prefix}/`)) return reply('Not found', 404);
        const pathname = url.pathname.slice(prefix.length);
        if (pathname === server.runtimeUrl) {
            if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', {status: 405});
            return new Response(request.method === 'HEAD' ? null : runtime, {
                headers: {'Content-Type': 'text/javascript; charset=utf-8', 'X-Content-Type-Options': 'nosniff'},
            });
        }
        if (pathname.startsWith('/themes/')) {
            let path;
            try { path = decodeURIComponent(pathname.slice('/themes'.length)); }
            catch { return reply('Invalid path', 400); }
            const filename = await companionFile(THEMES, path);
            if (filename) {
                if (!['GET', 'HEAD'].includes(request.method)) return reply('Method not allowed', 405);
                return reply(request.method === 'HEAD' ? null : await readFile(filename), 200,
                    MEDIA_TYPES[extname(filename).toLowerCase()] ?? 'application/octet-stream');
            }
        }
        if (Object.hasOwn(assets, pathname)) {
            if (!['GET', 'HEAD'].includes(request.method)) return reply('Method not allowed', 405);
            const {file, type} = assets[pathname];
            return reply(request.method === 'HEAD' ? null : await readFile(file), 200, type);
        }
        const suffix = Object.keys(COMPANION_TYPES).find(end => pathname.endsWith(end));
        if (suffix && server.pagesDir !== undefined) {
            if (!['GET', 'HEAD'].includes(request.method)) return reply('Method not allowed', 405);
            let path;
            try { path = decodeURIComponent(pathname); }
            catch { return reply('Invalid path', 400); }
            const filename = await companionFile(server.pagesDir, path);
            if (!filename) return reply('Not found', 404);
            return reply(request.method === 'HEAD' ? null : await readFile(filename), 200, COMPANION_TYPES[suffix]);
        }
        const owner = await ownerForRequest(request);
        try {
            if (pathname === server.mainUrl || pathname === server.sourceUrl || pathname === server.closeUrl) {
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
                if (pathname === server.closeUrl) {
                    server.closePage(payload.pageId, {owner});
                    return reply(JSON.stringify({ok: true}), 200, 'application/json');
                }
                if (pathname === server.sourceUrl) {
                    if (typeof payload.method !== 'string' || (payload.params != null &&
                        (typeof payload.params !== 'object' || Array.isArray(payload.params)))) return reply('Invalid Source request', 400);
                    return reply(await server.source(payload.pageId, payload.method, payload.params ?? {}, {owner}), 200, 'application/json');
                }
                return reply(await server.main(payload.pageId, {owner}), 200, 'application/json');
            }
            if (request.method !== 'GET') return reply('Method not allowed', 405);
            let path;
            try { path = decodeURIComponent(pathname); }
            catch { return reply('Invalid path', 400); }
            // As on a static host, <path>/index.html is the page <path> and /index.html the index.
            if (path.endsWith('/index.html')) path = path.slice(0, -'index.html'.length);
            const {html, nonce} = await server.openPage(path, {owner, prefix});
            const headers = contentSecurityPolicy === null ? {}
                : {'Content-Security-Policy': contentSecurityPolicy.replaceAll('{nonce}', nonce)};
            return reply(html, 200, 'text/html; charset=utf-8', headers);
        } catch (error) {
            if (error instanceof SourceNotFound) return reply('Unknown Source method', 404);
            if (error instanceof PageExpired || error instanceof PageNotFound) return reply('Not found', 404);
            if (error instanceof ServerCapacity) return reply('Page registry capacity reached', 503);
            // Unexpected application errors remain visible to the owning adapter.
            throw error;
        }
    }};
}

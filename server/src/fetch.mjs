import {readCollectionArtifact} from './collection-artifact.mjs';
/** Gramlot server protocol (GC-230) over Request/Response, shared by the Node and Bun socket bridges. */
import {randomBytes} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {extname} from 'node:path';
import {GramlotFileServer, InvalidRequest, PageNotFound, ServerCapacity, runtimeAsset} from '@gramlot/gramlot/server';

const OWNER_COOKIE = 'gramlot_owner';
const COMPANION_TYPES = {'.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8'};
// Media types of the files of the core themes, by extension; any other extension is binary.
const MEDIA_TYPES = {
    '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
    '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
    '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
};

/** The owner the browser sends in its `gramlot_owner` cookie (GC-230 §135), or null. */
const cookieOwner = request => (request.headers.get('cookie') ?? '').split(';').map(part => part.trim())
    .find(part => part.startsWith(`${OWNER_COOKIE}=`))?.slice(OWNER_COOKIE.length + 1) || null;

/** mountPath is the mount prefix: openPage adds it to the browser URLs and every request
 * path carries it; the adapter removes it, answers 404 outside it and redirects the prefix
 * without its final slash. For any GramlotServer, GET and HEAD serve the file of its themeFile
 * (/themes/<path>: a file of the core themes, with the media type of its extension; when the core has
 * no such file the request goes on). When the server is a GramlotFileServer, they also serve the file of
 * its companionFile (a .css or .js file whose real path is below server.pagesDir: the page modules, whose
 * Logic reaches the browser, the companions and Page.css files placed there). assets maps a URL path (without the prefix) to {file, type}:
 * application files served by GET and HEAD. Order: runtime, themes, assets, companions, pages. A GET of
 * <path>/index.html opens the page <path>, and /index.html the index, as a static host does (openPage).
 * contentSecurityPolicy is the application's policy, sent on each HTML page with {nonce} replaced by the
 * bootstrap nonce. Every 405 carries an Allow header; the runtime answers Cache-Control no-cache and the
 * other responses no-store.
 * The owner of a request is the application's, ownerForRequest(request), when it is given. Without it each
 * browser is its own owner through the cookie gramlot_owner, which a page response sets (Path of the mount
 * prefix, HttpOnly, SameSite=Lax, a session cookie) and the browser sends back. POST of rpcUrl passes the
 * body through server.decodeBody and the request envelope to server.call with the owner, and answers 200
 * with the response envelope; POST of closeUrl passes the body to server.close. Both answer 400 on
 * InvalidRequest, take application/json only (415) and set no size limit.
 */
export async function createDispatch({pages, server = null, ownerForRequest = null,
                                            mountPath = '', contentSecurityPolicy = null, assets = {}, ...options} = {}) {
    server ??= new GramlotFileServer(pages, options);
    const files = server instanceof GramlotFileServer;
    const trimmed = mountPath.replace(/^\/+|\/+$/g, '');
    const prefix = trimmed ? `/${trimmed}` : '';
    for (const [path, asset] of Object.entries(assets)) {
        if (!path.startsWith('/') || typeof asset?.file !== 'string' || typeof asset?.type !== 'string') {
            throw new TypeError(`Asset ${path} needs a root-relative URL path, a file and a media type`);
        }
    }
    // A fixed registry is verified before the host accepts requests.
    const collectionResources = new Map();
    for (const collection of server.collections) {
        const entry = assets[collection.module]?.file;
        if (!entry) throw new Error(`Missing collection resource: ${collection.name}`);
        const expected = `/gramlot/collections/${encodeURIComponent(collection.name)}/${collection.buildId.slice(7)}/assets/index.js`;
        if (collection.module !== expected) throw new Error('Collection URL must contain its verified identity');
        const snapshot = await readCollectionArtifact(collection, entry);
        const rootUrl = collection.module.slice(0, -'assets/index.js'.length);
        for (const file of snapshot.content.keys()) {
            if (file.startsWith('assets/')) collectionResources.set(rootUrl + file, {collection, entry, file});
        }
    }
    const runtime = await readFile(runtimeAsset());
    const ownerOf = ownerForRequest ?? (async request => cookieOwner(request));
    return {server, prefix, async fetch(request) {
        const url = new URL(request.url);
        const reply = (body, status, type = 'text/plain; charset=utf-8', headers = {}) =>
            new Response(body, {status, headers: {'Content-Type': type, 'Cache-Control': 'no-store', ...headers}});
        const refuse = allow => reply('Method not allowed', 405, undefined, {Allow: allow});
        const reading = ['GET', 'HEAD'].includes(request.method);
        if (prefix && url.pathname === prefix) return reply(null, 301, undefined, {Location: `${prefix}/${url.search}`});
        if (prefix && !url.pathname.startsWith(`${prefix}/`)) return reply('Not found', 404);
        const pathname = url.pathname.slice(prefix.length);
        if (pathname.startsWith('/gramlot/collections/')) {
            if (!['GET', 'HEAD'].includes(request.method)) return reply('Method not allowed', 405, undefined, {Allow: 'GET, HEAD'});
            const resource = collectionResources.get(pathname);
            if (!resource) return reply('Not found', 404);
            let snapshot;
            try { snapshot = await readCollectionArtifact(resource.collection, resource.entry); }
            catch { return reply('Not found', 404); }
            const bytes = snapshot.content.get(resource.file);
            return reply(request.method === 'HEAD' ? null : bytes, 200,
                MEDIA_TYPES[extname(resource.file).toLowerCase()] ?? 'application/octet-stream',
                {'Content-Length': String(bytes.length)});
        }
        let path;
        try { path = decodeURIComponent(url.pathname.slice(prefix.length)); }
        catch { return reply('Invalid path', 400); }
        if (path === '/app.webmanifest') {
            if (!reading) return refuse('GET, HEAD');
            try {
                const manifest = await server.pageManifest({prefix});
                return reply(request.method === 'HEAD' ? null : JSON.stringify(manifest), 200, 'application/manifest+json');
            } catch (error) {
                if (error instanceof PageNotFound) return reply('Not found', 404);
                throw error;
            }
        }
        if (path === server.runtimeUrl) {
            if (!reading) return refuse('GET, HEAD');
            return reply(request.method === 'HEAD' ? null : runtime, 200, COMPANION_TYPES['.js'],
                {'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff'});
        }
        if (path.startsWith('/themes/')) {
            const filename = await server.themeFile(path);
            if (filename) {
                if (!reading) return refuse('GET, HEAD');
                return reply(request.method === 'HEAD' ? null : await readFile(filename), 200,
                    MEDIA_TYPES[extname(filename).toLowerCase()] ?? 'application/octet-stream');
            }
        }
        if (Object.hasOwn(assets, path)) {
            if (!reading) return refuse('GET, HEAD');
            const {file, type} = assets[path];
            return reply(request.method === 'HEAD' ? null : await readFile(file), 200, type);
        }
        const suffix = Object.keys(COMPANION_TYPES).find(end => path.endsWith(end));
        if (suffix && files) {
            if (!reading) return refuse('GET, HEAD');
            const filename = await server.companionFile(path);
            if (!filename) return reply('Not found', 404);
            return reply(request.method === 'HEAD' ? null : await readFile(filename), 200, COMPANION_TYPES[suffix]);
        }
        const owner = await ownerOf(request);
        try {
            if (path === server.rpcUrl || path === server.closeUrl) {
                if (request.method !== 'POST') return refuse('POST');
                if ((request.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase() !== 'application/json') {
                    return reply('Expected application/json', 415);
                }
                const text = server.decodeBody(await request.arrayBuffer());
                if (path === server.rpcUrl) return reply(await server.call(text, {owner}), 200, 'application/json');
                server.close(text, {owner});
                return reply(JSON.stringify({ok: true}), 200, 'application/json');
            }
            if (request.method !== 'GET') return refuse('GET');
            const issued = ownerForRequest === null ? owner ?? randomBytes(24).toString('base64url') : owner;
            const {html, nonce} = await server.openPage(path, {owner: issued, prefix});
            const headers = contentSecurityPolicy === null ? {}
                : {'Content-Security-Policy': contentSecurityPolicy.replaceAll('{nonce}', nonce)};
            if (ownerForRequest === null) {
                headers['Set-Cookie'] = `${OWNER_COOKIE}=${issued}; Path=${prefix || '/'}; HttpOnly; SameSite=Lax`;
            }
            return reply(html, 200, 'text/html; charset=utf-8', headers);
        } catch (error) {
            if (error instanceof InvalidRequest) return reply(error.message, 400);
            if (error instanceof PageNotFound) return reply('Not found', 404);
            if (error instanceof ServerCapacity) return reply('Page registry capacity reached', 503);
            // Unexpected application errors remain visible to the owning adapter.
            throw error;
        }
    }};
}

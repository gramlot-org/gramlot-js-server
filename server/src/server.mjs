import {createServer} from 'node:http';
import {readFile, realpath} from 'node:fs/promises';
import {resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const project = fileURLToPath(new URL('../', import.meta.url));
const json = value => JSON.stringify(value).replaceAll('<', '\\u003c');

export async function createGramlotServer({runtimeDirectory, pages = {}} = {}) {
  const runtime = await realpath(runtimeDirectory ?? resolve(project,
    '../gramlot-poc/src/gramlot/resources/browser'));
  const manifest = JSON.parse(await readFile(resolve(runtime, 'manifest.json'), 'utf8'));
  if (manifest.schemaVersion !== 1 || !/^[a-f0-9]{16,64}$/.test(manifest.buildId)) {
    throw new Error('Unsupported Gramlot browser manifest');
  }
  const files = new Map(manifest.files.map(file => [file.path, file]));
  const prefix = `/runtime/${manifest.buildId}/`;
  const imports = Object.fromEntries(Object.entries(manifest.entryPoints)
    .map(([name, path]) => [name, prefix + path]));
  for (const path of Object.values(manifest.entryPoints)) {
    if (!files.has(path)) throw new Error(`Unlisted runtime entry: ${path}`);
  }
  return createServer(async (request, response) => {
    const send = (status, type, body) => {
      response.writeHead(status, {'Content-Type': type, 'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store'});
      response.end(request.method === 'HEAD' ? undefined : body);
    };
    try {
      if (!['GET', 'HEAD'].includes(request.method)) {
        response.setHeader('Allow', 'GET, HEAD');
        return send(405, 'text/plain', 'Method not allowed');
      }
      const path = new URL(request.url, 'http://localhost').pathname;
      if (path === '/health') return send(200, 'application/json', json({status: 'ok',
        runtimeBuild: manifest.buildId, database: false}));
      if (Object.hasOwn(pages, path)) {
        const {title, source} = await pages[path]();
        const safeTitle = title.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
        return send(200, 'text/html; charset=utf-8', `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${safeTitle}</title><script type="importmap">${json({imports})}</script></head>
<body><div id="root"></div><p id="error" hidden></p>
<script id="startup" type="application/json">${json({source})}</script>
<script type="module" src="/bootstrap.mjs"></script></body></html>`);
      }
      if (path === '/assets/gramlot-logo.png') return send(200, 'image/png',
        await readFile(resolve(project, 'assets/gramlot-logo.png')));
      if (path === '/bootstrap.mjs') return send(200, 'text/javascript',
        await readFile(resolve(project, 'src/bootstrap.mjs')));
      if (path.startsWith(prefix)) {
        const relative = decodeURIComponent(path.slice(prefix.length));
        const entry = files.get(relative);
        if (entry) {
          const target = await realpath(resolve(runtime, relative));
          if (!target.startsWith(runtime + sep)) return send(404, 'text/plain', 'Not found');
          return send(200, entry.mediaType, await readFile(target));
        }
      }
      send(404, 'text/plain', 'Not found');
    } catch (error) {
      if (error instanceof URIError) return send(400, 'text/plain', 'Malformed URL');
      console.error(error);
      send(500, 'text/plain', 'Unable to serve page');
    }
  });
}

import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createGramlotServer} from './server.mjs';
import {createPages} from './pages.mjs';

const project = fileURLToPath(new URL('../', import.meta.url));
export const runtimeDirectory = resolve(process.env.GRAMLOT_BROWSER_DIR ||
  resolve(project, '../gramlot-poc/src/gramlot/resources/browser'));
export async function buildServer() {
  const gramlot = await import(pathToFileURL(resolve(runtimeDirectory, 'esm/gramlot-dom.js')));
  return createGramlotServer({runtimeDirectory, pages:createPages(gramlot, await readFile(new URL('./pages.mjs', import.meta.url), 'utf8'))});
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT || 8070);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid PORT');
  const server = await buildServer();
  server.on('error', error => {console.error(error.message); process.exitCode = 1;});
  server.listen(port, '127.0.0.1', () => console.log(`Gramlot Node.js: http://127.0.0.1:${server.address().port}`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
}

/** npm start (Node) and npm run start:bun (Bun): the pages of the folder pages on http://127.0.0.1:8080/. */
import {fileURLToPath} from 'node:url';

const {startServer} = await import(globalThis.Bun ? '@gramlot/gramlot-js-server/bun' : '@gramlot/gramlot-js-server/node');
// The adapter serves the core theme of Page.css (/themes/gramlot-base/theme.css) by itself.
const app = await startServer({
    pages: fileURLToPath(new URL('./pages/', import.meta.url)),
    hostname: process.env.HOST ?? '127.0.0.1', port: Number(process.env.PORT ?? 8080),
});
console.log(`${app.url}/`);
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => { await app.close(); process.exit(0); });

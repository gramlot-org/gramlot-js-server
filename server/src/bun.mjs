/** Reusable Bun bridge; no Python worker and no Node HTTP server. */
import {createDispatch} from './fetch.mjs';

export async function startServer({hostname = '127.0.0.1', port = 0, onError = console.error, ...options} = {}) {
    if (!globalThis.Bun?.serve) throw new Error('The Bun host requires Bun');
    const dispatch = await createDispatch(options);
    const server = Bun.serve({hostname, port, fetch: request => dispatch.fetch(request),
        error(error) { onError(error); return new Response('Internal server error', {status: 500}); },
    });
    return {gramlotServer: dispatch.server, server, url: `http://${hostname}:${server.port}`,
        async close() { dispatch.server.closeAll(); await server.stop(true); },
    };
}

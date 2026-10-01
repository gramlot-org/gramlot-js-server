/** Reusable Bun bridge; no Python worker and no Node HTTP server. */
import {createNativeDispatch} from './native-fetch.mjs';

export async function startNativeServer({hostname = '127.0.0.1', port = 0, onError = console.error, ...options} = {}) {
    if (!globalThis.Bun?.serve) throw new Error('The Bun host requires Bun');
    const dispatch = await createNativeDispatch(options);
    const server = Bun.serve({hostname, port, fetch: request => dispatch.fetch(request),
        error(error) { onError(error); return new Response('Internal server error', {status: 500}); },
    });
    return {host: dispatch.host, server, url: `http://${hostname}:${server.port}`,
        async close() { dispatch.host.pages.clear(); await server.stop(true); },
    };
}

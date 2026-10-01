/** Reusable Node HTTP bridge for the current Gramlot Host protocol. */
import {createServer} from 'node:http';
import {Readable} from 'node:stream';
import {createNativeDispatch} from './native-fetch.mjs';

export async function startNativeServer({hostname = '127.0.0.1', port = 0, onError = console.error, ...options} = {}) {
    const dispatch = await createNativeDispatch(options);
    const server = createServer(async (incoming, outgoing) => {
        try {
            const init = {method: incoming.method, headers: incoming.headers};
            if (!['GET', 'HEAD'].includes(incoming.method)) {
                init.body = Readable.toWeb(incoming);
                init.duplex = 'half';
            }
            const request = new Request(new URL(incoming.url, 'http://localhost'), init);
            const response = await dispatch.fetch(request);
            outgoing.writeHead(response.status, Object.fromEntries(response.headers));
            outgoing.end(incoming.method === 'HEAD' ? undefined : Buffer.from(await response.arrayBuffer()));
        } catch (error) {
            onError(error);
            if (!outgoing.headersSent) outgoing.writeHead(500, {'Content-Type': 'text/plain'});
            outgoing.end('Internal server error');
        }
    });
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(port, hostname, () => { server.off('error', reject); resolve(); });
    });
    return {
        host: dispatch.host, server, url: `http://${hostname}:${server.address().port}`,
        async close() {
            dispatch.host.pages.clear();
            await new Promise((resolve, reject) => {
                server.close(error => error ? reject(error) : resolve());
                server.closeAllConnections();
            });
        },
    };
}

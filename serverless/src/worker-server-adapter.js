import {ServerAdapter} from '@gramlot/gramlot';

/** The server adapter (GC-230 §045) of a page whose server runs in a dedicated Worker. Its transport is the
 * WorkerTransport that opened the page: the page has one Worker and one transport, and the adapter hands the
 * transport to the core. The transport has no synchronous call, which postMessage cannot offer: it declares no
 * `supportsCallSync`, `gramlot.rpc.callSync` throws the core error and a `dataRemote` with `sync` reads
 * asynchronously. */
export class WorkerServerAdapter extends ServerAdapter {
    constructor(transport) {
        super();
        this.transport = transport;
    }

    createTransport() {
        return this.transport;
    }
}

/** Dedicated Worker transport. Owns the Worker and its outstanding requests. */
export class WorkerTransport {
    constructor(worker) {
        this.worker = worker;
        this.pending = new Map();
        this.sequence = 0;
        this.closed = false;
        this.receive = ({data}) => {
            const request = this.pending.get(data.id);
            if (!request) return;
            if (data.error) request.reject(Object.assign(new Error(data.error.message), {name: data.error.name}));
            else request.resolve(data.result);
        };
        this.failed = event => this.dispose(new Error(event.message || 'Worker communication failed'));
        worker.addEventListener('message', this.receive);
        worker.addEventListener('error', this.failed);
        worker.addEventListener('messageerror', this.failed);
    }

    open(signal) { return this.request('open', {}, signal); }
    main(pageId, signal) { return this.request('main', {pageId}, signal); }
    source(pageId, method, params, signal) { return this.request('source', {pageId, method, params}, signal); }

    request(operation, args, signal) {
        if (this.closed) return Promise.reject(new Error('Worker transport is disposed'));
        if (signal?.aborted) return Promise.reject(signal.reason);
        return new Promise((resolve, reject) => {
            const id = ++this.sequence;
            const finish = callback => value => {
                this.pending.delete(id);
                signal?.removeEventListener('abort', abort);
                callback(value);
            };
            const request = {resolve: finish(resolve), reject: finish(reject)};
            const abort = () => request.reject(signal.reason);
            this.pending.set(id, request);
            signal?.addEventListener('abort', abort, {once: true});
            try { this.worker.postMessage({id, operation, args}); }
            catch (error) { request.reject(error); }
        });
    }

    dispose(error = new DOMException('Worker disposed', 'AbortError')) {
        if (this.closed) return;
        this.closed = true;
        for (const request of this.pending.values()) request.reject(error);
        this.worker.removeEventListener('message', this.receive);
        this.worker.removeEventListener('error', this.failed);
        this.worker.removeEventListener('messageerror', this.failed);
        // One Worker owns the entire local host: termination releases all its pages.
        this.worker.terminate();
    }
}

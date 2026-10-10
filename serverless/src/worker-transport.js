/** Dedicated Worker transport (GC-230 Part C). Owns the Worker and its outstanding requests. */
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
            else request.resolve('text' in data ? data.text : data.open);
        };
        this.failed = event => this.dispose(new Error(event.message || 'Worker communication failed'));
        worker.addEventListener('message', this.receive);
        worker.addEventListener('error', this.failed);
        worker.addEventListener('messageerror', this.failed);
    }

    /** The bootstrap data {pageId, title, resources, capabilities} of a new page. */
    open(signal) { return this.request({open: true}, signal); }
    /** Send the request envelope text; resolves with the response envelope text, as HttpTransport. */
    call(text, signal) { return this.request({text}, signal); }
    /** The close message {pageId}, sent without waiting for an answer. */
    close(pageId) {
        if (this.closed) return;
        this.worker.postMessage({pageId});
    }

    request(message, signal) {
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
            try { this.worker.postMessage({id, ...message}); }
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
        // One Worker owns its whole GramlotWorkerServer: termination releases all its pages.
        this.worker.terminate();
    }
}

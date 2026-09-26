import {Gramlot} from '@jsr/genro__gramlot';
import {WorkerTransport} from './worker-transport.js';

/** Own only the stylesheet links introduced by this standalone mount. */
function loadStyles(css, document, signal, assetRoot) {
    if (!css.length) return {ready: Promise.resolve(), dispose() {}};
    let root;
    if (assetRoot != null) {
        if (typeof assetRoot !== 'string' || !assetRoot.endsWith('/')) {
            throw new TypeError('Standalone assetRoot must be an absolute directory URL ending in /');
        }
        root = new URL(assetRoot);
        if (!['file:', 'http:', 'https:'].includes(root.protocol)) {
            throw new TypeError('Standalone assetRoot must use file, http or https');
        }
    }
    const links = css.map(href => {
        if (root) {
            if (!href.startsWith('/') || href.startsWith('//') ||
                href.split('/').some(segment => segment === '.' || segment === '..')) {
                throw new TypeError('Standalone CSS with assetRoot must be root-relative without traversal');
            }
            const resolved = new URL(href.slice(1), root);
            if (!resolved.href.startsWith(root.href)) {
                throw new TypeError('Standalone CSS must remain under assetRoot');
            }
            href = resolved.href;
        }
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        return link;
    });
    let completed = false;
    let pending = links.length;
    let resolveReady, rejectReady;
    const ready = new Promise((resolve, reject) => { resolveReady = resolve; rejectReady = reject; });
    const load = () => { if (--pending === 0) finish(); };
    const error = event => finish(new Error(`Stylesheet failed to load: ${event.target.href}`));
    const abort = () => finish(signal.reason);
    function finish(failure = null) {
        if (completed) return;
        completed = true;
        signal?.removeEventListener('abort', abort);
        for (const link of links) {
            link.removeEventListener('load', load);
            link.removeEventListener('error', error);
        }
        if (failure) rejectReady(failure);
        else resolveReady();
    }
    if (signal?.aborted) finish(signal.reason);
    else {
        signal?.addEventListener('abort', abort, {once: true});
        for (const link of links) {
            link.addEventListener('load', load, {once: true});
            link.addEventListener('error', error, {once: true});
            document.head.append(link);
        }
    }
    return {ready, dispose() {
        if (!completed) finish(new Error('Stylesheet loading stopped'));
        for (const link of links) link.remove();
    }};
}

/** Start one JS Page in a dedicated bundled Worker through the normal main path. */
export async function mount({workerUrl, element = null, rootId = 'gramlot-root',
                             document = globalThis.document, signal, assetRoot = null} = {}) {
    if (!workerUrl) throw new TypeError('Standalone mount requires a Worker URL');
    const transport = new WorkerTransport(new Worker(workerUrl));
    let app, styles;
    const abort = () => { transport.dispose(); app?.dispose(); styles?.dispose(); };
    signal?.addEventListener('abort', abort, {once: true});
    try {
        const {pageId, title, css} = await transport.open(signal);
        signal?.throwIfAborted();
        document.title = title;
        styles = loadStyles(css, document, signal, assetRoot);
        await styles.ready;
        signal?.throwIfAborted();
        app = new Gramlot({pageId, element, rootId, document, transport});
        const dispose = app.dispose.bind(app);
        app.dispose = (...args) => {
            try { return dispose(...args); }
            finally { styles.dispose(); }
        };
        // Match hosted bootstrap: page scripts need the app during Source insertion.
        document.defaultView.gramlot = app;
        await app.start();
        signal?.throwIfAborted();
        return app;
    } catch (error) {
        transport.dispose();
        app?.dispose();
        styles?.dispose();
        throw error;
    } finally {
        signal?.removeEventListener('abort', abort);
    }
}

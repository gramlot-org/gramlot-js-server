import {PageBootstrap} from '@gramlot/gramlot';
import {WorkerTransport} from './worker-transport.js';

function exportRoot(assetRoot) {
    if (assetRoot === null) return null;
    if (typeof assetRoot !== 'string' || !assetRoot.endsWith('/')) {
        throw new TypeError('Standalone assetRoot must be an absolute directory URL ending in /');
    }
    const root = new URL(assetRoot);
    if (!['file:', 'http:', 'https:'].includes(root.protocol)) {
        throw new TypeError('Standalone assetRoot must use file, http or https');
    }
    return root;
}

/** A declared CSS URL for the document; with an export root it must stay under it. */
function styleUrl(href, root) {
    if (!root) return href;
    if (!href.startsWith('/') || href.startsWith('//') ||
        href.split('/').some(segment => segment === '.' || segment === '..')) {
        throw new TypeError('Standalone CSS with assetRoot must be root-relative without traversal');
    }
    const resolved = new URL(href.slice(1), root);
    if (!resolved.href.startsWith(root.href)) {
        throw new TypeError('Standalone CSS must remain under assetRoot');
    }
    return resolved.href;
}

/** The page has no server to close: closing releases its Worker. */
class WorkerBootstrap extends PageBootstrap {
    closePage() { this.config.transport.dispose(); }
}

/** Start one JS Page in a dedicated bundled Worker through PageBootstrap.
 * modules maps each JS resource URL returned by the Worker to the URL the window
 * imports; companion modules never pass through the Worker. */
export async function mount({workerUrl, modules = {}, element = null, rootId = 'gramlot-root',
                             document = globalThis.document, signal, assetRoot = null} = {}) {
    if (!workerUrl) throw new TypeError('Standalone mount requires a Worker URL');
    const root = exportRoot(assetRoot);
    const transport = new WorkerTransport(new Worker(workerUrl));
    const window = document.defaultView;
    const previous = window.gramlot;
    const abort = () => transport.dispose(signal.reason);
    signal?.addEventListener('abort', abort, {once: true});
    try {
        const {pageId, title, resources} = await transport.open(signal);
        document.title = title;
        const bootstrap = new WorkerBootstrap({document, config: {pageId, element, rootId, transport}, resources: {
            css: resources.css.map(href => styleUrl(href, root)),
            js: resources.js.map(({url, group}) => {
                if (!Object.hasOwn(modules, url)) throw new TypeError(`Standalone module not provided: ${url}`);
                return {url: modules[url], group};
            }),
        }});
        const app = await bootstrap.run();
        signal?.throwIfAborted();
        return app;
    } catch (error) {
        // PageBootstrap publishes the app before start; a failed start leaves it behind.
        if (window.gramlot !== previous) window.gramlot.dispose();
        transport.dispose();
        throw error;
    } finally {
        signal?.removeEventListener('abort', abort);
    }
}

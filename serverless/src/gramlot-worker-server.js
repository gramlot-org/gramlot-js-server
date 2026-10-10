import {GramlotServer, PageNotFound} from '@gramlot/gramlot/gramlot-server';

/** One JS Page served inside a dedicated Worker; execution belongs to GramlotServer.
 * logic is the URL that names the page logic module (the page module foo.js or the
 * companion foo_aux.js), or null. The Worker only returns it: the window maps it to the
 * module and imports it there. stylesheet is the URL of the same-name stylesheet foo.css,
 * or null; with inlineCss the document already holds every stylesheet and no CSS URL
 * is returned. */
export class GramlotWorkerServer extends GramlotServer {
    constructor(PageClass, {logic = null, stylesheet = null, inlineCss = false, ...options} = {}) {
        super(options);
        this.PageClass = PageClass;
        this.logic = logic;
        this.stylesheet = stylesheet;
        this.inlineCss = inlineCss;
        this.scope = self;
        this.scope.addEventListener('message', event => this.dispatch(event.data));
    }

    async resolvePage(path) {
        if (path !== '/') throw new PageNotFound(`Page not found: ${path}`);
        if (!Array.isArray(this.PageClass.css) ||
            this.PageClass.css.some(url => typeof url !== 'string')) {
            throw new TypeError('Standalone Page.css must be an array of strings');
        }
        return this.PageClass;
    }

    /** Page.css URLs as written, then the same-name stylesheet and the page logic. */
    async resolveResources(path, PageClass) {
        const css = this.inlineCss ? [] : [...PageClass.css, ...(this.stylesheet === null ? [] : [this.stylesheet])];
        return {css, js: this.logic === null ? [] : [{url: this.logic, group: null}]};
    }

    /** The Worker realisation of GC-230 (Part C): {id, open: true} answers {id, open} with the
     * bootstrap data, {id, text} (a request envelope) answers {id, text} with the response
     * envelope, {pageId} without id closes the page. Failures of the open and InvalidRequest
     * answer {id, error}; every other failure of a call is an outcome inside the envelope. */
    async dispatch(message) {
        const {id} = message;
        if (id === undefined) {
            if (typeof message.pageId !== 'string') throw new TypeError('Unknown Worker message');
            this.closePage(message.pageId);
            return;
        }
        try {
            if (message.open === true) {
                const {pageId, title, resources} = await this.registerPage('/');
                this.scope.postMessage({id, open: {pageId, title, resources, capabilities: this.capabilities}});
            } else if (typeof message.text === 'string') {
                this.scope.postMessage({id, text: await this.call(message.text)});
            } else {
                throw new TypeError('Unknown Worker message');
            }
        } catch (error) {
            this.scope.postMessage({id, error: {name: error.name, message: error.message}});
        }
    }
}

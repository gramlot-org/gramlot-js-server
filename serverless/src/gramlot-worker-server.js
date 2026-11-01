import {fromTytx} from '@genrojs/tytx';
import {GramlotServer, PageNotFound} from '@gramlot/gramlot/gramlot-server';

/** One JS Page served inside a dedicated Worker; execution belongs to GramlotServer.
 * logic is the URL that names the page logic module (the page module foo.js or the
 * companion foo_aux.js), or null. The Worker only returns it: the window maps it to the
 * module and imports it there. stylesheet is the URL of the same-name stylesheet foo.css,
 * or null; with inlineCss the document already holds every stylesheet, the theme included,
 * and no CSS URL is returned. Otherwise the CSS is the theme of the page (themeCss), Page.css
 * and the stylesheet. */
export class GramlotWorkerServer extends GramlotServer {
    constructor(PageClass, {logic = null, stylesheet = null, inlineCss = false, initialData = null, ...options} = {}) {
        super({...options, uploadsEnabled:true});
        this.PageClass = PageClass;
        this.initialData = initialData;
        this.logic = logic;
        this.stylesheet = stylesheet;
        this.inlineCss = inlineCss;
        this.scope = self;
        this.scope.addEventListener('message', event => this.dispatch(event.data));
    }

    get capabilities() { return [...super.capabilities, 'upload']; }

    /** The CSS URL of the theme of the page: none with inlineCss, where the document already holds it. */
    themeCss(PageClass) {
        return this.inlineCss ? [] : super.themeCss(PageClass);
    }

    async resolvePage(path) {
        if (path !== '/') throw new PageNotFound(`Page not found: ${path}`);
        if (!Array.isArray(this.PageClass.css) ||
            this.PageClass.css.some(url => typeof url !== 'string')) {
            throw new TypeError('Standalone Page.css must be an array of strings');
        }
        return this.PageClass;
    }

    async resolveData(path) {
        return this.initialData === null ? null : fromTytx(this.initialData);
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
                const registered = await this.registerPage('/');
                this.scope.postMessage({id, open: {...registered, capabilities: this.capabilities}});
            } else if (message.upload) {
                const {pageId, transferId, authorization, file} = message.upload;
                if (!(file instanceof Blob)) throw new TypeError('Upload must contain a File');
                const transfer = this.admitUpload({pageId, transferId, authorization});
                try {
                    if (file.size !== transfer.size) throw new RangeError('Upload size does not match declaration');
                    const chunkSize = 256 * 1024;
                    for (let offset = 0; offset < file.size; offset += chunkSize) {
                        const bytes = new Uint8Array(await file.slice(offset, offset + chunkSize).arrayBuffer());
                        await transfer.write(bytes);
                        this.uploads.touch(transferId, pageId, null);
                        this.scope.postMessage({id, progress: offset + bytes.byteLength});
                    }
                    this.scope.postMessage({id, outcome:await transfer.finish()});
                } catch (error) {
                    try { await transfer.abort(); } catch {}
                    throw error;
                }
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

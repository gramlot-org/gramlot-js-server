import {Host, PageNotFound} from '@gramlot/gramlot/host';

/** One JS Page hosted inside a dedicated Worker; execution belongs to Host.
 * aux is the URL that names the page companion (foo_aux.js), or null. The Worker
 * only returns it: the window maps it to the module and imports it there. */
export class WorkerHost extends Host {
    constructor(PageClass, {aux = null, ...options} = {}) {
        super(options);
        this.PageClass = PageClass;
        this.aux = aux;
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

    /** Page.css URLs as written, then the companion. */
    async resolveResources(path, PageClass) {
        return {css: [...PageClass.css], js: this.aux === null ? [] : [{url: this.aux, group: null}]};
    }

    async dispatch({id, operation, args}) {
        try {
            let result;
            switch (operation) {
                case 'open': result = await this.registerPage('/'); break;
                case 'main': result = await this.main(args.pageId); break;
                case 'source': result = await this.source(args.pageId, args.method, args.params); break;
                default: throw new TypeError(`Unknown Worker operation: ${operation}`);
            }
            this.scope.postMessage({id, result});
        } catch (error) {
            this.scope.postMessage({id, error: {name: error.name, message: error.message}});
        }
    }
}

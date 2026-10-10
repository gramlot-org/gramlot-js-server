// CI fixture for Source methods answered by the Worker (envelope `contentType: 'source'`), not an example of the page-writing API.
import {Page as BasePage} from '@gramlot/gramlot/page';
export class Page extends BasePage {
    static title = 'Worker Source';
    main(root) { root.h1('Hello Worker'); root.section(null, {id: 'details'}).p('Initial'); }
    details(root, {text}) { root.p(text); }
}
Page.registerSource('details');

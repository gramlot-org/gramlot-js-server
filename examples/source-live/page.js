import {Page as BasePage, source} from '@gramlot/gramlot/page';
export class Page extends BasePage {
    static title = 'Worker Source';
    main(root) { root.h1('Hello Worker'); root.section(null, {id: 'details'}).p('Initial'); }
    details(root, {text}) { root.p(text); }
}
source(Page.prototype.details);

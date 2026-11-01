import {Page as BasePage} from '@gramlot/gramlot/page';
import {collections} from '@gramlot/gramlot-examples/gallery/collections.js';
export class Page extends BasePage {
    static gramlots = collections.filter(({name}) => ['inputs','layout','editors'].includes(name));
    main(root) { root.p('No Markdown requested'); }
}

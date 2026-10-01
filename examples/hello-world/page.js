import {Page as BasePage} from '@gramlot/gramlot/page';
export class Page extends BasePage {
    static title = 'Hello World';
    main(root) { root.h1('Hello World'); }
}

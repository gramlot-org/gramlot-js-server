import {Page as BasePage} from '@jsr/genro__gramlot/page';
export class Page extends BasePage {
    static title = 'Hello World';
    main(root) { root.h1('Hello World'); }
}

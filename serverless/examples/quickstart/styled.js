import {Page as Hello} from './page.js';

/** The quick-start page with a stylesheet, for the directory export: Page.css is a
 * root-relative URL resolved inside the exported directory. The logic is the one of
 * page.js, exported again by this page module. */
export {Logic} from './page.js';

export class Page extends Hello {
    static css = ['/theme.css'];
}

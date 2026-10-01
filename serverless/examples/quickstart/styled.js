import {Page as Hello} from './page.js';

/** The quick-start page with a stylesheet, for the directory export: Page.css is a
 * root-relative URL resolved inside the exported directory. */
export class Page extends Hello {
    static css = ['/theme.css'];
}

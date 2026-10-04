import {Page as BasePage} from '@gramlot/gramlot/page';

/** The first page of the site: a menu and some text. Change it as any other page.
 * Each file of this folder is a page: registration.js is the page registration/. */
export class Page extends BasePage {
    static title = 'My site';
    static css = ['/themes/gramlot-base/theme.css', '/site.css'];

    main(root) {
        const menu = root.nav({class: 'menu', 'aria-label': 'Pages'});
        menu.a('Home', {href: 'index.html', aria_current: 'page'});
        menu.a('Registration', {href: 'registration/index.html'});
        root.h1('My site');
        root.p('This site opens from a folder, from a static host or from npm start.');
    }
}

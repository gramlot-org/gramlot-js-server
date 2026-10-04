import {Page as BasePage} from '@gramlot/gramlot/page';

/** One module with Page and Logic, the core theme, a stylesheet of the folder and page.css. */
export class Page extends BasePage {
    static title = 'Page module';
    static css = ['/themes/gramlot-base/theme.css', '/local.css'];

    main(root) {
        root.div('^pronto', {id: 'pronto'});
        root.dataFormula({result_path: 'pronto', func: 'prepara', base: '=base', _init: true});
        root.dataSetter({destination_path: 'base', value: 'ok'});
    }
}

/** Every call is counted on globalThis.gramlotModuleSentinel. */
export class Logic {
    prepara(kwargs) {
        globalThis.gramlotModuleSentinel = (globalThis.gramlotModuleSentinel ?? 0) + 1;
        return `${kwargs.base}: ${kwargs._reason}`;
    }
}

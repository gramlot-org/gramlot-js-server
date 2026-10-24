import {Page as BasePage} from '@gramlot/gramlot/page';

export class Page extends BasePage {
    static title = 'Provider fixture';
    main(root) {
        root.div('^pronto', {id: 'pronto'});
        root.dataFormula({result_path: 'pronto', func: 'prepara', base: '=base', _init: true});
        root.dataSetter({destination_path: 'base', value: 'ok'});
    }
}

export class Logic {
    prepara(kwargs) {
        globalThis.gramlotSentinel = (globalThis.gramlotSentinel ?? 0) + 1;
        return `${kwargs.base}: ${kwargs._reason}`;
    }
}

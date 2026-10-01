import {Page as BasePage} from '@gramlot/gramlot/page';

/** A page whose formula runs the named logic of its companion page_aux.js. */
export class Page extends BasePage {
    static title = 'Companion';

    main(root) {
        root.div('^pronto', {id: 'pronto'});
        root.dataFormula({result_path: 'pronto', func: 'prepara', base: '=base', _init: true});
        root.dataSetter({destination_path: 'base', value: 'ok'});
    }
}

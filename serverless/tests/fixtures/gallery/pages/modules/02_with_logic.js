import {Page as BasePage} from '@gramlot/gramlot/page';

/** A page module with Logic: the gallery writes its companion, which names Logic. */
export class Page extends BasePage {
    static title = 'With Logic';

    main(root) {
        root.div('^result', {id: 'result'});
        root.dataFormula({result_path: 'result', func: 'twice', base: '=base', _init: true});
        root.dataSetter({destination_path: 'base', value: 'ok'});
    }
}

export class Logic {
    twice(kwargs) {
        return `${kwargs.base}${kwargs.base}`;
    }
}

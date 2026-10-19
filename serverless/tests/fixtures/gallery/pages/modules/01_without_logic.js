import {Page as BasePage, createDecimal} from '@gramlot/gramlot/page';

/** A page module without Logic that imports a name the core of the window does not export: it must stay out of the window. */
export class Page extends BasePage {
    static title = 'Without Logic';

    main(root) {
        root.div('^amount', {id: 'amount'});
        root.dataSetter({destination_path: 'amount', value: createDecimal('1.50')});
    }
}

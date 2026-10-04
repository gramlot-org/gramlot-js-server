import {Page as BasePage} from '@gramlot/gramlot/page';

/** The Gramlot family example (core guide GC-055) for the export without a server:
 * one module, Page builds the page and Logic holds the greeting, which runs in the
 * window. */
export class Page extends BasePage {
    static title = 'Hello';

    main(root) {
        const pane = root.div({datapath: 'person'});
        pane.html_label('Name', {for: 'name'});
        pane.input({id: 'name', value: '^.name', live: true});
        pane.p('^.greeting', {id: 'greeting'});
        pane.dataFormula({result_path: '.greeting', func: 'greeting', name: '^.name', _init: true});
        pane.dataSetter({destination_path: '.name', value: 'Ada'});
    }
}

export class Logic {
    greeting(kwargs) { return `Hello, ${kwargs.name}`; }
}

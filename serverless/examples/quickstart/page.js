import {Page as BasePage} from '@gramlot/gramlot/page';

/** The Gramlot family example (core guide GC-055) for the standalone export:
 * the greeting is a named method of the companion page_aux.js, because the
 * single-file export runs under a strict Content Security Policy. */
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

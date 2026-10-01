import {Page as BasePage} from '@gramlot/native-html/page';

export class Page extends BasePage {
    static title = 'Hello';

    main(root) {
        const pane = root.div({datapath: 'person'});
        pane.html_label('Name', {for: 'name'});
        pane.input({id: 'name', value: '^.name', live: true});
        pane.p('^.greeting');
        pane.dataFormula({result_path: '.greeting', func: 'greeting', name: '^.name', _init: true});
        pane.dataSetter({destination_path: '.name', value: 'Ada'});
    }
}

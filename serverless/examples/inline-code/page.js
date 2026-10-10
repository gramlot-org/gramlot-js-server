// CI fixture for Source methods answered by the Worker (envelope `contentType: 'source'`), not an example of the page-writing API.
import {Page as BasePage} from '@gramlot/gramlot/page';
export class Page extends BasePage {
    static title = 'Inline Code';
    main(root) {
        root.h1('Hello Inline');
        root.dataFormula({result_path: 'doubled', formula: 'a * 2', a: '^a', _if: 'a > 0', _else: '-1'});
        root.dataController({script: 'this.SET("next", a + 1)', a: '^a'});
        root.p('==a * 10', {id: 'expression', title: '==a + 100', a: '^a'});
        root.button('Go', {id: 'go', action: 'this.SET("clicked", "action")'});
        root.span('Here', {id: 'span', connect_onclick: 'this.SET("connected", event.type)'});
        root.section(null, {id: 'details'});
    }
    details(root, {text}) {
        root.dataFormula({result_path: 'remote', formula: 'b + "!"', b: '^b'});
        root.p(text);
    }
}
Page.registerSource('details');

// The page that checkProtocol (GC-230 §150) needs: the fragment and the endpoints of the core fixture.
import {Page as BasePage} from '@gramlot/gramlot/page';

export class Page extends BasePage {
    static title = 'Contract fixture';

    main(root) { root.h1('Contract fixture'); }
    check_fragment(root, {text = 'check'} = {}) { root.span(text); }
    check_endpoint({value}) { return value; }
    check_endpoint_auth() { return 'allowed'; }
    check_endpoint_raise() { throw new Error('check'); }
}
Page.registerSource('check_fragment');
Page.registerEndpoint('check_endpoint');
Page.registerEndpoint('check_endpoint_auth', {auth: 'admin'});
Page.registerEndpoint('check_endpoint_raise');

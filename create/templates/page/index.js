import {Page as BasePage} from '@gramlot/gramlot/page';

/** One page, one module: Page builds the page, Logic holds the methods it calls in the browser.
 * The data typed in the form live under the path `modulo` and leave the browser only through
 * the buttons of gramlot.inout. */
export class Page extends BasePage {
    static title = 'Registration';
    static css = ['/themes/gramlot-base/theme.css'];

    main(root) {
        root.h1('Registration');
        const form = root.div({datapath: 'modulo'});
        form.html_label('Name', {for: 'name'});
        form.input({id: 'name', value: '^.name', live: true});
        form.html_label('Email', {for: 'email'});
        form.input({id: 'email', type: 'email', value: '^.email', live: true});
        form.p('^.summary', {id: 'summary'});
        form.dataFormula({result_path: '.summary', func: 'summary', name: '^.name', email: '^.email', _init: true});

        const buttons = root.div({id: 'buttons'});
        buttons.button('Send by email', {id: 'send',
            action: "gramlot.inout.sendMail('modulo', 'office@example.org')"});
        buttons.button('Save', {id: 'save', action: "gramlot.inout.save('modulo', 'registration.json')"});
        buttons.button('Reload a saved file', {id: 'restore', action: "gramlot.inout.restore('modulo')"});
        buttons.button('Download JSON', {id: 'download',
            action: "gramlot.inout.download('modulo', 'registration.json', 'json')"});
    }
}

export class Logic {
    /** A formula method receives the resolved parameters and returns the result. */
    summary(kwargs) {
        if (!kwargs.name) return 'Type your name.';
        return kwargs.email ? `${kwargs.name} <${kwargs.email}>` : `${kwargs.name}, now your email.`;
    }
}

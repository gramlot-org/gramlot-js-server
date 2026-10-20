import {Bag, createDecimal, Page as BasePage} from '@gramlot/gramlot/page';

/** One module with Page and Logic whose Logic authors the typed literals Bag and createDecimal, the names the
 * core exports at @gramlot/gramlot/page beside Page. */
export class Page extends BasePage {
    static title = 'Typed literals';

    main(root) {
        root.div('^sum', {id: 'sum'});
        root.dataFormula({result_path: 'sum', func: 'sum', _init: true});
    }
}

/** Every call is counted on globalThis.gramlotTypedSentinel. A Decimal adds 0.1 and 0.2 to exactly 0.3. */
export class Logic {
    sum() {
        globalThis.gramlotTypedSentinel = (globalThis.gramlotTypedSentinel ?? 0) + 1;
        const bag = new Bag();
        bag.setItem('sum', createDecimal('0.1').plus(createDecimal('0.2')));
        return `${bag.getItem('sum')}`;
    }
}

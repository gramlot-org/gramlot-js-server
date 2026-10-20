import {Page as BasePage} from '@gramlot/gramlot/page';

/** A page module without Logic: the gallery companion must still link. */
export class Page extends BasePage {
    static title = 'Without Logic';

    main(root) {
        root.h1('Without Logic', {id: 'title'});
    }
}

# 110 · Tutorial

Document ID: **GS-110**.

[Paired view](../docs_llm/110-tutorial.md).

Every step below is run by `tests/quickstart.test.js` and by
`scripts/verify_quickstart_browser.mjs` in headless Chromium; the files are in
`examples/quickstart/`.

<a id="gs-110-005"></a>

## 005 · Folder layout

Block ID: **GS-110-005**.

Clone the repository and install the released core from the registry:

```sh
git clone https://github.com/gramlot-org/gramlot-serverless.git
cd gramlot-serverless
npm install
```

A page is one JavaScript module with its companion beside it. The tutorial uses
`examples/quickstart/`:

```text
examples/quickstart/
├── page.js          the Page
├── page_aux.js      its companion: named logic for the window
├── styled.js        the same page with a stylesheet, for the directory export
├── styled_aux.js    the companion of styled.js
├── theme.css        the stylesheet
└── export.mjs       the directory export script
```

<a id="gs-110-010"></a>

## 010 · The page

Block ID: **GS-110-010**.

`page.js` is the example of [The Gramlot family](https://gramlot.readthedocs.io/en/latest/docs/public/055-family.html)
in JavaScript. Data-elements take one object; the greeting is a named method of
the companion, because the single-file export allows no inline code:

```javascript
import {Page as BasePage} from '@gramlot/gramlot/page';

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
```

`value: '^.name'` binds the field to `person.name`; `live: true` writes at every
keystroke. The paragraph follows `person.greeting`, which the formula computes
from `name`. The setter gives `Ada` as the initial value.

<a id="gs-110-015"></a>

## 015 · The companion

Block ID: **GS-110-015**.

`page_aux.js` exports `class Logic`. `func: 'greeting'` in the page names its
method; a formula method receives the resolved parameters and returns the value:

```javascript
export class Logic {
    greeting(kwargs) { return `Hello, ${kwargs.name}`; }
}
```

The exporter finds the companion by name: `page.js` pairs with `page_aux.js` in
the same folder. It is bundled for the window only.

<a id="gs-110-020"></a>

## 020 · Build one file and open it

Block ID: **GS-110-020**.

```sh
node src/cli.js build examples/quickstart/page.js -o build/hello.html
```

Output of the run:

```text
Built /…/gramlot-serverless/build/hello.html: 2113423 bytes, sha256 72fb5c76…
```

Open `build/hello.html` in the browser (double-click, or `file://…/build/hello.html`).
The page shows a field with `Ada` and the text `Hello, Ada`. Typing `Grace` in the
field changes the text to `Hello, Grace` at every keystroke. The browser makes no
network request: the file is complete.

<a id="gs-110-025"></a>

## 025 · Add a stylesheet: the directory export

Block ID: **GS-110-025**.

The single file carries no external stylesheet: its Content Security Policy allows
inline styles only (`style` attributes). A stylesheet needs the directory export.
`styled.js` reuses the page and declares `Page.css` with a root-relative URL;
`styled_aux.js` re-exports the companion, because the companion is found by the
page's name:

```javascript
// styled.js
import {Page as Hello} from './page.js';
export class Page extends Hello {
    static css = ['/theme.css'];
}
```

```javascript
// styled_aux.js
export {Logic} from './page_aux.js';
```

`export.mjs` calls `buildDirectory` with the page and the asset to copy:

```javascript
import {resolve} from 'node:path';
import {buildDirectory} from '../../src/build-directory.js';

const output = resolve(process.argv[2] ?? 'build/site');
const here = import.meta.dirname;
const result = await buildDirectory({
    pages: {index: resolve(here, 'styled.js')},
    output,
    assets: [{source: resolve(here, 'theme.css'), target: 'theme.css'}],
});
console.log(`Exported ${result.routes.join(', ')} to ${result.output}`);
```

```sh
node examples/quickstart/export.mjs build/site
```

Output of the run, and the directory it writes:

```text
Exported index to /…/gramlot-serverless/build/site
build/site/
├── index.html
├── theme.css
└── assets/
    ├── standalone.js
    ├── runtime-notices.json
    └── workers/index.js
```

Open `build/site/index.html`. The greeting is now navy and larger: `/theme.css`
was resolved inside the exported directory. The output directory must not exist
before the run.

<a id="gs-110-030"></a>

## 030 · What to read next

Block ID: **GS-110-030**.

- [Writing pages for this host](115-writing-pages.md): layout, companions,
  `Page.css`, Source methods, what the bundle accepts.
- [Configuration](120-configuration.md): every option of `build`, `buildDirectory`
  and `mount`, and the Content Security Policy of the export.
- The core guide [Writing pages](https://gramlot.readthedocs.io/en/latest/docs/public/095-writing-pages.html)
  for pointers, setters, formulas, controllers and events.

# 110 · Tutorial

Document ID: **GS-110**.

[Paired view](../docs/110-tutorial.md).

Run by `tests/quickstart.test.js` and `scripts/verify_quickstart_browser.mjs`
(headless Chromium); files in `examples/quickstart/`.

<a id="gs-110-005"></a>

## 005 · Folder layout

Block ID: **GS-110-005**.

```sh
git clone https://github.com/gramlot-org/gramlot-serverless.git
cd gramlot-serverless
npm install
```

`examples/quickstart/`: `page.js` (the Page), `page_aux.js` (companion),
`styled.js` and `styled_aux.js` (the page with a stylesheet), `theme.css`,
`export.mjs` (directory export).

<a id="gs-110-010"></a>

## 010 · The page

Block ID: **GS-110-010**.

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

`^.name` binds the field; `live: true` writes at every keystroke; the formula
names a companion method; the setter gives `Ada`.

<a id="gs-110-015"></a>

## 015 · The companion

Block ID: **GS-110-015**.

`page_aux.js`, found by name beside `page.js`, bundled for the window only:

```javascript
export class Logic {
    greeting(kwargs) { return `Hello, ${kwargs.name}`; }
}
```

<a id="gs-110-020"></a>

## 020 · Build one file and open it

Block ID: **GS-110-020**.

```sh
node src/cli.js build examples/quickstart/page.js -o build/hello.html
```

`Built /…/build/hello.html: 2113423 bytes, sha256 72fb5c76…`. Open the file: a
field with `Ada` and `Hello, Ada`; typing `Grace` gives `Hello, Grace` at every
keystroke. No network request.

<a id="gs-110-025"></a>

## 025 · Add a stylesheet: the directory export

Block ID: **GS-110-025**.

The single file allows inline styles only. `styled.js` extends the page with
`static css = ['/theme.css']`; `styled_aux.js` does `export {Logic} from
'./page_aux.js'` (the companion is found by the page's name). `export.mjs` calls
`buildDirectory({pages: {index: styled.js}, output, assets: [{source: theme.css,
target: 'theme.css'}]})`:

```sh
node examples/quickstart/export.mjs build/site
```

Writes `build/site/index.html`, `theme.css`, `assets/standalone.js`,
`assets/runtime-notices.json`, `assets/workers/index.js`. Open `index.html`: the
greeting is navy and larger. The output directory must not exist before the run.

<a id="gs-110-030"></a>

## 030 · What to read next

Block ID: **GS-110-030**.

[Writing pages for this host](115-writing-pages.md), [Configuration](120-configuration.md),
the core [Writing pages](https://gramlot.readthedocs.io/en/latest/docs/public/095-writing-pages.html).

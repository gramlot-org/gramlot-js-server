# 110 · Tutorial

Document ID: **GS-110**.

[Paired view](../docs/110-tutorial.md).

Run by `serverless/tests/quickstart.test.js` and `serverless/scripts/verify_quickstart_browser.mjs`
(headless Chromium); files in `serverless/examples/quickstart/`. New project:
[No server: a tutorial](135-serverless-tutorial.md).

<a id="gs-110-005"></a>

## 005 · Folder layout

Block ID: **GS-110-005**.

```sh
git clone https://github.com/gramlot-org/gramlot-js-server.git
cd gramlot-js-server
npm install
cd serverless
```

`serverless/examples/quickstart/`: `page.js` (Page and Logic), `styled.js` (the
page with a stylesheet), `theme.css`, `export.mjs` (directory export).

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

export class Logic {
    greeting(kwargs) { return `Hello, ${kwargs.name}`; }
}
```

`^.name` binds the field; `live: true` writes at every keystroke; the formula
names a `Logic` method; the setter gives `Ada`.

<a id="gs-110-015"></a>

## 015 · The Logic

Block ID: **GS-110-015**.

`func: 'greeting'` → `Logic.greeting`; `main` in the Worker, `Logic` in the window.
`page_aux.js` exporting `Logic` still admitted; both → error. Inline code runs too
([Configuration](120-configuration.md)).

<a id="gs-110-020"></a>

## 020 · Build one file and open it

Block ID: **GS-110-020**.

```sh
node src/cli.js build examples/quickstart/page.js -o build/hello.html
```

`Built /…/build/hello.html: 1810845 bytes, sha256 60ed0801…` (2026-10-04). Open the
file: a field with `Ada` and `Hello, Ada`; typing `Grace` gives `Hello, Grace` at
every keystroke. No network request. In a project: `npx gramlot-serverless build`.

<a id="gs-110-025"></a>

## 025 · Add a stylesheet

Block ID: **GS-110-025**.

`styled.js`: `export {Logic} from './page.js'` and a `Page` with
`static css = ['/theme.css']`. One file: `build styled.js -o styled.html` writes
`theme.css` as `<style>`. Directory: `export.mjs` calls
`buildDirectory({pages: {index: styled.js}, output, assets: [{source: theme.css,
target: 'theme.css'}]})`:

```sh
node examples/quickstart/export.mjs build/site
```

Writes `build/site/index.html`, `theme.css`, `assets/standalone.js`,
`assets/runtime-notices.json`, `assets/workers/index.js`. Open `index.html`: the
greeting is navy and larger. A second run replaces a previous export; other
paths are refused. Folder of pages: `gramlot-serverless build pages -o dist`.

<a id="gs-110-030"></a>

## 030 · What to read next

Block ID: **GS-110-030**.

[No server: a tutorial](135-serverless-tutorial.md), [Writing pages for this host](115-writing-pages.md),
[Configuration](120-configuration.md), the core [Writing pages](https://gramlot.readthedocs.io/en/latest/docs/public/095-writing-pages.html).

# 010 · Tutorial

Document ID: **GN-110**. [Concise mirror](../docs_llm/010-tutorial.md).

This tutorial builds the page of the README quick start step by step. Every step
was run with Node.js and verified in Chromium; the page is also executed by the
test `test/quickstart.test.mjs` of this repository in CI.

<a id="gn-110-005"></a>

## 005 · Folder layout

Block ID: **GN-110-005**.

Gramlot 0.2.0 is released, but the core's npm package `@gramlot/gramlot` is
not published on any registry. The application links a core checkout and this
adapter, both placed beside it:

```sh
mkdir hello && cd hello
printf '{"name":"hello","private":true,"type":"module"}\n' > package.json
npm install --no-save ../gramlot/js ../gramlot-js-server
mkdir pages
```

The result is this layout. `pages/` holds the trusted Page modules and their
companions; nothing else in the application is reachable from the browser.

```text
hello/
  package.json
  serve.mjs
  pages/
    index.js        the page served at /
    index_aux.js    its named logic
    index.css       its stylesheet
  node_modules/
    @gramlot/gramlot -> ../gramlot/js
    gramlot-js-server    -> ../gramlot-js-server
```

<a id="gn-110-010"></a>

## 010 · The page file

Block ID: **GN-110-010**.

`pages/index.js` exports a class `Page`. `main(root)` builds the interface by
calling element methods on `root`. Attributes go in one object, after the text.

```js
import {Page as BasePage} from '@gramlot/gramlot/page';

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
```

- `datapath: 'person'` makes every relative path of the branch start at `person`.
- `value: '^.name'` binds the field to `person.name` in both directions;
  `live: true` writes the Data at every keystroke instead of on `change`.
- `'^.greeting'` as the text of `p` shows `person.greeting` and follows it.
- `dataFormula` computes `.greeting` with the named method `greeting` each time
  `name` changes; `_init: true` runs it once before the DOM is built.
- `dataSetter` writes the initial value `Ada`.

[Writing pages](https://gramlot.readthedocs.io/en/latest/docs/public/095-writing-pages.html)
in the core documentation explains every declaration.

<a id="gn-110-015"></a>

## 015 · The companion with one named method

Block ID: **GN-110-015**.

`pages/index_aux.js` is the companion of `index.js`: a module exporting a class
`Logic`. Its methods are the named logic of the page; `func: 'greeting'` in the
page names the method below. A formula method receives the resolved parameters
and returns the value.

```js
export class Logic {
    greeting(kwargs) { return 'Hello, ' + kwargs.name; }
}
```

The companion runs in the browser, so it is public. Server-only code belongs in
modules the companion does not import.

<a id="gn-110-020"></a>

## 020 · The page stylesheet

Block ID: **GN-110-020**.

`pages/index.css` is served with the page because it carries the page's name.

```css
body { font-family: sans-serif; margin: 2rem; }
```

A stylesheet shared by several pages is declared in `static css = ['/themes/base.css']`
and placed below the pages folder, or served by the application from elsewhere
([Writing pages for this host](015-writing-pages.md)).

<a id="gn-110-025"></a>

## 025 · Running it

Block ID: **GN-110-025**.

`serve.mjs` starts the adapter on the pages folder.

```js
import {fileURLToPath} from 'node:url';
import {startNativeServer} from 'gramlot-js-server/native';

const app = await startNativeServer({pages: fileURLToPath(new URL('./pages/', import.meta.url)), port: 8080});
console.log(app.url);
```

```sh
node serve.mjs
```

The command prints `http://127.0.0.1:8080`. On Bun, import from
`gramlot-js-server/bun` and run `bun serve.mjs`. The bootstrap document of `/`
lists the resources the adapter found beside the page:

```sh
curl -s http://127.0.0.1:8080/
```

```text
"resources":{"css":["/index.css"],"js":[{"url":"/index_aux.js","group":null}]}
```

<a id="gn-110-030"></a>

## 030 · What changes when typing

Block ID: **GN-110-030**.

Open `http://127.0.0.1:8080/` in a browser. The page shows the label `Name`, a
field with `Ada` and the text `Hello, Ada`; the body uses the sans-serif font of
`index.css`. Type `Grace` in the field: the text changes to `Hello, Grace` at
every keystroke. The field writes `person.name`; the formula recomputes
`person.greeting`; the paragraph follows it. No application code touches the DOM.

Verified on 2026-10-01 with Playwright Chromium 153: field `Ada`, text `Hello, Ada`,
after `fill('#name', 'Grace')` the text `Hello, Grace`, no console errors.

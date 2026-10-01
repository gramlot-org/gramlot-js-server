# 010 · Tutorial

Document ID: **GN-110**. [Expanded version](../docs/010-tutorial.md).

The README quick start step by step; run with Node.js, verified in Chromium,
executed by `server/test/quickstart.test.mjs` in CI.

<a id="gn-110-005"></a>

## 005 · Folder layout

Block ID: **GN-110-005**.

Install the core and the adapter from npm.

```sh
mkdir hello && cd hello
printf '{"name":"hello","private":true,"type":"module"}\n' > package.json
npm install @gramlot/gramlot @gramlot/gramlot-js-server
mkdir pages
```

`pages/index.js`, `pages/index_aux.js`, `pages/index.css`, `serve.mjs`.

<a id="gn-110-010"></a>

## 010 · The page file

Block ID: **GN-110-010**.

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

`^.name` binds both ways under `person`; `live: true` writes per keystroke;
`dataFormula` calls the named method `greeting`, `_init` once before the DOM;
`dataSetter` sets `Ada`. Details: [Writing pages](https://gramlot.readthedocs.io/en/latest/docs/public/095-writing-pages.html).

<a id="gn-110-015"></a>

## 015 · The companion with one named method

Block ID: **GN-110-015**.

`pages/index_aux.js`, public in the browser:

```js
export class Logic {
    greeting(kwargs) { return 'Hello, ' + kwargs.name; }
}
```

<a id="gn-110-020"></a>

## 020 · The page stylesheet

Block ID: **GN-110-020**.

`pages/index.css` is served with the page by name:

```css
body { font-family: sans-serif; margin: 2rem; }
```

<a id="gn-110-025"></a>

## 025 · Running it

Block ID: **GN-110-025**.

```js
import {fileURLToPath} from 'node:url';
import {startServer} from '@gramlot/gramlot-js-server/node';

const app = await startServer({pages: fileURLToPath(new URL('./pages/', import.meta.url)), port: 8080});
console.log(app.url);
```

`node serve.mjs` prints `http://127.0.0.1:8080`; Bun: import from
`@gramlot/gramlot-js-server/bun`, `bun serve.mjs`. `curl -s http://127.0.0.1:8080/` shows
`"resources":{"css":["/index.css"],"js":[{"url":"/index_aux.js","group":null}]}`.

<a id="gn-110-030"></a>

## 030 · What changes when typing

Block ID: **GN-110-030**.

The page shows `Name`, a field with `Ada` and `Hello, Ada` in sans-serif. Typing
`Grace` gives `Hello, Grace` at every keystroke: field → `person.name` → formula
→ `person.greeting` → paragraph. Verified 2026-10-01, Playwright Chromium 153,
no console errors.

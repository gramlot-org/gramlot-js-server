# 010 · Tutorial

Document ID: **GN-110**. [Concise mirror](../docs_llm/010-tutorial.md).

This tutorial builds the page of the README quick start step by step. Every step
was run with Node.js and verified in Chromium; the page is also executed by the
test `server/test/quickstart.test.mjs` of this repository in CI.
`npm create @gramlot site my-site` writes a project with the same layout and the
scripts `npm start` and `npm run start:bun` ([@gramlot/create](https://www.npmjs.com/package/@gramlot/create)).

This tutorial follows the host's runnable fixture, including its named Logic
formula and explicit initial `dataSetter`. To learn the smallest field-and-binding
example first, use [Your first page](https://gramlot.readthedocs.io/en/latest/docs/public/018-quickstart.html).
In an application, use `default` for interface preferences and loaded Data for
records; a setter is not required for every field.

<a id="gn-110-005"></a>

## 005 · Folder layout

Block ID: **GN-110-005**.

The application installs the core `@gramlot/gramlot` and this adapter from npm:

```sh
mkdir hello && cd hello
printf '{"name":"hello","private":true,"type":"module"}\n' > package.json
npm install @gramlot/gramlot @gramlot/gramlot-js-server
mkdir pages
```

The result is this layout. `pages/` holds the trusted Page modules and their
stylesheets; of the application, only its `.js` and `.css` files are reachable
from the browser.

```text
hello/
  package.json
  serve.mjs
  pages/
    index.js        the page served at /, with its Logic
    index.css       its stylesheet
  node_modules/
    @gramlot/gramlot
    @gramlot/gramlot-js-server
```

<a id="gn-110-010"></a>

## 010 · The page file

Block ID: **GN-110-010**.

`pages/index.js` exports a class `Page` and a class `Logic`. `main(root)` builds
the interface by calling element methods on `root`. Attributes go in one object,
after the text.

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

export class Logic {
    greeting(kwargs) { return 'Hello, ' + kwargs.name; }
}
```

- `datapath: 'person'` makes every relative path of the branch start at `person`.
- `value: '^.name'` binds the field to `person.name` in both directions;
  `live: true` writes the Data at every keystroke instead of on `change`.
- `'^.greeting'` as the text of `p` shows `person.greeting` and follows it.
- `dataFormula` computes `.greeting` with the named method `greeting` each time
  `name` changes; `_init: true` runs it once before the DOM is built.
- `dataSetter` writes the initial value `Ada`.

[Writing pages](https://gramlot.readthedocs.io/en/latest/docs/public/095-writing-pages.html) and
[Data binding and controllers](https://gramlot.readthedocs.io/en/latest/docs/public/097-data-binding.html) in the core documentation
explain every element and declaration.

<a id="gn-110-015"></a>

## 015 · The Logic of the page

Block ID: **GN-110-015**.

The methods of `Logic` are the named logic of the page; `func: 'greeting'` names
the method `greeting`. A formula method receives the resolved parameters and
returns the value. `main` runs on the server; `Logic` runs in the browser.

The browser imports the page module for its `Logic`, so the module is public and
every import of it resolves in the browser: `@gramlot/gramlot/page` resolves to the
runtime through the import map of the bootstrap. Server-only code belongs in
modules the page module does not import. A separate `index_aux.js` exporting
`Logic` is also admitted, for a page with server-only imports; a page module
that exports `Logic` and an `index_aux.js` beside it are an error. `Logic` is
optional: a page without named logic needs no class.

<a id="gn-110-020"></a>

## 020 · The page stylesheet

Block ID: **GN-110-020**.

`pages/index.css` is served with the page because it carries the page's name.

```css
body { font-family: sans-serif; margin: 2rem; }
```

A stylesheet shared by several pages is declared in `static css = ['/site.css']`
and placed below the pages folder. The core theme needs no declaration: the
server loads the base theme `gramlot-base` before the stylesheets of every page,
and the adapter serves it from the installed core
([Writing pages for this host](015-writing-pages.md)).

<a id="gn-110-025"></a>

## 025 · Running it

Block ID: **GN-110-025**.

`serve.mjs` starts the adapter on the pages folder.

```js
import {fileURLToPath} from 'node:url';
import {startServer} from '@gramlot/gramlot-js-server/node';

const app = await startServer({pages: fileURLToPath(new URL('./pages/', import.meta.url)), port: 8080});
console.log(app.url);
```

```sh
node serve.mjs
```

The command prints `http://127.0.0.1:8080`. On Bun, import from
`@gramlot/gramlot-js-server/bun` and run `bun serve.mjs`. The bootstrap document of `/`
lists the resources the adapter found beside the page:

```sh
curl -s http://127.0.0.1:8080/
```

```text
"resources":{"css":["/index.css"],"js":[{"url":"/index.js","group":null}]}
```

<a id="gn-110-030"></a>

## 030 · What changes when typing

Block ID: **GN-110-030**.

Open `http://127.0.0.1:8080/` in a browser. The page shows the label `Name`, a
field with `Ada` and the text `Hello, Ada`; the body uses the sans-serif font of
`index.css`. Type `Grace` in the field: the text changes to `Hello, Grace` at
every keystroke. The field writes `person.name`; the formula recomputes
`person.greeting`; the paragraph follows it. No application code touches the DOM.

Verified on 2026-10-04 with Playwright Chromium 153, on Node and on Bun: field
`Ada`, text `Hello, Ada`, after `fill('#name', 'Grace')` the text `Hello, Grace`,
no console errors.

**Learning path.** After this environment's setup, follow
[Learn by topic](https://github.com/gramlot-org/gramlot/blob/main/docs/public/025-try.md#gc-025-015)
of the core. The gallery is a source viewer, not a file editor: edit a separate
project. `Page` runs on the host, `Logic` in the browser. Reload or reopen the
page after saving; development reload is not automatic hot reload. Use named
`Logic` for reusable behavior; inline examples need the permissive Content
Security Policy profile. The common examples do not cover every advanced case.

<a id="gn-110-035"></a>

## 035 · Update packaged galleries and exports

Block ID: **GN-110-035**.

Stop the gallery. In the consumer project containing the `package.json` and
`node_modules` used to run it, update core, examples and host together:

```sh
npm install --package-lock=false --save-prefix='>=' @gramlot/gramlot@latest @gramlot/gramlot-examples@latest @gramlot/gramlot-js-server@latest
npm ls @gramlot/gramlot @gramlot/gramlot-examples @gramlot/gramlot-js-server --all
node --input-type=module -e "console.log(import.meta.resolve('@gramlot/gramlot/page')); console.log(import.meta.resolve('@gramlot/gramlot-examples'));"
npx gramlot node gallery --port 8080
```

Use `bun` instead of `node` for the Bun host and retain your previous port/mount
options. `npm ls` should report no invalid dependencies. `deduped` is normal;
local links pointing at different core copies need the checkout procedure below.

For a **serverless gallery**, use this package set in its build project:

```sh
npm install --package-lock=false --save-prefix='>=' @gramlot/gramlot@latest @gramlot/gramlot-examples@latest @gramlot/gramlot-serverless@latest
npm ls @gramlot/gramlot @gramlot/gramlot-examples @gramlot/gramlot-serverless --all
npx gramlot-serverless gallery gallery-updated
```

Choose a new output directory and open `gallery-updated/index.html`. Updating npm
packages does not modify an old exported folder or ZIP. Distribute the complete
new folder. For an installed app pointing at a hosted export, replace the served
export through the site's normal deployment procedure, then reopen the app.

These commands explicitly request the registry's latest packages and save minimum
requirements without upper bounds. `--package-lock=false` ignores an existing
package lock for this installation and does not write one; do not later replay a
stale lock with `npm ci`. Review any application lock/constraint policy that would
freeze first-party packages. See [npm install](https://docs.npmjs.com/cli/v11/commands/npm-install/).
A plain `npm install` or rerunning `npx gramlot` is not proof of an update.

Published packages already contain their browser bundles. **Do not run a source
build in a registry consumer.** If you use local links or repository checkouts,
follow the [source update procedure](https://github.com/gramlot-org/gramlot-examples/blob/main/docs/010-gallery.md#ge-010-050),
which rebuilds the inspector/gallery and keeps the server and examples on the
same physical core package. Then run the
[browser checklist](https://github.com/gramlot-org/gramlot/blob/main/docs/public/018-quickstart.md#gc-018-025).


<a id="gn-110-040"></a>
## 040 · Hosted gallery download

Block ID: **GN-110-040**.

Hosted Python and Node galleries can display a footer link to a serverless ZIP.
Pass `--serverless-download /downloads/gramlot-gallery-serverless.zip` to
`gramlot uvicorn gallery` or `gramlot node gallery`. The deployment serves that
static file; the gallery does not generate an archive per request. Omit the option
when no archive is available. Custom gallery subclasses use
`serverless_download_url` (Python) or `serverlessDownloadUrl` (JavaScript).

Build the archive with `gramlot-serverless gallery OUTPUT`, include the complete
output directory, and tell users to unzip it and open `index.html`. Both hosted
galleries may serve the same artifact: Python server execution is not embedded in
the download; the serverless gallery uses the JavaScript equivalents and browser
Workers. Its named endpoints execute locally, without a Python or Node server.

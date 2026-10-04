# gramlot-js-server

[![tests](https://github.com/gramlot-org/gramlot-js-server/actions/workflows/tests.yml/badge.svg?branch=main)](https://github.com/gramlot-org/gramlot-js-server/actions/workflows/tests.yml)
[![Coverage](https://codecov.io/gh/gramlot-org/gramlot-js-server/branch/main/graph/badge.svg)](https://app.codecov.io/gh/gramlot-org/gramlot-js-server)
[![Documentation](https://readthedocs.org/projects/gramlot-js-server/badge/?version=latest)](https://gramlot-js-server.readthedocs.io/en/latest/)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue)](LICENSE)

Gramlot describes web interfaces in Python or JavaScript and keeps them bound to
application state in the browser. See
[The Gramlot family](https://gramlot.readthedocs.io/en/latest/docs/public/055-family.html)
for the core and the other repositories.

## What this repository is

This repository runs JavaScript Gramlot pages. It holds three npm packages:

| Package | Directory | Use it when |
| --- | --- | --- |
| `create-gramlot` | [`create/`](create/) | you start a new project: `npm create gramlot page|site <folder>` |
| `@gramlot/gramlot-serverless` | [`serverless/`](serverless/) | the pages open without a server: one HTML file or one static directory |
| `@gramlot/gramlot-js-server` | [`server/`](server/) | you serve the pages from a Node.js 22 or Bun process |

A page is one JavaScript module that exports two classes: `Page`, which builds the
page, and `Logic`, the methods the page calls in the browser. The same page runs
in both packages. Without a server it runs in a Web Worker of the browser; with
the server, `main` runs on the server. Pages in Python are served by
[gramlot-py-server](https://github.com/gramlot-org/gramlot-py-server).

## Start here: a new project

Node.js 22 or later:

```sh
npm create gramlot page my-form    # index.js: one page, built to one file
npm create gramlot site my-site    # pages/: a site, built to a folder
```

Without the word `page` or `site` the command asks. Then:

```sh
cd my-form
npm install
npm run build        # page: index.html; site: dist/
npm start            # the same pages on http://127.0.0.1:8080/ (Node.js)
npm run start:bun    # the same with Bun
```

The file `index.html` (or the folder `dist/`) opens with a double-click, travels by
mail or sits on any static web site. The templates hold a form whose data leave
the browser through `gramlot.inout`: an email, a saved file, a download.
[No server: a tutorial](https://gramlot-js-server.readthedocs.io/en/latest/135-serverless-tutorial.html)
explains each step and the limits of a page without a server.

## Quick start: a server

In an empty folder:

```sh
printf '{"name":"hello","private":true,"type":"module"}\n' > package.json
npm install @gramlot/gramlot @gramlot/gramlot-js-server
mkdir pages
```

`pages/index.js`, the page served at `/`, with its `Logic`:

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

`serve.mjs`:

```js
import {fileURLToPath} from 'node:url';
import {startServer} from '@gramlot/gramlot-js-server/node';

const app = await startServer({pages: fileURLToPath(new URL('./pages/', import.meta.url)), port: 8080});
console.log(app.url);
```

```sh
node serve.mjs
```

Open `http://127.0.0.1:8080/`. The page shows a field with `Ada` and the text
`Hello, Ada`; typing `Grace` in the field changes the text to `Hello, Grace` at
every keystroke. On Bun, import from `@gramlot/gramlot-js-server/bun` and run
`bun serve.mjs`. This page is executed by `server/test/quickstart.test.mjs` in CI
on Node and Bun; the browser behavior was verified with Chromium.

## Quick start: no server

The same page, exported to one file. From a clone of this repository:

```sh
git clone https://github.com/gramlot-org/gramlot-js-server.git
cd gramlot-js-server
npm install
cd serverless
node src/cli.js build examples/quickstart/page.js -o build/hello.html
```

The page is [`serverless/examples/quickstart/page.js`](serverless/examples/quickstart/page.js),
the same module with `Page` and `Logic`. Open `build/hello.html` in the browser:
the page behaves as above and makes no network request. In a project that
installs `@gramlot/gramlot-serverless` the command is
`npx gramlot-serverless build page.js -o hello.html`; a folder of pages is built
with `npx gramlot-serverless build pages -o dist`. This example is run by
`serverless/tests/quickstart.test.js` and, in a real browser, by
`serverless/scripts/verify_quickstart_browser.mjs` in CI.

## The gallery of examples

The examples of [gramlot-examples](https://github.com/gramlot-org/gramlot-examples),
each page beside its code:

```sh
npm install @gramlot/gramlot @gramlot/gramlot-js-server @gramlot/gramlot-serverless @gramlot/gramlot-examples
npx gramlot node gallery                 # http://127.0.0.1:8080/, on Node.js
npx gramlot bun gallery --mount /js      # http://127.0.0.1:8080/js/, on Bun
npx gramlot-serverless gallery gallery   # a folder that opens from disk: gallery/index.html
```

## Next steps

- The guides on Read the Docs, sources in [docs/](docs/) and the concise view
  in [docs_llm/](docs_llm/):
  - no server: [Introduction](https://gramlot-js-server.readthedocs.io/en/latest/105-introduction.html),
    [Tutorial](https://gramlot-js-server.readthedocs.io/en/latest/110-tutorial.html),
    [No server: a tutorial](https://gramlot-js-server.readthedocs.io/en/latest/135-serverless-tutorial.html),
    [Writing pages](https://gramlot-js-server.readthedocs.io/en/latest/115-writing-pages.html),
    [Configuration](https://gramlot-js-server.readthedocs.io/en/latest/120-configuration.html),
    [Deployment](https://gramlot-js-server.readthedocs.io/en/latest/125-deployment.html),
    [Reference](https://gramlot-js-server.readthedocs.io/en/latest/130-reference.html),
    [Troubleshooting](https://gramlot-js-server.readthedocs.io/en/latest/140-troubleshooting.html);
  - server: [Introduction](https://gramlot-js-server.readthedocs.io/en/latest/005-introduction.html),
    [Tutorial](https://gramlot-js-server.readthedocs.io/en/latest/010-tutorial.html),
    [Writing pages](https://gramlot-js-server.readthedocs.io/en/latest/015-writing-pages.html),
    [Configuration](https://gramlot-js-server.readthedocs.io/en/latest/020-configuration.html),
    [Deployment](https://gramlot-js-server.readthedocs.io/en/latest/025-deployment.html),
    [Reference](https://gramlot-js-server.readthedocs.io/en/latest/030-reference.html),
    [Troubleshooting](https://gramlot-js-server.readthedocs.io/en/latest/040-troubleshooting.html).
- The core: [The Gramlot family](https://gramlot.readthedocs.io/en/latest/docs/public/055-family.html),
  [Classes, repository and server adapters](https://gramlot.readthedocs.io/en/latest/docs/public/090-classes-and-hosts.html)
  (the shared adapter contract: mount prefix, page logic, CSP profiles),
  [Writing pages](https://gramlot.readthedocs.io/en/latest/docs/public/095-writing-pages.html).

## Compatibility

| | Verified |
| --- | --- |
| Gramlot | `@gramlot/gramlot` 0.2.5; `@gramlot/gramlot-examples` 0.2.4; `@genrojs/builders` 0.4.1 |
| Runtimes | Node.js 22 (CI) and 23.11; Bun 1.3.14 (server and gallery) |
| Browsers | Chromium 153 and WebKit 26.6 (pages, gallery, exports); Firefox 155 for the core qualification of 0.2.0. WebKit is not Safari; Safari is not verified. |

## Tests and contributing

```sh
npm install
npm test -w server                                     # Node contract, quick-start and gallery tests
(cd server && bun test test/server.test.mjs test/quickstart.test.mjs test/gallery.test.mjs)   # the same on Bun
npm test -w serverless                                 # exporter and static gallery tests
npm test -w create                                     # both templates built and started
python scripts/check_docs.py                           # paired guides and Sphinx build
```

CI runs the packages against the released core and, as an informational job,
against the core's `main` checkout, and builds the documentation; coverage goes
to Codecov. See [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md).
The internal notes, including the history of the earlier PoC server, are in
[docs/internal/](docs/internal/).

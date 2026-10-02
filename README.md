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

This repository hosts JavaScript Gramlot pages. It holds two packages:

| Package | Directory | Use it when |
| --- | --- | --- |
| `@gramlot/gramlot-js-server` | [`server/`](server/) | you serve the pages from a Node.js 22 or Bun process |
| `@gramlot/gramlot-serverless` | [`serverless/`](serverless/) | the pages open without a server: one HTML file or one static directory |

`@gramlot/gramlot-js-server` connects a folder of Page modules to the core's
`FileHost`, sends the bootstrap document, answers the main and remote Source
requests and serves the page companions, with a mount prefix and a Content
Security Policy of your choice.

`@gramlot/gramlot-serverless` exports a page so that it runs in a Web Worker
inside the browser; the window renders it and keeps the fields bound to the
data. The result opens from disk, goes by mail or sits on any static host.

Neither package runs Python pages, which
[gramlot-uvicorn](https://github.com/gramlot-org/gramlot-uvicorn) serves, or
talks to a database.

## Quick start: a server

Node 22 or later:

```sh
mkdir hello && cd hello
printf '{"name":"hello","private":true,"type":"module"}\n' > package.json
npm install @gramlot/gramlot @gramlot/gramlot-js-server
mkdir pages
```

`pages/index.js`, the page served at `/`:

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

`pages/index_aux.js`, the named logic of the page:

```js
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
`bun serve.mjs`. This page is executed by `server/test/quickstart.test.mjs` in
CI on Node and Bun; the browser behavior was verified with Chromium.

## Quick start: no server

The same page, exported to one file. From a clone of this repository:

```sh
git clone https://github.com/gramlot-org/gramlot-js-server.git
cd gramlot-js-server
npm install
cd browser
node src/cli.js build examples/quickstart/page.js -o build/hello.html
```

The page is [`serverless/examples/quickstart/page.js`](serverless/examples/quickstart/page.js);
its formula names a method of the companion
[`serverless/examples/quickstart/page_aux.js`](serverless/examples/quickstart/page_aux.js),
because the exported file runs under a strict Content Security Policy that
allows no inline code.

Open `build/hello.html` in the browser. The page behaves as above and makes no
network request. This example is run by `serverless/tests/quickstart.test.js`
and, in a real browser, by `serverless/scripts/verify_quickstart_browser.mjs`
in CI.

## Next steps

- The guides on Read the Docs, sources in [docs/](docs/) and the concise view
  in [docs_llm/](docs_llm/):
  - server: [Introduction](https://gramlot-js-server.readthedocs.io/en/latest/005-introduction.html),
    [Tutorial](https://gramlot-js-server.readthedocs.io/en/latest/010-tutorial.html),
    [Writing pages](https://gramlot-js-server.readthedocs.io/en/latest/015-writing-pages.html),
    [Configuration](https://gramlot-js-server.readthedocs.io/en/latest/020-configuration.html),
    [Deployment](https://gramlot-js-server.readthedocs.io/en/latest/025-deployment.html),
    [Reference](https://gramlot-js-server.readthedocs.io/en/latest/030-reference.html),
    [Troubleshooting](https://gramlot-js-server.readthedocs.io/en/latest/040-troubleshooting.html);
  - browser: [Introduction](https://gramlot-js-server.readthedocs.io/en/latest/105-introduction.html),
    [Tutorial](https://gramlot-js-server.readthedocs.io/en/latest/110-tutorial.html),
    [Writing pages](https://gramlot-js-server.readthedocs.io/en/latest/115-writing-pages.html),
    [Configuration](https://gramlot-js-server.readthedocs.io/en/latest/120-configuration.html),
    [Deployment](https://gramlot-js-server.readthedocs.io/en/latest/125-deployment.html),
    [Reference](https://gramlot-js-server.readthedocs.io/en/latest/130-reference.html),
    [Troubleshooting](https://gramlot-js-server.readthedocs.io/en/latest/140-troubleshooting.html).
- The core: [The Gramlot family](https://gramlot.readthedocs.io/en/latest/docs/public/055-family.html),
  [Classes, repository and server adapters](https://gramlot.readthedocs.io/en/latest/docs/public/090-classes-and-hosts.html)
  (the shared adapter contract: mount prefix, companions, CSP profiles),
  [Writing pages](https://gramlot.readthedocs.io/en/latest/docs/public/095-writing-pages.html).
- Example pages of the core, each in Python and JavaScript:
  [examples/binding](https://github.com/gramlot-org/gramlot/tree/main/examples/binding) and
  [examples/controllers](https://github.com/gramlot-org/gramlot/tree/main/examples/controllers).

## Compatibility

| | Verified |
| --- | --- |
| Gramlot | `@gramlot/gramlot` 0.2.1; `@genrojs/builders` 0.4.1 |
| Runtimes | Node.js 22 (CI) and 23.11; Bun 1.3.14 (server) |
| Browsers | Chromium 153, WebKit 26.6, Firefox 155 (core qualification of 0.2.0, strict and permissive CSP). WebKit is not Safari; Safari is not verified. |

## Tests and contributing

```sh
npm install
npm test -w server                                     # Node contract and quick-start tests
(cd server && bun test test/server.test.mjs test/quickstart.test.mjs)   # the same on Bun
npm test -w serverless                                         # exporter tests
python scripts/check_docs.py                                      # paired guides and Sphinx build
```

CI runs both packages against the released core and, as an informational job,
against the core's `main` checkout, and builds the documentation; coverage goes
to Codecov. See [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md).
The internal notes, including the history of the earlier PoC server, are in
[docs/internal/](docs/internal/).

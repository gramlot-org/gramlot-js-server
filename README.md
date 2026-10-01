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

gramlot-js-server serves JavaScript Gramlot pages from Node.js 22 or Bun. Choose
it when your pages are written in JavaScript and you serve them from a Node.js
or Bun process: it connects a folder of Page modules to the core's `FileHost`,
sends the bootstrap document, answers the main and remote Source requests and
serves the page companions, with a mount prefix and a Content Security Policy
of your choice. It is not for Python pages, which
[gramlot-uvicorn](https://github.com/gramlot-org/gramlot-uvicorn) serves, nor for
pages without a server, which
[gramlot-serverless](https://github.com/gramlot-org/gramlot-serverless) exports
as one HTML file or a static folder.

## Quick start

Gramlot 0.2.0 is released on PyPI and JSR. The core's npm package
`@gramlot/gramlot`, which this adapter takes as a peer dependency, is not
published yet: link a core checkout and this adapter, both cloned beside your
application.

```sh
mkdir hello && cd hello
printf '{"name":"hello","private":true,"type":"module"}\n' > package.json
npm install --no-save ../gramlot/js ../gramlot-js-server
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
import {startNativeServer} from 'gramlot-js-server/native';

const app = await startNativeServer({pages: fileURLToPath(new URL('./pages/', import.meta.url)), port: 8080});
console.log(app.url);
```

```sh
node serve.mjs
```

Open `http://127.0.0.1:8080/`. The page shows a field with `Ada` and the text
`Hello, Ada`; typing `Grace` in the field changes the text to `Hello, Grace` at
every keystroke. On Bun, import from `gramlot-js-server/bun` and run
`bun serve.mjs`. This page is executed by `test/quickstart.test.mjs` in CI on
Node and Bun; the browser behavior was verified with Chromium.

## Next steps

- This repository's guides on Read the Docs:
  [Introduction](https://gramlot-js-server.readthedocs.io/en/latest/005-introduction.html),
  [Tutorial](https://gramlot-js-server.readthedocs.io/en/latest/010-tutorial.html),
  [Writing pages for this host](https://gramlot-js-server.readthedocs.io/en/latest/015-writing-pages.html),
  [Configuration](https://gramlot-js-server.readthedocs.io/en/latest/020-configuration.html),
  [Deployment](https://gramlot-js-server.readthedocs.io/en/latest/025-deployment.html),
  [Reference](https://gramlot-js-server.readthedocs.io/en/latest/030-reference.html),
  [Troubleshooting](https://gramlot-js-server.readthedocs.io/en/latest/040-troubleshooting.html).
  Sources in [docs/](docs/) and the concise view in [docs_llm/](docs_llm/).
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
| Gramlot | 0.2.0 (core `main`, linked as `@gramlot/gramlot`) |
| Runtimes | Node.js 22 (CI) and 23.11, Bun 1.3.14 |
| Browsers | Chromium 153, WebKit 26.6, Firefox 155 (core qualification of 0.2.0, strict and permissive CSP, Node and Bun) |

## Tests and contributing

```sh
npm install --no-save ../gramlot/js
npm run test:native                                        # Node contract and quick-start tests
bun test test/native.test.mjs test/quickstart.test.mjs     # the same on Bun
npm run test:coverage                                      # Node tests with lcov in coverage/
python scripts/check_docs.py                               # paired guides and Sphinx build
```

CI runs the Node and Bun tests against the core's `main` checkout as an
informational job, since no published core can be installed, and builds the
documentation; coverage goes to Codecov. See [CONTRIBUTING.md](CONTRIBUTING.md)
and [AGENTS.md](AGENTS.md). The historical PoC server (`npm start`,
`src/start.mjs`) and the internal notes are described in
[docs/internal/](docs/internal/).

# Gramlot Serverless

[![tests](https://github.com/gramlot-org/gramlot-serverless/actions/workflows/tests.yml/badge.svg?branch=main)](https://github.com/gramlot-org/gramlot-serverless/actions/workflows/tests.yml)
[![Coverage](https://codecov.io/gh/gramlot-org/gramlot-serverless/branch/main/graph/badge.svg)](https://app.codecov.io/gh/gramlot-org/gramlot-serverless)
[![Documentation](https://readthedocs.org/projects/gramlot-serverless/badge/?version=latest)](https://gramlot-serverless.readthedocs.io/en/latest/)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue)](LICENSE)

Gramlot describes web interfaces in Python or JavaScript and keeps them bound to
application state in the browser. See
[The Gramlot family](https://gramlot.readthedocs.io/en/latest/docs/public/055-family.html)
for the core and the other repositories.

## What this repository is

`gramlot-serverless` turns a JavaScript Gramlot page into something that opens
without a server: one HTML file, or one static directory with several pages. The
Page runs in a Web Worker inside the browser; the window renders it and keeps the
fields bound to the data. Choose it when you want a page to open from disk, send
by mail or host as static content, with no process behind it.

It does not serve pages over HTTP, run Python pages or talk to a database. For
JavaScript pages behind a server use
[gramlot-js-server](https://github.com/gramlot-org/gramlot-js-server); for Python
pages use [gramlot-uvicorn](https://github.com/gramlot-org/gramlot-uvicorn).

## Quick start

Install, with the released core `@gramlot/gramlot` 0.2.1 from npm. Node 22 or later:

```sh
git clone https://github.com/gramlot-org/gramlot-serverless.git
cd gramlot-serverless
npm install
```

A page is one module with its companion beside it. This is
[`examples/quickstart/page.js`](examples/quickstart/page.js):

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

The formula names a method of the companion
[`examples/quickstart/page_aux.js`](examples/quickstart/page_aux.js), because the
exported file runs under a strict Content Security Policy that allows no inline code:

```javascript
export class Logic {
    greeting(kwargs) { return `Hello, ${kwargs.name}`; }
}
```

Export the page to one file and open it:

```sh
node src/cli.js build examples/quickstart/page.js -o build/hello.html
```

Open `build/hello.html` in the browser. The page shows a field with `Ada` and the
text `Hello, Ada`; typing `Grace` in the field changes the text to `Hello, Grace`
at every keystroke. The file makes no network request. This example is run by
`tests/quickstart.test.js` and, in a real browser, by
`scripts/verify_quickstart_browser.mjs` in CI.

## Next steps

- This repository's guides on Read the Docs:
  [Introduction](https://gramlot-serverless.readthedocs.io/en/latest/105-introduction.html),
  [Tutorial](https://gramlot-serverless.readthedocs.io/en/latest/110-tutorial.html),
  [Writing pages for this host](https://gramlot-serverless.readthedocs.io/en/latest/115-writing-pages.html),
  [Configuration](https://gramlot-serverless.readthedocs.io/en/latest/120-configuration.html),
  [Deployment](https://gramlot-serverless.readthedocs.io/en/latest/125-deployment.html),
  [Reference](https://gramlot-serverless.readthedocs.io/en/latest/130-reference.html),
  [Troubleshooting](https://gramlot-serverless.readthedocs.io/en/latest/140-troubleshooting.html)
  (sources in `docs/`, concise view in `docs_llm/`).
- Core guides: [The Gramlot family](https://gramlot.readthedocs.io/en/latest/docs/public/055-family.html),
  [Classes and server adapters](https://gramlot.readthedocs.io/en/latest/docs/public/090-classes-and-hosts.html)
  (the standalone host and the policy profiles),
  [Writing pages](https://gramlot.readthedocs.io/en/latest/docs/public/095-writing-pages.html).
- Core example families, in Python and JavaScript:
  [`examples/binding`](https://github.com/gramlot-org/gramlot/tree/main/examples/binding)
  and [`examples/controllers`](https://github.com/gramlot-org/gramlot/tree/main/examples/controllers).
- Contributors and coding agents: `AGENTS.md`, `CONTRIBUTING.md`, internal notes
  in `docs/internal/`.

## Compatibility

| | Verified |
| --- | --- |
| Gramlot core | `@gramlot/gramlot` 0.2.0 (JSR, released 2026-09-30); `@genrojs/builders` 0.4.0 |
| Node | 22 (CI), 23.11 (local) |
| Browsers | Chromium 153.0.8010.12 (CI and local, headless); Playwright WebKit 26.6 (2026-09-30); Firefox 155.0 (owner run, 2026-09-30). WebKit is not Safari; Safari is not verified. |

The core records the 0.2.0 qualification in its internal guides GC-070 and GC-215.
The package `@gramlot/serverless` is not published on a registry; use it from the
checkout.

# gramlot-js-server

[![tests](https://github.com/gramlot-org/gramlot-js-server/actions/workflows/tests.yml/badge.svg?branch=main)](https://github.com/gramlot-org/gramlot-js-server/actions/workflows/tests.yml)
[![Coverage](https://codecov.io/gh/gramlot-org/gramlot-js-server/branch/main/graph/badge.svg)](https://app.codecov.io/gh/gramlot-org/gramlot-js-server)
[![Documentation](https://readthedocs.org/projects/gramlot-js-server/badge/?version=latest)](https://gramlot-js-server.readthedocs.io/en/latest/)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue)](LICENSE)

Node.js and Bun host adapter for [Gramlot](https://github.com/gramlot-org/gramlot)
pages. It serves trusted JavaScript Page modules through the Gramlot 0.2.0
minimal Host contract: `resolvePage`, `resolveResources` and `openPage` of the
core's `FileHost`, or of a custom `host`. The adapter owns HTTP routing, bounded
payload parsing, response and error mapping and request identity; the core's
Host owns page execution, registrations, ownership checks and TTL. No database,
no Python process.

`gramlot-js-server/native` exports `startNativeServer` for Node (`node:http`);
`gramlot-js-server/bun` exports the same function on Bun's native `fetch` server.

## Install

Gramlot 0.2.0 is released on PyPI (`gramlot`) and JSR (`@genro/gramlot`). The
core's npm package `@gramlot/native-html`, which this adapter takes as a peer
dependency, is not published on any registry yet. Link a core checkout placed
beside this repository, without saving the path in `package.json`:

```sh
npm install --no-save ../gramlot/js
```

The adapter and the application's pages must resolve the same package instance,
or `instanceof Page` fails. The adapter itself is not published; applications
use it from a checkout or a workspace. Node 22 or later.

## Usage

```js
import {startNativeServer} from 'gramlot-js-server/native';   // or 'gramlot-js-server/bun'

const app = await startNativeServer({
    pages: '/path/to/pages',          // trusted JS Page modules
    hostname: '127.0.0.1', port: 0,   // port 0 selects a free port
    mountPath: '/app',
    contentSecurityPolicy: "script-src 'nonce-{nonce}'; object-src 'none'; base-uri 'none'",
});
console.log(app.url);   // app.host, app.server, await app.close()
```

- `mountPath` (default `""`) is passed to `openPage` as the mount prefix of the
  browser URLs. Request paths arrive without it: at the root, or behind a front
  server that strips the mount before dispatch.
- `contentSecurityPolicy` (default `null`) is the application's policy, sent as
  the `Content-Security-Policy` header of each HTML page with `{nonce}` replaced
  by the bootstrap nonce of that opening. The strict profile above admits named
  logic only; adding `'unsafe-eval'` to `script-src` activates inline code.
- Companions: `GET` and `HEAD` serve a `.css` or `_aux.js` file whose real path
  is below the pages folder. Every other file of the folder, and every path whose
  real path leaves it, answers 404; other methods answer 405.
- `host` replaces the default `new FileHost(pages, options)`;
  `ownerForRequest(request)` supplies the owner identity; `onError` receives
  unexpected errors, answered with HTTP 500.

The working launchers are in the
[Hello World application](https://github.com/gramlot-org/gramlot-examples/tree/main/apps/hello-world)
(`npm run start:node`, `bun run start:bun`).

## Tests

```sh
npm run test:native            # Node contract tests
bun test test/native.test.mjs  # Bun contract tests
npm run test:coverage          # Node tests with lcov in coverage/
```

Both need the linked core. `npm test` also runs the historical PoC tests of
`src/start.mjs`, which need the sibling `gramlot-poc` checkout. The browser
harness `test/native-browser.mjs` takes a runtime, a Playwright module and a
Chromium executable; see the [native host guide](docs/010-native-html.md#gn-010-010).

CI (`.github/workflows/tests.yml`) runs the Node and Bun contract tests and the
documentation build. The test job links the core's `main` checkout and is
informational, because no published core can be installed while
`@gramlot/native-html` is unpublished; a job against the published core will
be added when the package name is settled. Coverage of the Node run is
uploaded to Codecov.

## Documentation

- `docs/` (expanded) and `docs_llm/` (concise), namespace GN, built with Sphinx
  (`.readthedocs.yaml`). Build locally: `python scripts/check_docs.py`.
- [GN-010 · Native HTML hosts](docs/010-native-html.md): API, verification,
  shared examples. [GN-005](docs/005-node-host.md): the historical PoC server.
- Core reference: [Classes, repository and server adapters](https://github.com/gramlot-org/gramlot/blob/main/docs/public/090-classes-and-hosts.md).
- Rules for contributors and coding agents: `AGENTS.md`, `CONTRIBUTING.md`.
  No AI, LLM or assistant references in commits, pull requests, code or
  documents.

## Shared examples

Gramlot owns the teaching examples, their READMEs, the runner and the theme.
This adapter is a downstream consumer: it owns hosting and setup and uses the
shared examples through the Gramlot dependency, without a copied suite. See
[shared example ownership](docs/010-native-html.md#gn-010-015).

## Historical PoC server

`npm start` runs the older sibling-PoC server (`src/start.mjs`, port 8070),
which needs the `gramlot-poc` browser distribution beside this repository
(`GRAMLOT_BROWSER_DIR` overrides the path). It is preserved as experimental
history outside the native profile; see [GN-005](docs/005-node-host.md).

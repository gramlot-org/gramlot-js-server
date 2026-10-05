---
orphan: true
---

# 010 · Node and Bun hosts

> **Historical record (2026-09-24 to 2026-10-03):** describes the Node and Bun adapter
> from the 0.1.0 profile to 0.2.3; not the current state. Current: the server guides
> GN-105 to GN-140 ([Introduction](https://gramlot-js-server.readthedocs.io/en/latest/005-introduction.html),
> [Configuration](https://gramlot-js-server.readthedocs.io/en/latest/020-configuration.html), [Reference](https://gramlot-js-server.readthedocs.io/en/latest/030-reference.html))
> and [CONTRIBUTING.md](../../CONTRIBUTING.md) for the checks.

Document ID: **GN-010**. Adapter for the Gramlot 0.2.0 minimal Host contract, published on npm as `@gramlot/gramlot-js-server`.

<a id="gn-010-005"></a>

## 005 · Node and Bun

Block ID: **GN-010-005**.

`@gramlot/gramlot-js-server` exports `/node` (Node) and `/bun` (Bun), declared in
`server/package.json`. Each exports `startServer({pages, hostname, port})`.
`pages` is the installed application's trusted JS pages directory; `port: 0` selects
an available port. The result exposes `url`, `host`, `server` and asynchronous
`close()`, which closes sockets and clears page registrations.

Gramlot 0.2.0 minimal Host contract: `resolvePage(path)` returns the Page class,
`resolveResources(path, PageClass)` returns `{css: [url], js: [{url, group}]}` and
`openPage(path, {owner, prefix})` returns `{pageId, html, nonce}`. Without `host`, the
adapter builds `new FileHost(pages, options)`; `options` are the Host URL, TTL and
capacity options. A custom `host` implements the two resolve methods.

- `mountPath` (default `""`) is passed to `openPage` as the mount prefix at each
  opening. Request paths arrive without it: at the root, or behind a server that
  strips the mount before dispatch, as in `gramlot-uvicorn`.
- `contentSecurityPolicy` (default `null`) is the application's policy. The adapter
  sends it as the `Content-Security-Policy` header of each HTML page, with `{nonce}`
  replaced by the bootstrap nonce of that opening. Strict profile:
  `script-src 'nonce-{nonce}'; object-src 'none'; base-uri 'none'`, named logic only.
  Permissive profile: the same with `'unsafe-eval'`, inline code active.
- GET and HEAD serve a `.css` or `_aux.js` file whose real path is below the pages
  folder (`host.pagesDir`): the FileHost companions and `Page.css` files placed there.
  Every other file of the folder, and every path whose real path leaves it, is 404;
  another method is 405. `Page.css` URLs outside the folder are application assets.

`@gramlot/gramlot` (>=0.2.1) is a peer dependency: the adapter must use the same
package instance as the application's pages, or `instanceof Page` fails. To work
against an unreleased core, link a local core checkout without saving a path in
`package.json`:

```sh
npm install --no-save ../gramlot/js
```

A later plain `npm install` removes the link; repeat the command.

Both bridges use `@gramlot/gramlot/server` and serve the packaged
`@gramlot/gramlot/runtime` asset. Node translates HTTP streams to Fetch requests;
Bun uses native Fetch requests. Shared `server/src/fetch.mjs` owns HTTP routing,
bounded payload parsing, response/error mapping and request identity extraction.
Neutral Host owns page execution, page registrations, ownership checks and TTL.
The adapter also accepts JSON `POST /gramlot/close`, extracts owner identity and
passes the page ID to `Host.closePage`. Browser `dispose()` sends a best-effort close
request; non-persisted `pagehide` sends a beacon. TTL covers failed delivery.
An optional `host` supplies page execution; the adapter's `ownerForRequest(request)`
callback supplies identity without adding HTTP methods to Host; the default anonymous profile is intended for local Hello World.
No database or Python worker is loaded. Unexpected errors produce HTTP 500 and
are delivered to the configurable `onError` callback.

The earlier sibling-PoC server was removed on 2026-10-01; GN-005 records it.

<a id="gn-010-010"></a>

## 010 · Verification and distribution

Block ID: **GN-010-010**.

Run `npm test -w server` for the real Node listener contract
(`server/test/server.test.mjs` and `quickstart.test.mjs`) and, in `server/`,
`bun test test/server.test.mjs test/quickstart.test.mjs` for Bun. The browser harness
`server/test/browser.mjs` starts `browser-host.mjs` with the given runtime and accepts
an installed Playwright module and Chromium executable; run it in `server/`:

```sh
node test/browser.mjs node /path/to/playwright/index.mjs /path/to/chromium
node test/browser.mjs bun /path/to/playwright/index.mjs /path/to/chromium
```

The browser check covers initial main, typed Source insert/delete/update, a remote
HTML block, disposal and JavaScript errors. It then opens the core's `avvio` page
(`js/tests/fixtures/logic/avvio.js` with `avvio_aux.js`, from the linked core checkout)
with mount prefix `/app` behind a stripping front, under the strict and the permissive
CSP. Named logic starts under both; an inline page starts under the permissive profile
and fails under the strict one with the core's error naming the node. Framework fixtures may manipulate Source;
application pages only declare their elements. Hello World launchers live in
`gramlot-examples/apps/hello-world`, as `npm run start:node` and `npm run start:bun`.

The core `@gramlot/gramlot` 0.2.3 is published on npm and JSR; this adapter is
published on npm as `@gramlot/gramlot-js-server` 0.2.3. The CI workflow
`.github/workflows/tests.yml` runs the Node and Bun contract tests in the required job
`published core`, against the core from the registry, and in the informational job
`core main`, against the core's `main` checkout.


<a id="gn-010-015"></a>

## 015 · Shared examples from Gramlot

Block ID: **GN-010-015**.

Node.js and Bun execute the shared JavaScript pages using their respective host adapters.

Gramlot is the primary reference for framework concepts, APIs and the shared
teaching examples. Start with its documentation on Read the Docs and its source
repository. Then choose an integration, read its environment-specific guide and
clone that integration repository to configure and run the examples in that host.
Read the Docs is the documentation delivery target; this policy does not claim
that every integration site is already connected or published.

The integration repositories are downstream consumers of Gramlot. Gramlot owns
the example pages, their READMEs, the runner, logo and shared theme. Integrations
own adapters, environment configuration, launch commands and hosting instructions.
They must consume the shared material from the Gramlot dependency rather than
maintain copied teaching suites. Generated installation or export assets are
reproducible outputs, not independently maintained sources.

Python examples run inside Flask, FastAPI, Django, Kajenn or Minimal's Uvicorn
profile. JavaScript examples run inside Node.js/Bun or Minimal's browser Worker
standalone profile. The integration selects the execution language; the shared
runner does not ask users to switch between Python and JavaScript.

To receive changed examples, update the Gramlot dependency following the chosen
integration's setup instructions, then restart the host or rebuild the standalone
export. An existing installation or exported folder does not update itself when
upstream changes. First-party dependencies remain unpinned; the published 0.1.x and 0.2.0
releases remain immutable.

This is the agreed distribution model. The teaching sources already live in
Gramlot under `examples/html_svg`, the runner under `examples/00-runner`, and the
theme under `themes/gramlot-base`. Uniform dependency packaging and example launch
commands across all six integrations still need implementation and verification.
Existing Hello World smoke launchers and historical demos do not establish that
this shared teaching-suite workflow is already available in every integration.

See the [Gramlot guide](https://github.com/gramlot-org/gramlot/blob/main/docs/public/025-try.md#gc-025-020) for the authoritative shared policy. Public documentation follows `main`; unpublished development changes are not yet part of that public reference.

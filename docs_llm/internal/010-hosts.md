---
orphan: true
---

# 010 · Node and Bun hosts

Document ID: **GN-010**. Adapter for the Gramlot 0.2.0 minimal Host contract, published on npm as `@gramlot/gramlot-js-server`.

<a id="gn-010-005"></a>

## 005 · Node and Bun

Block ID: **GN-010-005**.

`@gramlot/gramlot-js-server` exports `/node` (Node) and `/bun` (Bun), declared in
`server/package.json`. Each exports `startServer({pages, hostname, port})`.
`pages` is the installed application's trusted JS pages directory; `port: 0` selects
an available port. The result exposes `url`, `host`, `server` and asynchronous
`close()`, which closes sockets and clears page registrations.

Minimal Host contract (0.2.0): `resolvePage(path)` → Page class; `resolveResources(path,
PageClass)` → `{css: [url], js: [{url, group}]}`; `openPage(path, {owner, prefix})` →
`{pageId, html, nonce}`. Default host: `new FileHost(pages, options)`; a custom `host`
implements both resolve methods.

- `mountPath` (default `""`): prefix passed to `openPage`; request paths arrive without
  it (root, or a server that strips the mount), as in `gramlot-uvicorn`.
- `contentSecurityPolicy` (default `null`): application policy sent on each HTML page,
  `{nonce}` replaced by the bootstrap nonce. Strict: `script-src 'nonce-{nonce}';
  object-src 'none'; base-uri 'none'`, named logic only. Permissive: plus
  `'unsafe-eval'`, inline active.
- GET/HEAD serve `.css` and `_aux.js` files whose real path is below `host.pagesDir`
  (companions and `Page.css` files there); any other file or escaping path 404, other
  methods 405. `Page.css` URLs outside the folder are application assets.

`@gramlot/gramlot` (>=0.2.1) is a peer dependency (same instance as the pages, or
`instanceof Page` fails). Against an unreleased core, link it without a path in
`package.json`: `npm install --no-save ../gramlot/js`; repeat after a plain `npm install`.

Both bridges use `@gramlot/gramlot/server` and serve the packaged
`@gramlot/gramlot/runtime` asset. Node translates HTTP streams to Fetch requests;
Bun uses native Fetch requests. Shared `server/src/fetch.mjs` owns HTTP routing,
bounded payload parsing, response/error mapping and request identity extraction.
Neutral Host owns page execution, page registrations, ownership checks and TTL.
JSON `POST /gramlot/close` passes adapter-derived owner identity to
`Host.closePage`. Explicit browser disposal and non-persisted `pagehide` attempt
closure; TTL covers failed delivery.
An optional `host` supplies page execution; the adapter's `ownerForRequest(request)`
callback supplies identity without adding HTTP methods to Host; the default anonymous profile is intended for local Hello World.
No database or Python worker is loaded. Unexpected errors produce HTTP 500 and
are delivered to the configurable `onError` callback.

The earlier sibling-PoC server was removed on 2026-10-01 (GN-005).

<a id="gn-010-010"></a>

## 010 · Verification and distribution

Block ID: **GN-010-010**.

Node contract: `npm test -w server` (`server/test/server.test.mjs`,
`quickstart.test.mjs`); Bun, in `server/`: `bun test test/server.test.mjs
test/quickstart.test.mjs`. Browser harness `server/test/browser.mjs` (starts
`browser-host.mjs`), run in `server/` with Playwright and Chromium:

```sh
node test/browser.mjs node /path/to/playwright/index.mjs /path/to/chromium
node test/browser.mjs bun /path/to/playwright/index.mjs /path/to/chromium
```

The browser check covers initial main, typed Source insert/delete/update, a remote
HTML block, disposal and JavaScript errors; then the core's `avvio` page (linked core
checkout) at mount prefix `/app` behind a stripping front, strict and permissive CSP:
named logic starts under both, inline starts only under permissive and otherwise fails
with the core's error naming the node. Framework fixtures may manipulate Source;
application pages only declare their elements. Hello World launchers live in
`gramlot-examples/apps/hello-world`, as `npm run start:node` and `npm run start:bun`.

Core `@gramlot/gramlot` 0.2.1 on npm and JSR; this adapter `@gramlot/gramlot-js-server`
0.2.1 on npm. CI (`.github/workflows/tests.yml`) runs the Node and Bun contract tests
in the required job `published core` (registry core) and the informational job
`core main` (core `main` checkout).


<a id="gn-010-015"></a>

## 015 · Shared examples from Gramlot

Block ID: **GN-010-015**.

Node.js and Bun execute the shared JavaScript pages using their respective host adapters.

Gramlot is the upstream reference for framework documentation and the shared
teaching suite: pages, READMEs, runner, logo and theme. Read its manual first,
then the chosen integration's guide; clone that downstream repository for its
adapter, configuration and launch instructions. Read the Docs is the documentation
target, not a claim that all integration sites are already published.

Integrations consume Gramlot's examples without maintaining local source copies.
Python runs in Flask/FastAPI/Django/Kajenn or Minimal with Uvicorn; JavaScript runs
in Node.js/Bun or Minimal's browser Worker. The integration selects the language.
Update the Gramlot dependency, then restart or regenerate the standalone export
to receive changes. Installed environments and exports do not refresh themselves.
Generated assets are outputs, not another source. First-party dependencies remain
unpinned; published 0.1.x and 0.2.0 releases are immutable.

Agreed model, not completed ecosystem rollout: sources exist in `examples/html_svg`,
`examples/00-runner` and `themes/gramlot-base`; uniform dependency packaging and
launch commands for all six integrations remain to be implemented and verified.
Historical demos and existing Hello World smoke launchers are separate evidence.

See the [Gramlot guide](https://github.com/gramlot-org/gramlot/blob/main/docs/public/025-try.md#gc-025-020) for the authoritative shared policy. Public documentation follows `main`; unpublished development changes are not yet part of that public reference.

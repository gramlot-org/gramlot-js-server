---
orphan: true
---

# 010 · Node and Bun hosts

> **Internal note.** How the Node and Bun adapter is built and verified. For use, read
> the server guides GN-105 to GN-140 ([Introduction](https://gramlot-js-server.readthedocs.io/en/latest/005-introduction.html),
> [Configuration](https://gramlot-js-server.readthedocs.io/en/latest/020-configuration.html), [Reference](https://gramlot-js-server.readthedocs.io/en/latest/030-reference.html))
> and [CONTRIBUTING.md](../../CONTRIBUTING.md) for the checks. The earlier names of this
> note (`Host`, `FileHost`, the minimal Host contract of the 0.1.0 and 0.2.0 profiles) are
> `GramlotServer` and `GramlotFileServer` of the core.

Document ID: **GN-010**. Adapter between the core `GramlotServer` and HTTP, published on npm as `@gramlot/gramlot-js-server`.

<a id="gn-010-005"></a>

## 005 · Node and Bun

Block ID: **GN-010-005**.

`@gramlot/gramlot-js-server` exports `/node` (Node) and `/bun` (Bun), declared in
`server/package.json`. Each exports `startServer({pages, hostname, port, …})`.
`pages` is the installed application's trusted JS pages directory; `port: 0` selects
an available port. The result exposes `url`, `gramlotServer`, `server` and asynchronous
`close()`, which clears the page registrations and closes sockets.

Core `GramlotServer` contract: `resolvePage(path)` → Page class; `resolveResources(path,
PageClass)` → `{css: [url], js: [{url, group}]}`; `openPage(path, {owner, prefix})` →
`{pageId, html, nonce}`. Default: `new GramlotFileServer(pages, options)` (`GramlotServer`
options and `reload`); a custom `server` implements both resolve methods.

- `mountPath` (default `""`): prefix passed to `openPage` and carried by every request
  path; the adapter removes it, 404 outside it, 301 for the bare prefix. A front server
  forwards the path unchanged.
- `contentSecurityPolicy` (default `null`): application policy sent on each HTML page,
  `{nonce}` replaced by the bootstrap nonce. Strict: `script-src 'nonce-{nonce}';
  object-src 'none'; base-uri 'none'`, named logic only. Permissive: plus
  `'unsafe-eval'`, inline active.
- GET/HEAD serve `.css` and `.js` files whose real path is below the pages folder
  (`server.companionFile`) and the core themes under `/themes/` (`server.themeFile`);
  any other file or escaping path 404; every 405 has `Allow`. `Page.css` URLs outside
  the folder are application assets.
- Each browser is its own owner by the cookie `gramlot_owner` (`Path` of the prefix,
  `HttpOnly`, `SameSite=Lax`, session); `ownerForRequest(request)` replaces it.

`@gramlot/gramlot` is a peer dependency, at the version of `server/package.json` (same
instance as the pages, or `instanceof Page` fails). Against an unreleased core, link it
without a path in `package.json`: `npm install --no-save ../gramlot/js`; repeat after a
plain `npm install`.

Both bridges use `@gramlot/gramlot/server` and serve `runtimeAsset()`. Node translates
HTTP streams to Fetch requests; Bun uses native Fetch requests. Shared
`server/src/fetch.mjs` owns HTTP routing, payload parsing, response/error mapping and
the owner of each request; it calls `decodeBody`, `call`, `close`, `companionFile`,
`themeFile` and `openPage` of the core, and `closeAll` on shutdown. `GramlotServer` owns
page execution, registrations, ownership checks and TTL. JSON `POST /gramlot/close` passes
the text and the owner to `GramlotServer.close`. Explicit browser disposal and
non-persisted `pagehide` attempt closure; TTL covers failed delivery. The adapter passes
no identity to `call`: an `auth` rule answers `not_authenticated`.
No database or Python worker is loaded. Unexpected errors produce HTTP 500 and
are delivered to the configurable `onError` callback.

The earlier sibling-PoC server was removed on 2026-10-01 (GN-005).

<a id="gn-010-010"></a>

## 010 · Verification and distribution

Block ID: **GN-010-010**.

Node contract: `npm test -w server` (`server/test/server.test.mjs`,
`quickstart.test.mjs`, `gallery.test.mjs`); Bun, in `server/`: `bun test
test/server.test.mjs test/quickstart.test.mjs test/gallery.test.mjs`. Browser harness
`server/test/browser.mjs` (starts `browser-host.mjs`), run in `server/` with Playwright and
Chromium:

```sh
node test/browser.mjs node /path/to/playwright/index.mjs /path/to/chromium
node test/browser.mjs bun /path/to/playwright/index.mjs /path/to/chromium
```

The browser check covers initial main, typed Source insert/delete/update, a remote
HTML block, disposal and JavaScript errors; then the core's `avvio` page (linked core
checkout) at mount prefix `/app`, strict and permissive CSP: named logic starts under
both, inline starts only under permissive and otherwise fails with the core's error
naming the node. Framework fixtures may manipulate Source; application pages only
declare their elements.

The core `@gramlot/gramlot` is on npm and JSR; this adapter `@gramlot/gramlot-js-server`
on npm. CI (`.github/workflows/tests.yml`) runs the Node and Bun contract tests
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
The example pages, explanations and gallery belong to `gramlot-examples`; the logo and
the shared theme to the core. Python runs in the adapters of gramlot-py-server (Uvicorn,
Django, Flask, FastAPI, Kajenn); JavaScript runs in Node.js/Bun or in the browser Worker
of `@gramlot/gramlot-serverless`. The integration selects the language.
Update the Gramlot dependency, then restart or regenerate the standalone export
to receive changes. Installed environments and exports do not refresh themselves.
Generated assets are outputs, not another source. First-party dependencies remain
unpinned; published 0.1.x and 0.2.0 releases are immutable.

Gallery commands of this repository: `gramlot node gallery`, `gramlot bun gallery`,
`gramlot-serverless gallery` ([GN-130 section 025](../030-reference.md),
[GS-130 section 030](../130-reference.md)).

See the [Gramlot guide](https://github.com/gramlot-org/gramlot/blob/main/docs/public/025-try.md#gc-025-020) for the authoritative shared policy. Public documentation follows `main`; unpublished development changes are not yet part of that public reference.

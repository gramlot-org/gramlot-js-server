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

The core `GramlotServer` contract: `resolvePage(path)` returns the Page class,
`resolveResources(path, PageClass)` returns `{css: [url], js: [{url, group}]}` and
`openPage(path, {owner, prefix})` returns `{pageId, html, nonce}`. Without `server`, the
adapter builds `new GramlotFileServer(pages, options)`; `options` are the
`GramlotServer` options (URLs, `pageTtl`, `maxPages`, `cssTheme`, `collections`) and
`reload`. A custom `server` implements the two resolve methods.

- `mountPath` (default `""`) is passed to `openPage` as the mount prefix at each
  opening and carried by every request path: the adapter removes it, answers 404
  outside it and 301 for the prefix without its final slash. A front server forwards
  the path unchanged.
- `contentSecurityPolicy` (default `null`) is the application's policy. The adapter
  sends it as the `Content-Security-Policy` header of each HTML page, with `{nonce}`
  replaced by the bootstrap nonce of that opening. Strict profile:
  `script-src 'nonce-{nonce}'; object-src 'none'; base-uri 'none'`, named logic only.
  Permissive profile: the same with `'unsafe-eval'`, inline code active.
- GET and HEAD serve a `.css` or `.js` file whose real path is below the pages
  folder (`server.companionFile`): the page modules, the companions and `Page.css`
  files placed there; and a file of the core themes under `/themes/`
  (`server.themeFile`). Every other file of the folder, and every path whose real path
  leaves it, is 404. Any other method answers 405 with an `Allow` header.
  `Page.css` URLs outside the folder are application assets.
- Each browser is its own owner through the cookie `gramlot_owner`, which the page
  response sets (`Path` of the mount prefix, `HttpOnly`, `SameSite=Lax`, a session
  cookie). `ownerForRequest(request)`, when given, replaces the cookie.

`@gramlot/gramlot` is a peer dependency, at the version of `server/package.json`:
the adapter must use the same package instance as the application's pages, or
`instanceof Page` fails. To work against an unreleased core, link a local core
checkout without saving a path in `package.json`:

```sh
npm install --no-save ../gramlot/js
```

A later plain `npm install` removes the link; repeat the command.

Both bridges use `@gramlot/gramlot/server` and serve the packaged runtime asset
(`runtimeAsset()`). Node translates HTTP streams to Fetch requests; Bun uses native
Fetch requests. Shared `server/src/fetch.mjs` owns HTTP routing, payload parsing,
the response and error mapping and the owner of each request; it calls the common API
of the core (`decodeBody`, `call`, `close`, `companionFile`, `themeFile`, `openPage`);
`closeAll` runs on shutdown. `GramlotServer` owns page execution, page registrations,
ownership checks and the TTL. The adapter accepts JSON `POST /gramlot/close`, reads
the owner and passes the text to `GramlotServer.close`. Browser `dispose()` sends a
best-effort close request; non-persisted `pagehide` sends a beacon. The TTL covers
failed delivery. The adapter passes no identity to `GramlotServer.call`: an `auth` rule
answers `not_authenticated`. No database or Python worker is loaded. Unexpected errors
produce HTTP 500 and are delivered to the configurable `onError` callback.

The earlier sibling-PoC server was removed on 2026-10-01; GN-005 records it.

<a id="gn-010-010"></a>

## 010 · Verification and distribution

Block ID: **GN-010-010**.

Run `npm test -w server` for the real Node listener contract
(`server/test/server.test.mjs`, `quickstart.test.mjs` and `gallery.test.mjs`) and, in
`server/`, `bun test test/server.test.mjs test/quickstart.test.mjs test/gallery.test.mjs`
for Bun. The browser harness `server/test/browser.mjs` starts `browser-host.mjs` with the
given runtime and accepts an installed Playwright module and Chromium executable; run it
in `server/`:

```sh
node test/browser.mjs node /path/to/playwright/index.mjs /path/to/chromium
node test/browser.mjs bun /path/to/playwright/index.mjs /path/to/chromium
```

The browser check covers initial main, typed Source insert/delete/update, a remote
HTML block, disposal and JavaScript errors. It then opens the core's `avvio` page
(`js/tests/fixtures/logic/avvio.js` with `avvio_aux.js`, from the linked core checkout)
with mount prefix `/app`, under the strict and the permissive CSP. Named logic starts under
both; an inline page starts under the permissive profile and fails under the strict one with
the core's error naming the node. Framework fixtures may manipulate Source; application pages
only declare their elements.

The core `@gramlot/gramlot` is published on npm and JSR; this adapter is published on npm as
`@gramlot/gramlot-js-server`. The CI workflow `.github/workflows/tests.yml` runs the Node and
Bun contract tests in the required job `published core`, against the core from the registry,
and in the informational job `core main`, against the core's `main` checkout.

<a id="gn-010-015"></a>

## 015 · Shared examples from Gramlot

Block ID: **GN-010-015**.

Node.js and Bun execute the shared JavaScript pages using their respective host adapters.

Gramlot is the primary reference for framework concepts, APIs and the shared
teaching examples. Start with its documentation on Read the Docs and its source
repository. Then choose an integration, read its environment-specific guide and
clone that integration repository to configure and run the examples in that host.

The integration repositories are downstream consumers of Gramlot. The example
pages, their explanations and the gallery belong to `gramlot-examples`; the logo and
the shared theme to the core. Integrations own adapters, environment configuration,
launch commands and hosting instructions. They must consume the shared material from
the dependency rather than maintain copied teaching suites. Generated installation or
export assets are reproducible outputs, not independently maintained sources.

Python examples run inside the adapters of gramlot-py-server (Uvicorn, Django,
Flask, FastAPI, Kajenn). JavaScript examples run inside Node.js/Bun (this package) or
in the browser Worker of `@gramlot/gramlot-serverless`. The integration selects the
execution language; the shared gallery does not ask users to switch between Python and
JavaScript.

To receive changed examples, update the Gramlot dependency following the chosen
integration's setup instructions, then restart the host or rebuild the standalone
export. An existing installation or exported folder does not update itself when
upstream changes. First-party dependencies remain unpinned; the published 0.1.x and 0.2.0
releases remain immutable.

The gallery commands of this repository are `gramlot node gallery`, `gramlot bun
gallery` and `gramlot-serverless gallery`
([GN-130 section 025](../030-reference.md), [GS-130 section 030](../130-reference.md)).

See the [Gramlot guide](https://github.com/gramlot-org/gramlot/blob/main/docs/public/025-try.md#gc-025-020) for the authoritative shared policy. Public documentation follows `main`; unpublished development changes are not yet part of that public reference.


Development verification, 2026-10-20 — Gallery staging now creates parent directories for filesystem routes and stages index_aux.js re-exporting ordinary gallery Logic. Four Node gallery tests pass; Chromium/WebKit pass against the local Node host for nested directories, own index pages, retained tabs and drawers.


<a id="gn-010-020"></a>

## 020 · Numbered gallery paths — 2026-10-21

Block ID: **GN-010-020**.

Owner explicitly authorizes connected catalogue and staging changes: “Sì, adegua anche le integrazioni”. Gallery catalogues require the physical family `folder`; each executable route is staged at its nested `url`, with its companions. Catalogue keys remain lesson identities. Hosted carousel links include the mount path; offline links include the route depth. Numbered path segments, including `00-index`, are supported by the static exporter without accepting traversal or empty segments. Markdown directory descriptions are supplied by the examples navigation and rendered by the gallery. No core loader change, route alias, release or deployment is included.

Verification: four Node gallery tests pass, including mounted resources and launching the alternate runtime. Both documentation builds pass. Live Node checks confirm ordered lazy directories and selection of the Markdown index without console errors.


Intermediate release qualification — 2026-10-21. Owner authorizes tree, pages, gallery and guide only, including the necessary connected integrations. Node and Bun each pass 40 tests; both mounted Chromium galleries pass all 84 common lessons. Nested route staging and Logic companions preserve mount prefixes. Both documentation views build without warnings. Database selectors and Genropy experiments are excluded. Package publication is pending at this checkpoint.

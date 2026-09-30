# 010 · Native HTML hosts

Document ID: **GN-010**. Development implementation, not a released package.

<a id="gn-010-005"></a>

## 005 · Node and Bun

The current clean-core profile is exported as `gramlot-js-server/native` (Node) and
`gramlot-js-server/bun` (Bun). Each exports `startNativeServer({pages, hostname, port})`.
`pages` is the installed application's trusted JS pages directory; `port: 0` selects
an available port. The result exposes `url`, `host`, `server` and asynchronous
`close()`, which closes sockets and clears page registrations.

Both bridges use `@gramlot/native-html/server` and serve the packaged
`@gramlot/native-html/runtime` asset. Node translates HTTP streams to Fetch requests;
Bun uses native Fetch requests. Shared `native-fetch.mjs` owns HTTP routing,
bounded payload parsing, response/error mapping and request identity extraction.
Neutral Host owns page execution, page registrations, ownership checks and TTL.
The adapter also accepts JSON `POST /gramlot/close`, extracts owner identity and
passes the page ID to `Host.closePage`. Browser `dispose()` sends a best-effort close
request; non-persisted `pagehide` sends a beacon. TTL covers failed delivery.
An optional `host` supplies page execution; the adapter's `ownerForRequest(request)`
callback supplies identity without adding HTTP methods to Host; the default anonymous profile is intended for local Hello World.
No database or Python worker is loaded. Unexpected errors produce HTTP 500 and
are delivered to the configurable `onError` callback.

The previous PoC server remains a separate historical entry point. Its sibling-PoC
runtime and tests do not establish compatibility for this native profile.

<a id="gn-010-010"></a>

## 010 · Verification and distribution

Run `npm run test:native` for the real Node listener contract and
`bun test test/native.test.mjs` for Bun. The browser harness accepts an installed
Playwright module and Chromium executable:

```sh
node test/native-browser.mjs node /path/to/playwright/index.mjs /path/to/chromium
node test/native-browser.mjs bun /path/to/playwright/index.mjs /path/to/chromium
```

The browser check covers initial main, typed Source insert/delete/update, a remote
HTML block, disposal and JavaScript errors. Framework fixtures may manipulate Source;
application pages only declare their elements. Hello World launchers live in
`gramlot-examples/apps/hello-world`, as `npm run start:node` and `npm run start:bun`.

First-party dependencies are floating. The new core/generic package graph is local
development work; upstream source availability and clean upstream installation
remain separate gates. Isolated archive tests must not be represented as published
package support. No package release or deployment is part of this profile.


<a id="gn-010-015"></a>

## 015 · Shared examples from Gramlot

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
upstream changes. First-party dependencies remain unpinned; the published 0.1.0
archives remain immutable.

This is the agreed distribution model. The teaching sources already live in
Gramlot under `examples/html_svg`, the runner under `examples/00-runner`, and the
theme under `themes/gramlot-base`. Uniform dependency packaging and example launch
commands across all six integrations still need implementation and verification.
Existing Hello World smoke launchers and historical demos do not establish that
this shared teaching-suite workflow is already available in every integration.

See the [Gramlot guide](https://github.com/gramlot-org/gramlot/blob/main/docs/public/025-try.md#gc-025-020) for the authoritative shared policy. Public documentation follows `main`; unpublished development changes are not yet part of that public reference.

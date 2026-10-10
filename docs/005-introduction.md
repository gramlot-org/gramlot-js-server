# 005 · Introduction

Document ID: **GN-105**. [Concise mirror](../docs_llm/005-introduction.md).

Gramlot describes web interfaces in Python or JavaScript and keeps them bound to
the application state in the browser. [The Gramlot family](https://gramlot.readthedocs.io/en/latest/docs/public/055-family.html)
explains Page, Source, Data, logic and server, and lists the repositories.

<a id="gn-105-005"></a>

## 005 · What this adapter does

Block ID: **GN-105-005**.

gramlot-js-server serves JavaScript Gramlot pages from Node.js 22 or Bun. It
connects a folder of trusted Page modules to the core's `GramlotFileServer` and exposes
the pages over HTTP. `startServer` from `@gramlot/gramlot-js-server/node` runs on
`node:http`; the same function from `@gramlot/gramlot-js-server/bun` runs on `Bun.serve`.
The package also installs the command `gramlot`: `gramlot node gallery` and
`gramlot bun gallery` serve the gallery of `@gramlot/gramlot-examples`
([Reference](030-reference.md)).

The adapter owns the HTTP side: routing, bounded payload parsing, the response
and error mapping, the request identity, the mount prefix and the Content
Security Policy header. The core's `GramlotServer` owns the pages: it finds the Page class,
builds the bootstrap document, runs `main` and the remote Source methods, and
closes the page. No database and no Python process are involved.

<a id="gn-105-010"></a>

## 010 · The request flow on this host

Block ID: **GN-105-010**.

1. **Page URL.** The browser requests `GET /` or `GET /orders`. The adapter asks
   the `GramlotServer` to open the page: `GramlotFileServer` maps the path to `index.js` or
   `orders.js` in the pages folder and registers a page instance with a TTL.
2. **Bootstrap document.** The answer is a small HTML document: a root `div`, a
   module script with a nonce, the page's resources (the `Page.css` URLs, the
   page stylesheet, the page logic module), the URLs `rpcUrl` and `closeUrl` and the
   `capabilities` of the server (none: `[]`).
   The page logic module is the page module itself when it exports `Logic`.
   When a Content Security Policy is configured, the header carries the nonce.
3. **Runtime.** The script imports the Gramlot runtime from `/assets/gramlot.js`,
   served by the adapter from the installed core. An import map of the bootstrap
   resolves `@gramlot/gramlot/page`, imported by the page module, to the same
   runtime.
4. **Main.** The runtime posts the request envelope
   `{id, pageId, contentType: 'source', name: 'main', params: {}}` to `/gramlot/rpc`.
   The adapter passes it to `GramlotServer.call`, which creates the Page instance,
   runs `main(root)` and answers with the response envelope `{id, contentType, value}`:
   `value` is the Source as TYTX JSON.
5. **Source to browser.** The runtime renders the DOM from the Source, installs the
   Data declarations and starts the bindings. Typing in a bound field writes the
   Data; formulas and controllers react; the DOM follows.
6. **Other calls.** Every other call is an envelope on the same `/gramlot/rpc`:
   `contentType: 'source'` builds a Source branch, `contentType: 'data'` runs an
   endpoint (`Page.registerEndpoint`, called by `dataRpc`). A failure is an outcome
   inside the response envelope (`page_expired`, `not_found`, `not_authenticated`,
   `not_authorized`, `application_error`), always with status 200. Source methods
   (`Page.registerSource`, `remoteSource`) are not yet part of the page-writing API:
   they arrive together with the `remote` grammar attribute.
7. **Close.** When the browser leaves the page it posts the page ID to
   `/gramlot/close`; the TTL covers the cases where that request is lost.

<a id="gn-105-015"></a>

## 015 · What this adapter does not do

Block ID: **GN-105-015**.

- Python pages: use [gramlot-py-server](https://github.com/gramlot-org/gramlot-py-server).
- Pages without a server, as one HTML file or a static folder:
  use [@gramlot/gramlot-serverless](105-introduction.md).
- Every file of the application: the adapter serves the runtime, the files of the
  core themes under `/themes/`, the `.css` and `.js` files below the pages folder and the
  files listed in `assets` ([Configuration](020-configuration.md)); a front server
  serves the rest ([Deployment](025-deployment.md)).
- Authentication: the adapter passes a request identity to the `GramlotServer` through
  `ownerForRequest`; it does not implement sessions or logins.

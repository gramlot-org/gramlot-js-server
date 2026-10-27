# 005 · Introduction

Document ID: **GN-105**. [Expanded version](../docs/005-introduction.md).

Gramlot describes web interfaces in Python or JavaScript, bound to application
state in the browser: [The Gramlot family](https://gramlot.readthedocs.io/en/latest/docs/public/055-family.html).

Start with [the Node/Bun tutorial](010-tutorial.md) for a live server, or
[the serverless tutorial](135-serverless-tutorial.md) for a browser/Worker export.
Use [configuration](020-configuration.md) and [deployment](025-deployment.md)
after the first page works.

For HTML, components and binding, follow the
[core learning route](https://gramlot.readthedocs.io/en/latest/docs/public/025-try.html).
This manual explains hosting; it does not repeat the widget reference.

<a id="gn-105-005"></a>

## 005 · What this adapter does

Block ID: **GN-105-005**.

Serves JavaScript Gramlot pages from Node.js 22 (`@gramlot/gramlot-js-server/node`,
`node:http`) or Bun (`@gramlot/gramlot-js-server/bun`, `Bun.serve`) through the core's
`GramlotFileServer`. Adapter: routing, payload parsing, response and error mapping,
owner of each request, mount prefix, CSP header. Core `GramlotServer`: page lookup,
bootstrap, `main`, remote Source, close. The adapter follows the public
[server protocol](https://gramlot.readthedocs.io/en/latest/docs/public/101-server-protocol.html), Part B (methods and `Allow`, status
codes, owner cookie, headers). No database, no Python. Command `gramlot node|bun
gallery`: the gallery of `@gramlot/gramlot-examples` ([Reference](030-reference.md)).

<a id="gn-105-010"></a>

## 010 · The request flow on this host

Block ID: **GN-105-010**.

1. `GET /orders` → `GramlotFileServer` maps to `orders.js`, registers a page with a TTL.
2. Bootstrap HTML: root `div`, nonce module script, resources (base theme, `Page.css`,
   the page module when it exports `Logic`, else `<name>_aux.js`), `rpcUrl`, `closeUrl`,
   `capabilities: []`, `nameSyntax`; CSP header when configured; owner cookie `gramlot_owner`.
3. Runtime from `/assets/gramlot.js` (installed core); the import map resolves
   `@gramlot/gramlot/page` of the page module to it.
4. `POST /gramlot/rpc` with the envelope `{id, pageId, contentType: 'source', name: 'main', params: {}}`
   → `GramlotServer.call` → `main(root)` → `{id, contentType, value}`, `value` the Source as TYTX JSON.
5. Runtime renders the DOM, installs Data declarations, starts bindings.
6. Every other call: an envelope on `/gramlot/rpc`, `contentType` `source` (Source branch)
   or `data` (endpoint, `Page.registerEndpoint`, `dataRpc`); failures are outcomes in the
   envelope (`page_expired`, `not_found`, `not_authenticated`, `not_authorized`,
   `application_error`), status 200. Declare Source fragments with `Page.registerSource` and mount them with `remote`;
use `dataRpc` for endpoint values and `dataRemote` for lazy Data. See [Calling the server](https://github.com/gramlot-org/gramlot/blob/main/docs/public/098-server-calls.md#gc-095-100)
and [Remote content and lazy Data](https://github.com/gramlot-org/gramlot/blob/main/docs/public/099-remote-content.md#gc-095-105).
7. Leaving the page → `POST /gramlot/close`; a page that no call names for `pageTtl`
   seconds expires (every call to a live page starts the period again), which covers lost closes.

<a id="gn-105-015"></a>

## 015 · What this adapter does not do

Block ID: **GN-105-015**.

- Python pages: [gramlot-py-server](https://github.com/gramlot-org/gramlot-py-server).
- No server: [@gramlot/gramlot-serverless](105-introduction.md).
- Files beyond the runtime, `/themes/`, `.css`/`.js` below the pages folder and
  `assets`: a front server ([Deployment](025-deployment.md)).
- Sessions and logins: the owner is the cookie `gramlot_owner` or `ownerForRequest`; no
  identity reaches `GramlotServer`, so an `auth` rule answers `not_authenticated`.

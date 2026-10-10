# 005 · Introduction

Document ID: **GN-105**. [Expanded version](../docs/005-introduction.md).

Gramlot describes web interfaces in Python or JavaScript, bound to application
state in the browser: [The Gramlot family](https://gramlot.readthedocs.io/en/latest/docs/public/055-family.html).

<a id="gn-105-005"></a>

## 005 · What this adapter does

Block ID: **GN-105-005**.

Serves JavaScript Gramlot pages from Node.js 22 (`@gramlot/gramlot-js-server/node`,
`node:http`) or Bun (`@gramlot/gramlot-js-server/bun`, `Bun.serve`) through the core's
`GramlotFileServer`. Adapter: routing, bounded payloads, response and error mapping,
request identity, mount prefix, CSP header. Core `GramlotServer`: page lookup, bootstrap,
`main`, remote Source, close. No database, no Python. Command `gramlot node|bun
gallery`: the gallery of `@gramlot/gramlot-examples` ([Reference](030-reference.md)).

<a id="gn-105-010"></a>

## 010 · The request flow on this host

Block ID: **GN-105-010**.

1. `GET /orders` → `GramlotFileServer` maps to `orders.js`, registers a page with a TTL.
2. Bootstrap HTML: root `div`, nonce module script, resources (the page module
   when it exports `Logic`), `rpcUrl`, `closeUrl`, `capabilities: []`; CSP header when configured.
3. Runtime from `/assets/gramlot.js` (installed core); the import map resolves
   `@gramlot/gramlot/page` of the page module to it.
4. `POST /gramlot/rpc` with the envelope `{id, pageId, contentType: 'source', name: 'main', params: {}}`
   → `GramlotServer.call` → `main(root)` → `{id, contentType, value}`, `value` the Source as TYTX JSON.
5. Runtime renders the DOM, installs Data declarations, starts bindings.
6. Every other call: an envelope on `/gramlot/rpc`, `contentType` `source` (Source branch)
   or `data` (endpoint, `Page.registerEndpoint`, `dataRpc`); failures are outcomes in the
   envelope (`page_expired`, `not_found`, `not_authenticated`, `not_authorized`,
   `application_error`), status 200. Source methods (`Page.registerSource`, `remoteSource`) are not yet part of the page-writing API: they arrive together with the `remote` grammar attribute.
7. Leaving the page → `POST /gramlot/close`; the TTL covers lost closes.

<a id="gn-105-015"></a>

## 015 · What this adapter does not do

Block ID: **GN-105-015**.

- Python pages: [gramlot-py-server](https://github.com/gramlot-org/gramlot-py-server).
- No server: [@gramlot/gramlot-serverless](105-introduction.md).
- Files beyond the runtime, `/themes/`, `.css`/`.js` below the pages folder and
  `assets`: a front server ([Deployment](025-deployment.md)).
- Sessions and logins: only `ownerForRequest` passes an identity.

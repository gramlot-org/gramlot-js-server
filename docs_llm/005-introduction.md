# 005 · Introduction

Document ID: **GN-105**. [Expanded version](../docs/005-introduction.md).

Gramlot describes web interfaces in Python or JavaScript, bound to application
state in the browser: [The Gramlot family](https://gramlot.readthedocs.io/en/latest/docs/public/055-family.html).

<a id="gn-105-005"></a>

## 005 · What this adapter does

Block ID: **GN-105-005**.

Serves JavaScript Gramlot pages from Node.js 22 (`@gramlot/gramlot-js-server/native`,
`node:http`) or Bun (`@gramlot/gramlot-js-server/bun`, `Bun.serve`) through the core's
`FileHost`. Adapter: routing, bounded payloads, response and error mapping,
request identity, mount prefix, CSP header. Core Host: page lookup, bootstrap,
`main`, remote Source, close. No database, no Python.

<a id="gn-105-010"></a>

## 010 · The request flow on this host

Block ID: **GN-105-010**.

1. `GET /orders` → `FileHost` maps to `orders.js`, registers a page with a TTL.
2. Bootstrap HTML: root `div`, nonce module script, resources, endpoint URLs; CSP
   header when configured.
3. Runtime from `/assets/gramlot.js` (served from the linked core).
4. `POST /gramlot/main` with the page ID → `main(root)` → Source as TYTX JSON.
5. Runtime renders the DOM, installs Data declarations, starts bindings.
6. Named logic may call `remoteSource` → `POST /gramlot/source`.
7. Leaving the page → `POST /gramlot/close`; the TTL covers lost closes.

<a id="gn-105-015"></a>

## 015 · What this adapter does not do

Block ID: **GN-105-015**.

- Python pages: [gramlot-uvicorn](https://github.com/gramlot-org/gramlot-uvicorn).
- No server: [@gramlot/gramlot-serverless](105-introduction.md).
- Assets outside the pages folder: a front server ([Deployment](025-deployment.md)).
- Sessions and logins: only `ownerForRequest` passes an identity.

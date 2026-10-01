# 025 · Deployment

Document ID: **GN-125**. [Expanded version](../docs/025-deployment.md).

<a id="gn-125-005"></a>

## 005 · Behind a reverse proxy with a mount prefix

Block ID: **GN-125-005**.

Start with `mountPath: '/app'`; the front strips `/app/` and forwards to the
adapter root.

```nginx
location /app/ {
    proxy_pass http://127.0.0.1:8080/;
    proxy_set_header Host $host;
}
```

Browser: `/app/`, `/app/assets/gramlot.js`, `/app/gramlot/main`, `/app/index.css`;
adapter: `/`, `/assets/gramlot.js`, `/gramlot/main`, `/index.css`.
`server/test/browser-host.mjs` runs the pattern with a `node:http` front.
No front: default `mountPath`, bind `hostname`.

<a id="gn-125-010"></a>

## 010 · Static assets

Block ID: **GN-125-010**.

Served by the adapter: the runtime (read once from the core's `dist/gramlot.js`),
`*.css` and `*_aux.js` below the pages folder, the bootstrap HTML. Everything
else: front server or application. A `Page.css` URL outside the folder gets the
prefix and is requested from the front.

<a id="gn-125-015"></a>

## 015 · Security notes

Block ID: **GN-125-015**.

- Pages folder = trusted code run by the server process.
- Never served: page modules, READMEs, other extensions, symlinks and `..` leaving
  the folder.
- Companions are public: no keys, queries or data access in them.
- CSP: strict with named logic only; permissive with inline code.
- Identity: default `ownerForRequest` lets any client with a page ID read it.
- Bodies > 4096 bytes: 413; `pageTtl`, `maxPages` bound the registry.
- 500 responses carry a fixed text; the error goes to `onError`.

<a id="gn-125-020"></a>

## 020 · Production checklist

Block ID: **GN-125-020**.

Node 22+ or Bun with the core linked; core `js/dist/gramlot.js` built;
`pages` = deployed folder only; `mountPath` = stripped prefix; CSP profile set;
`ownerForRequest` from the session; `onError` logged; assets on the front;
process manager, restart on page changes.

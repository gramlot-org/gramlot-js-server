# 025 · Deployment

Document ID: **GN-125**. [Expanded version](../docs/025-deployment.md).

<a id="gn-125-005"></a>

## 005 · Behind a reverse proxy with a mount prefix

Block ID: **GN-125-005**.

Start with `mountPath: '/app'`; the adapter serves under `/app/` and removes the
prefix itself; the front forwards the path unchanged.

```nginx
location /app/ {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
}
```

Browser and adapter see the same paths (`/app/`, `/app/assets/gramlot.js`, …).
Until 0.2.3 the front removed `/app/` (`proxy_pass …:8080/;`): with 0.2.4 that
answers 404. `server/test/browser-host.mjs` serves `/app` with no front.
No front: bind `hostname`.

<a id="gn-125-010"></a>

## 010 · Static assets

Block ID: **GN-125-010**.

Served by the adapter: the runtime (read once from the core's `dist/gramlot.js`),
every file of `/themes/` of the installed core, `.css` and `.js` below the pages folder,
the files of `assets`, the bootstrap HTML. Everything else: front server or
application. A `Page.css` URL outside these gets the prefix and is requested
from the front.

<a id="gn-125-015"></a>

## 015 · Security notes

Block ID: **GN-125-015**.

- Pages folder = trusted code run by the server process.
- Never served: READMEs, other extensions, symlinks and `..` leaving the folder.
- Page modules and stylesheets are public: no keys, queries or data access in the
  pages folder.
- CSP: strict with named logic only; permissive with inline code.
- Identity: default `ownerForRequest` lets any client with a page ID read it.
- Bodies > 4096 bytes: 413; `pageTtl`, `maxPages` bound the registry.
- 500 responses carry a fixed text; the error goes to `onError`.

<a id="gn-125-020"></a>

## 020 · Production checklist

Block ID: **GN-125-020**.

Node 22+ or Bun with the core and the adapter installed from npm;
`pages` = deployed folder only (the template `serve.mjs` of `npm create @gramlot` is for
development: the page template serves the project folder, `node_modules` included;
deploy the `npm run build` output or a folder of pages only); `mountPath` = prefix of the front location,
`proxy_pass` without URI; CSP profile set; `ownerForRequest` from the session;
`onError` logged; other assets in `assets` or on the front;
process manager, restart on page changes.

# 025 · Deployment

Document ID: **GN-125**. [Concise mirror](../docs_llm/025-deployment.md).

<a id="gn-125-005"></a>

## 005 · Behind a reverse proxy with a mount prefix

Block ID: **GN-125-005**.

The adapter listens on one address and expects request paths without the mount.
A front server mounts it under a prefix, strips the prefix and forwards the rest.
The adapter is started with the same prefix as `mountPath`, so the bootstrap
URLs sent to the browser carry it.

```js
const app = await startNativeServer({pages, hostname: '127.0.0.1', port: 8080, mountPath: '/app'});
```

nginx location for that server:

```nginx
location /app/ {
    proxy_pass http://127.0.0.1:8080/;
    proxy_set_header Host $host;
}
```

The trailing slash in `proxy_pass` makes nginx replace `/app/` with `/`. The
browser requests `/app/`, `/app/assets/gramlot.js`, `/app/gramlot/main` and
`/app/index.css`; the adapter receives `/`, `/assets/gramlot.js`, `/gramlot/main`
and `/index.css`. The test `test/native-browser-host.mjs` of this repository runs
the same pattern with a stripping front written in `node:http`.

Without a front server, leave `mountPath` at its default and bind `hostname`
to the address to expose.

<a id="gn-125-010"></a>

## 010 · Static assets

Block ID: **GN-125-010**.

The adapter serves three kinds of files and nothing else:

- the runtime at `runtimeUrl` (`/assets/gramlot.js`), read once at start from
  the linked core's `dist/gramlot.js`;
- the page stylesheets and companions below the pages folder (`*.css`,
  `*_aux.js`);
- the HTML bootstrap document of each page.

Images, fonts, a shared theme outside the pages folder and every other asset are
served by the front server or by the application. A `Page.css` URL that points
there (`/static/theme.css`) receives the mount prefix and is requested from the
front server, not from the adapter.

<a id="gn-125-015"></a>

## 015 · Security notes

Block ID: **GN-125-015**.

- **Trusted pages folder.** Page modules are imported by the server process;
  they run with its privileges. Only deployed application code belongs in the
  folder.
- **Never served.** Page modules, READMEs, files of other extensions, files
  reached through a symlink or `..` outside the folder: all answer 404.
- **Companions are public.** `*_aux.js` and `*.css` are sent to the browser.
  Keys, queries and data access stay in modules the companion does not import.
- **Content Security Policy.** Choose the strict profile when every page uses
  named logic; the permissive profile when a page still has inline code
  ([Configuration](020-configuration.md)).
- **Request identity.** With the default `ownerForRequest`, any client that
  learns a page ID can request its Source. Derive the owner from the
  application's session when pages carry user data.
- **Payloads.** JSON bodies above 4096 bytes answer 413; `pageTtl` and
  `maxPages` bound the registry.
- **Errors.** Unexpected errors answer 500 with a fixed text and reach
  `onError`; the message is not sent to the browser.

<a id="gn-125-020"></a>

## 020 · Production checklist

Block ID: **GN-125-020**.

- [ ] Node.js 22 or later, or Bun, with the core checkout linked
      (`npm install --no-save ../gramlot/js ../gramlot-js-server`).
- [ ] The core's `js/dist/gramlot.js` built (`npm --prefix ../gramlot/js run build`).
- [ ] `pages` points to the deployed pages folder; nothing else lives there.
- [ ] `mountPath` equals the prefix the front server strips.
- [ ] `contentSecurityPolicy` set to the strict or the permissive profile.
- [ ] `ownerForRequest` derives the owner from the session when needed.
- [ ] `onError` connected to the application's logging.
- [ ] Assets outside the pages folder served by the front server.
- [ ] A process manager restarts the server; a changed page needs a restart.

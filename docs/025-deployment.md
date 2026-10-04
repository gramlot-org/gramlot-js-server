# 025 · Deployment

Document ID: **GN-125**. [Concise mirror](../docs_llm/025-deployment.md).

<a id="gn-125-005"></a>

## 005 · Behind a reverse proxy with a mount prefix

Block ID: **GN-125-005**.

The adapter listens on one address and serves its pages under the prefix
`mountPath`: the bootstrap URLs sent to the browser carry it, and the adapter
removes it from each request path. A front server forwards the path unchanged.

```js
const app = await startServer({pages, hostname: '127.0.0.1', port: 8080, mountPath: '/app'});
```

nginx location for that server:

```nginx
location /app/ {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
}
```

`proxy_pass` without a URI forwards the path unchanged. The browser requests
`/app/`, `/app/assets/gramlot.js`, `/app/gramlot/main` and `/app/index.css`, and
the adapter receives the same paths. Until 0.2.3 the adapter expected the paths
without the prefix and the example wrote `proxy_pass http://127.0.0.1:8080/;`,
with the slash that makes nginx remove `/app/`: with 0.2.4 that configuration
answers 404. The test `server/test/browser-host.mjs` of this repository serves
`/app` from the adapter with no front server.

Without a prefix, leave `mountPath` at its default. Without a front server, bind
`hostname` to the address to expose.

<a id="gn-125-010"></a>

## 010 · Static assets

Block ID: **GN-125-010**.

The adapter serves these files and nothing else:

- the runtime at `runtimeUrl` (`/assets/gramlot.js`), read once at start from
  the installed core's `dist/gramlot.js`;
- every file of the core themes under `/themes/`, from the installed core, with
  the media type of its extension;
- the `.css` and `.js` files below the pages folder: page modules, `_aux.js`
  modules, stylesheets;
- the files listed in `assets` ([Configuration](020-configuration.md));
- the HTML bootstrap document of each page.

Other images, fonts and assets are served by the front server or by the
application. A `Page.css` URL that points there (`/static/fonts.css`) receives the
mount prefix and is requested from the front server, not from the adapter.

<a id="gn-125-015"></a>

## 015 · Security notes

Block ID: **GN-125-015**.

- **Trusted pages folder.** Page modules are imported by the server process;
  they run with its privileges. Only deployed application code belongs in the
  folder.
- **Never served.** READMEs, files of other extensions, files reached through a
  symlink or `..` outside the folder: all answer 404.
- **Page modules are public.** Every `.js` and `.css` file of the pages folder can
  be requested by the browser, which imports the page module for its `Logic`.
  Keys, queries and data access stay in modules outside the pages folder, which
  the page modules do not import.
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

- [ ] Node.js 22 or later, or Bun, with the core and the adapter installed
      (`npm install @gramlot/gramlot @gramlot/gramlot-js-server`); the core's
      npm package ships the runtime `dist/gramlot.js`.
- [ ] `pages` points to the deployed pages folder; nothing else lives there.
- [ ] `mountPath` equals the prefix of the front server location; `proxy_pass`
      forwards the path unchanged (no URI).
- [ ] `contentSecurityPolicy` set to the strict or the permissive profile.
- [ ] `ownerForRequest` derives the owner from the session when needed.
- [ ] `onError` connected to the application's logging.
- [ ] Assets outside the pages folder listed in `assets` or served by the front
      server.
- [ ] A process manager restarts the server; a changed page needs a restart.

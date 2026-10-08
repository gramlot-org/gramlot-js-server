# 040 · Troubleshooting

Document ID: **GN-140**. [Concise mirror](../docs_llm/040-troubleshooting.md).

<a id="gn-140-005"></a>

## 005 · A companion answers 404

Block ID: **GN-140-005**.

**Symptom.** The browser requests `/index.css` or `/index.js` and receives
404; the page has no style or its named logic is missing.

**Causes.** The file is not below the pages folder: it is a symlink to another
place, or the path contains `..`. Or the file does not share the page's name
(`index.css` for `index.js`). Or the request path does not carry the mount
prefix: a front server configured for 0.2.3 removes it
(`proxy_pass http://127.0.0.1:8080/;`), and since 0.2.4 the adapter answers 404
outside `mountPath`.

**Fix.** Place the file beside the page with the page's name; configure the front
server to forward the path unchanged (`proxy_pass` without URI,
[Deployment](025-deployment.md)). Only `.css` and `.js` files below the pages
folder are served; other files are application assets (`assets`).

<a id="gn-140-010"></a>

## 010 · Inline code blocked under the strict policy

Block ID: **GN-140-010**.

**Symptom.** With the strict `contentSecurityPolicy` the page reports:

```text
dataFormula 'dataFormula_0' 'formula': inline code blocked by the Content Security
Policy of the page (no 'unsafe-eval'); move the code to named logic (a method of
the page's class Logic) or serve the page with the permissive CSP profile, which
allows 'unsafe-eval'
```

**Cause.** The declaration holds inline code (`formula`, `script`, `==`,
`action`, `connect_on<event>`, `_if`/`_else`) and the policy has no `'unsafe-eval'`.

**Fix.** Move the code to a method of the page's `Logic` and name it with `func`; or serve the page with the permissive profile
([Configuration](020-configuration.md)).

<a id="gn-140-015"></a>

## 015 · Page expired

Block ID: **GN-140-015**.

**Symptom.** `POST /gramlot/main` or `/gramlot/source` answers 404 `Not found`
for a page that was open.

**Causes.** More than `pageTtl` seconds (default 1800) passed since the opening;
the page was closed; the server restarted and its registry is empty; the
request's owner differs from the owner at opening.

**Fix.** Reload the page: a new opening registers a new page ID. Raise `pageTtl`
for long-lived pages. Keep `ownerForRequest` stable for the same client.

<a id="gn-140-020"></a>

## 020 · The core linked twice

Block ID: **GN-140-020**.

**Symptom.** Opening a page answers 500 and `onError` receives
`TypeError: Page modules must export a subclass of Page`, although the page
extends `Page`.

**Cause.** The page and the adapter import two different copies of
`@gramlot/gramlot`: one through the application's `node_modules`, another
through the adapter's. `instanceof Page` fails across copies.

**Fix.** Install the core once, in the application:
`npm install @gramlot/gramlot @gramlot/gramlot-js-server`. The core is a peer
dependency of the adapter, so both resolve the application's copy. With a
linked core checkout, link it once for both, so the two imports resolve to the
same real path.

<a id="gn-140-025"></a>

## 025 · Other errors

Block ID: **GN-140-025**.

- **`Not found` on a page that exists.** The path has a segment outside
  letters, digits, `_` and `-`, or ends in `_aux`. Check the file name.
- **500 with `Page modules must export a subclass of Page`, one core copy.** The
  module exports no `Page`, or `Page` does not extend the core's `Page`.
- **`ENOENT` naming `dist/gramlot.js` at start.** The linked core is not built:
  `npm --prefix ../gramlot/js run build`.
- **`requires need a GramlotServer with a resource system`.** The page declares
  `js_requires` or `css_requires`; `GramlotFileServer` has no resource system. Use the
  page's `Logic`.
- **`Two logic modules for one page`.** The page module exports `Logic` and an
  `_aux.js` beside it exports another: keep one.
- **The browser cannot import the page module** (`Failed to resolve module
  specifier`). The page module imports a package that exists only on the server:
  move that import to a module the page module does not import, or keep the logic
  in `_aux.js`. `@gramlot/gramlot/page` resolves through the import map.
- **`The gallery needs @gramlot/gramlot-examples`.** `gramlot … gallery` without
  the examples package: `npm install @gramlot/gramlot-examples`.
- **Payload too large (413).** A JSON body above 4096 bytes; send less data.
- **A changed page is not visible.** Modules are cached by the runtime; restart
  the server.

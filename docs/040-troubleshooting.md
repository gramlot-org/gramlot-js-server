# 040 · Troubleshooting

Document ID: **GN-140**. [Concise mirror](../docs_llm/040-troubleshooting.md).

<a id="gn-140-005"></a>

## 005 · A companion answers 404

Block ID: **GN-140-005**.

**Symptom.** The browser requests `/index.css` or `/index_aux.js` and receives
404; the page has no style or its named logic is missing.

**Causes.** The file is not below the pages folder: it is a symlink to another
place, or the path contains `..`. Or the file does not share the page's name
(`index.css` for `index.js`). Or the request carries the mount prefix because
the front server did not strip it: `/app/index.css` reaches the adapter.

**Fix.** Place the file beside the page with the page's name; configure the front
server to strip `mountPath` ([Deployment](025-deployment.md)). Only `.css` and
`_aux.js` are served; other files are application assets.

<a id="gn-140-010"></a>

## 010 · Inline code blocked under the strict policy

Block ID: **GN-140-010**.

**Symptom.** With the strict `contentSecurityPolicy` the page reports:

```text
dataFormula 'dataFormula_0' 'formula': inline code blocked by the Content Security
Policy of the page (no 'unsafe-eval'); move the code to named logic (a method of
the page companion _aux.js) or serve the page with the permissive CSP profile,
which allows 'unsafe-eval'
```

**Cause.** The declaration holds inline code (`formula`, `script`, `==`,
`action`, `connect_on<event>`, `_if`/`_else`) and the policy has no `'unsafe-eval'`.

**Fix.** Move the code to a method of `Logic` in the page companion and name it
with `func`; or serve the page with the permissive profile
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
`@gramlot/native-html`: one through the application's `node_modules`, another
through the adapter's. `instanceof Page` fails across copies.

**Fix.** Link one core checkout for both: in the application,
`npm install --no-save ../gramlot/js ../gramlot-js-server`, so the application's
link and the adapter's link resolve to the same real path.

<a id="gn-140-025"></a>

## 025 · Other errors

Block ID: **GN-140-025**.

- **`Not found` on a page that exists.** The path has a segment outside
  letters, digits, `_` and `-`, or ends in `_aux`. Check the file name.
- **500 with `Page modules must export a subclass of Page`, one core copy.** The
  module exports no `Page`, or `Page` does not extend the core's `Page`.
- **`ENOENT` naming `dist/gramlot.js` at start.** The linked core is not built:
  `npm --prefix ../gramlot/js run build`.
- **`requires need a Host with a resource system`.** The page declares
  `js_requires` or `css_requires`; `FileHost` has no resource system. Use the
  companion for the page's logic.
- **Payload too large (413).** A `params` object above 4096 bytes; send less data
  or load it server-side in the Source method.
- **A changed page is not visible.** Modules are cached by the runtime; restart
  the server.

# 040 · Troubleshooting

Document ID: **GN-140**. [Expanded version](../docs/040-troubleshooting.md).

<a id="gn-140-005"></a>

## 005 · A companion answers 404

Block ID: **GN-140-005**.

`/index.css` or `/index_aux.js` 404: the file is a symlink or path leaving the
pages folder, does not share the page's name, or the request still carries the
mount prefix. Place it beside the page by name; strip `mountPath` on the front.
Only `.css` and `_aux.js` are served.

<a id="gn-140-010"></a>

## 010 · Inline code blocked under the strict policy

Block ID: **GN-140-010**.

`EvalError` `… inline code blocked by the Content Security Policy of the page (no
'unsafe-eval') …`: the declaration is inline (`formula`, `script`, `==`, `action`,
`connect_on<event>`, `_if`/`_else`). Move it to a `Logic` method named with
`func`, or use the permissive profile ([Configuration](020-configuration.md)).

<a id="gn-140-015"></a>

## 015 · Page expired

Block ID: **GN-140-015**.

main/source 404 for an open page: `pageTtl` (1800 s) elapsed, page closed,
server restarted, or a different owner. Reload; raise `pageTtl`; keep
`ownerForRequest` stable.

<a id="gn-140-020"></a>

## 020 · The core linked twice

Block ID: **GN-140-020**.

500 with `TypeError: Page modules must export a subclass of Page` on a page that
extends `Page`: two copies of `@gramlot/gramlot`. Link one checkout for both:
`npm install --no-save ../gramlot/js ../gramlot-js-server` in the application.

<a id="gn-140-025"></a>

## 025 · Other errors

Block ID: **GN-140-025**.

- `Not found` on an existing page: bad segment or `_aux` name.
- 500 `Page modules must export a subclass of Page`, one copy: no `Page` export
  or not extending the core's `Page`.
- `ENOENT` on `dist/gramlot.js` at start: `npm --prefix ../gramlot/js run build`.
- `requires need a Host with a resource system`: drop `js_requires`/`css_requires`.
- 413: `params` above 4096 bytes.
- A changed page not visible: restart the server.

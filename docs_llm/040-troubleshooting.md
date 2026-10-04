# 040 · Troubleshooting

Document ID: **GN-140**. [Expanded version](../docs/040-troubleshooting.md).

<a id="gn-140-005"></a>

## 005 · A companion answers 404

Block ID: **GN-140-005**.

`/index.css` or `/index.js` 404: the file is a symlink or path leaving the pages
folder, does not share the page's name, or the request path lacks the mount
prefix (a 0.2.3 front that removes it). Place it beside the page by name; forward
the path unchanged (`proxy_pass` without URI). Only `.css` and `.js` below the
pages folder are served.

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
extends `Page`: two copies of `@gramlot/gramlot`. Install the core once,
in the application: `npm install @gramlot/gramlot @gramlot/gramlot-js-server` (peer
dependency); a linked checkout is linked once for both.

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
- `Two logic modules for one page`: `Logic` in the module and in `_aux.js`; keep one.
- Browser cannot resolve an import of the page module: a server-only import; move
  it out or use `_aux.js`.
- `The gallery needs @gramlot/gramlot-examples`: install it.

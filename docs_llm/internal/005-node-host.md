---
orphan: true
---

# 005 · Node hosting experiment

> **Naming (2026-10-02):** in the dated text of this document, "native" as the label of a release, profile, milestone, adapter, module, API or pages names the scope of the 0.1.0 milestone (no web components, no recipes). That label has no technical meaning; current documents do not use it ([GC-005 §030](https://github.com/gramlot-org/gramlot/blob/main/docs/005-documentation-policy.md#gc-005-030)). "native" for browser controls, DOM events, HTML attributes, DOM operations, Bag events or platform APIs keeps its technical meaning. Dated text is not rewritten.

Historical sibling-PoC `npm start` server, outside native 0.1.0. Use
[GN-010](010-hosts.md) for current Node/Bun APIs and launchers.

Document ID: **GN-005**. [Expanded version](../../docs/internal/005-node-host.md).

<a id="gn-005-005"></a>
## 005 · Scope and ownership

Block ID: **GN-005-005**.

The owner approved JavaScript authoring for this local PoC on 2026-09-16 and
selected native node:http. Node creates a fresh HtmlBuilder and SourceBag for
each page request. Its fluent grammar declares the UI, Data seeds, formula and
Source action. Bag.toTytx serializes the Source; browser GramlotBuilder.loadSource
reconstructs it and Application mounts the ordinary Gramlot runtime.

The host owns the HTML shell, HTTP routing, manifest-based asset serving and
bootstrap/disposal. Application code has no DOM construction, listeners, input
scraping, custom requests or parallel state. No resolver is needed for this
non-remote slice. No database, RPC, authentication, sessions, SSR HTML, persistent
Data or development reload is implemented. Data resets on page reload.

<a id="gn-005-010"></a>
## 010 · Dependency and reproduction

Block ID: **GN-005-010**.

Consume the existing sibling laboratory distribution in place; no bulk port or
framework copy is performed. Evidence: gramlot-poc HEAD
`e2127a1582cdcd62c21b2612741576527aabbfc3`, browser manifest build
`3bca85304c002e75`. These identify the inspected checkout and generated assets;
HEAD alone does not assert that generated assets are committed or reproducible.
A different distribution is unverified. Node v23.11.0 was used locally;
package.json requests Node >=22, without a multi-version compatibility claim.

Run npm start; the host binds loopback only at port 8070 (PORT may override).
GRAMLOT_BROWSER_DIR selects a different prepared browser distribution. No install
is required for production code. npm test uses node:test and the sibling PoC's
jsdom dependency for DOM integration. No external network service is required.

<a id="gn-005-015"></a>
## 015 · Verification and limitations

Block ID: **GN-005-015**.

Tests cover HTTP pages, TYTX reconstruction, health, GET/HEAD/405/404 handling,
manifest asset delivery, traversal rejection and malformed asset URLs. DOM tests
mount serialized Source into the compiled runtime and exercise live input to
formula updates and repeated counter actions. Click tests respect the runtime's
200ms duplicate-click guard. A Source node's label property shadows the label
builder method; the page uses the existing child SourceBag grammar for that tag.

Real in-app browser verification passed against the final server: the page
rendered, entering Ada produced Hello, Ada!, clicking Increment displayed 1,
and navigation to /about rendered the second page. Both automated tests passed.
The host is a local PoC, with no public deployment or release. New work stays on
develop pending owner acceptance. Documentation namespace GN, mirrored paths and
anchors are established; no documentation site is created.

<a id="gn-005-020"></a>
## 020 · Demo presentation convention

Block ID: **GN-005-020**.

Owner direction, 2026-09-16: every demo exposes Show source and the shared
Inspector launcher in a bottom corner, with a polished, engaging presentation.
Both Node pages share a responsive blue/gold visual design. Show source opens
a Source-declared panel containing the actual pages.mjs module read by Node;
visibility is controlled through a Data Bag. Styling is separated in theme.mjs.
GramlotBuilder activates the existing Inspector, whose launcher is styled as a
fixed bottom-right icon with its accessible label and keyboard shortcut retained.
This convention applies to future demos; other repositories have not been audited
or retrofitted in this change.

Verification: both automated tests pass, including source-panel visibility and
content. Browser checks confirmed source open/close, Inspector lazy loading with
Data/Source tabs, launcher presence on both pages, and narrow-screen appearance.

The header identifies the example as a Gramlot SPA and displays the existing
Gramlot logo, copied unchanged from gramlot-poc/assets/gramlot-logo.png. Playground
and explanation navigation now toggles Source-declared views through Data Bags,
without page reload or state loss. /about remains an initial-view entry URL.
Source access is a prominent header button; the shared Inspector remains fixed
bottom-right. The automated runtime check covers view switching and state retention.

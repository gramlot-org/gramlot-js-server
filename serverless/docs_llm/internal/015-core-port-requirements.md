# 015 · Core contract

Document ID: **GS-015**.

[Paired view](../../docs/internal/015-core-port-requirements.md).

<a id="gs-015-005"></a>

## 005 · Required integration

Block ID: **GS-015-005**.

The integration imports Gramlot from @gramlot/gramlot and Host/Page through
the browser-safe /host and /page public entries, and `PageBootstrap` from the root
entry. Serverless owns /worker-host and /standalone. It requires core >=0.2.0
(`@gramlot/gramlot`, released on JSR on 2026-09-30) and `@genrojs/builders`
>=0.4.0. The 0.1.x archives do not provide this boundary. It consumes packaged runtime notices and HtmlBuilder's
static renderer. Attribute-only template interpolation is required so embedded
JavaScript template literals remain unchanged. No installed dependency is patched.

<a id="gs-015-010"></a>

## 010 · Superseded proposal

Block ID: **GS-015-010**.

The Python compiler provider, capability declaration gate, embedded precomputed
Source and complete-v1 envelope were provisional contracts. They are superseded
by the owner's dedicated JS Worker-host decision; no compatibility route remains.

<a id="gs-015-015"></a>
<a id="gs-015-020"></a>
<a id="gs-015-025"></a>
<a id="gs-015-030"></a>

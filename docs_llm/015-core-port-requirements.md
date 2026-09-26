# 015 · Core contract

Document ID: **GS-015**.

<a id="gs-015-005"></a>
## 005 · Required integration

The integration imports Gramlot from @jsr/genro__gramlot and Host/Page through
the browser-safe /host and /page public entries. Serverless owns /worker-host and
/standalone; it requires the matching development core with /host. Published
0.1.0 archives are unchanged and do not provide this new package boundary. It consumes packaged runtime notices and HtmlBuilder's
static renderer. Attribute-only template interpolation is required so embedded
JavaScript template literals remain unchanged. No installed dependency is patched.

<a id="gs-015-010"></a>
## 010 · Superseded proposal

The Python compiler provider, capability declaration gate, embedded precomputed
Source and complete-v1 envelope were provisional contracts. They are superseded
by the owner's dedicated JS Worker-host decision; no compatibility route remains.

<a id="gs-015-015"></a>
<a id="gs-015-020"></a>
<a id="gs-015-025"></a>
<a id="gs-015-030"></a>

# 030 · Offline unified showcase

Document ID: **GS-030**.

<a id="gs-030-005"></a>
## 005 · Open the archive

Block ID: **GS-030-005**.

Extract `showcase.zip` and open `showcase/index.html`. Keep `pages/` and `assets/`
beside it. The original PoC shell, eleven lessons, Source viewer and scoped
Inspector are retained. Original Python sources and bundled assets are included.
The export changes the catalog URL strategy and host label, not lesson bodies.

<a id="gs-030-010"></a>
## 010 · Offline boundary

Block ID: **GS-030-010**.

The original dataRpc lesson receives an explicit offline-backend error through
its normal callback. There is no simulated Python execution. A static HTTP server
can serve the files but does not enable RPC. Data edits are page-lifetime only;
this export adds no JSON save/import. Browser adaptations package editor/Inspector
resources and allow the related-frame channel on file origins with sender checks.
This PoC development export does not accept core ports or complete the generic
single-file compiler integration.

<a id="gs-030-015"></a>
## 015 · Rebuild and verification

Block ID: **GS-030-015**.

See `examples/showcase/README.md` for reproduction with trusted PoC dependencies,
and `examples/showcase/VERIFICATION.md` for exact checks. The archive records
source hashes and dependency notices. DOM-emulator checks do not establish
real-browser filesystem security behavior; verify the target browser separately.

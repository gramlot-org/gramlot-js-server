# Gramlot Serverless integration repository instructions

Read `../gramlot/docs/00-constitution.md`, `../gramlot/docs/01-overview.md`,
`../gramlot/ports/README.md`, and `../gramlot/docs/005-documentation-policy.md`
before changing this repository. The Gramlot constitution is authoritative.

- Keep code and maintained documentation in English.
- This repository owns standalone HTML packaging, WorkerHost, WorkerTransport and startup for JavaScript Browser/Worker. It does not own
  Gramlot Source, Data Bags, Host, or the browser runtime.
- Never ship a substitute runtime. Fail if an accepted integration is unavailable.
- Offline builds reject `dataRpc` and server resolvers. Browser resolvers require
  the accepted standalone transport contract.
- Only `application_data` crosses the JSON boundary through a typed Bag codec.
- Pair `docs` and `docs_llm` guides and preserve GS document/block IDs.
- Do not publish, release, deploy, push, or change visibility without authorization.


## Accepted native profile — 2026-09-24

Owner accepted the clean-core native 0.1.0 and GitHub archive delivery. Use the
current native APIs and paired guides. Earlier PoC-only runtime/compiler/data
envelope instructions describe historical work; they do not override the native
Host/Page/Worker contract. No registry publication or deployment is authorized.

## Approved Minimal boundary — 2026-09-24

The owner approved the integration-repository name `gramlot-minimal` for the
Python/Uvicorn and Browser/Worker standalone profiles. Native Python ASGI belongs
here; Kajenn depends on it and owns only its Kajenn mount integration. The JavaScript
package is `@gramlot/minimal` with the `gramlot-minimal` command. Historical
standalone names are not compatibility aliases. Keep existing GS document/block IDs.
The published Gramlot 0.1.0 archives are immutable; this change is development work.

## Standalone ownership correction — 2026-09-24

Owner explicitly assigns the standalone-only Worker transport and startup to
Minimal (core constitution amendment 11.46). Minimal's WorkerHost delegates Page
execution to core Host through the browser-safe `/host` entry. Core retains Source,
Data and rendering. Do not duplicate these framework capabilities. The current
integration requires the matching development core; frozen 0.1.0 archives are
unchanged and are not claimed compatible with this new package boundary.

gramlot-js-server
=================

.. image:: _static/gramlot-logo.png
   :width: 160
   :alt: Gramlot

JavaScript hosting for Gramlot pages. Gramlot describes web interfaces in
Python or JavaScript and keeps them bound to application state in the browser;
see `The Gramlot family
<https://gramlot.readthedocs.io/en/latest/docs/public/055-family.html>`_ for
the core and the other repositories.

This repository publishes two packages: ``@gramlot/gramlot-js-server``, the
Node.js and Bun host adapter, and ``@gramlot/gramlot-serverless``, the
standalone exporter whose pages open without a server.

.. toctree::
   :maxdepth: 2
   :caption: Server (Node.js and Bun)

   005-introduction
   010-tutorial
   015-writing-pages
   020-configuration
   025-deployment
   030-reference
   040-troubleshooting

.. toctree::
   :maxdepth: 2
   :caption: Serverless (Browser and Worker)

   105-introduction
   110-tutorial
   115-writing-pages
   120-configuration
   125-deployment
   130-reference
   140-troubleshooting

The concise view lives in the repository's docs_llm directory. The internal
notes (GN-005, GN-010, GS-005 to GS-030) live in docs/internal and are not part
of this manual.

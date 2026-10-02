"""Documentation of the server and serverless packages; builds independently of their tests."""
from pathlib import Path
import json

project = "gramlot-js-server"
author = "Genropy Team"
copyright = "2026, Softwell S.r.l."
release = json.loads((Path(__file__).resolve().parents[1] / "server" / "package.json").read_text())["version"]
version = release
extensions = ["myst_parser"]
source_suffix = {".rst": "restructuredtext", ".md": "markdown"}
exclude_patterns = ["_build", ".DS_Store", "internal"]  # internal notes stay out of the published build
html_theme = "sphinx_rtd_theme"
html_logo = "_static/gramlot-logo.png"


def paired_view_links(app, docname, source):
    """Offer the paired Markdown guide as a download in standalone documentation builds."""
    import re

    source[0] = re.sub(r'\[(Concise mirror|Expanded version|Paired view)\]\(((?:\.\./)+docs(?:_llm)?/[^)]+\.md)\)',
                       r'{download}`\1 <\2>`', source[0])


def setup(app):
    app.connect("source-read", paired_view_links)

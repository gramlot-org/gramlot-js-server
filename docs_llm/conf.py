"""Concise view: the same configuration as the expanded view."""
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "docs"))
from conf import *  # noqa: F401,F403

html_logo = str(Path(__file__).resolve().parents[1] / "docs" / "_static" / "gramlot-logo.png")

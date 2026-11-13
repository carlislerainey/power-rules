#!/usr/bin/env python3
"""Write the Quarto document for the HTML version: front matter, the paper's text, and the code.

The text is abstract.md and body.md (from tex2md.py), unchanged. The code chunks come from
code.qmd: each chunk follows a line `<!-- after: TEXT -->`, and is placed after the paragraph
of body.md that contains TEXT (which must occur in exactly one paragraph).

usage: assemble.py <title.tex> <dir of abstract.md and body.md> <code.qmd> <out .qmd>
"""
import re
import sys
from pathlib import Path

title_path, md_dir, code_path, out_path = (Path(a) for a in sys.argv[1:5])

title = title_path.read_text()
main = re.search(r"\\titlemain\}\{(.*)\}", title).group(1)
sub = re.search(r"\\titlesub\}\{(.*)\}", title).group(1)
abstract = (md_dir / "abstract.md").read_text().strip()
paragraphs = (md_dir / "body.md").read_text().split("\n\n")

# the heading the PDF prints above the reference list
refs = [i for i, p in enumerate(paragraphs) if p.startswith("::: {#refs")]
if len(refs) != 1:
    sys.exit("assemble.py: expected one reference list in body.md")
paragraphs.insert(refs[0], "# References {.unnumbered}")

# code chunks, keyed by the text they follow
chunks = re.split(r"^<!-- after: (.*?) -->\n", code_path.read_text(), flags=re.M)
for anchor, chunk in zip(chunks[1::2], chunks[2::2]):
    hits = [i for i, p in enumerate(paragraphs) if anchor in p]
    if len(hits) != 1:
        sys.exit(f"assemble.py: the anchor {anchor!r} is in {len(hits)} paragraphs (expected 1)")
    paragraphs[hits[0]] += "\n\n" + chunk.strip()

front = f"""---
title: "{main}"
subtitle: "{sub}"
author: Carlisle Rainey
abstract: |
  {abstract}
format:
  html:
    keep-md: true  # keeps knitr's Markdown (power-rules.html.md), which pandoc turns into the page
    fig-align: center
---
"""
out_path.parent.mkdir(parents=True, exist_ok=True)
out_path.write_text(front + "\n" + "\n\n".join(paragraphs))

#!/usr/bin/env python3
"""Write power-rules.md, the version of the paper that AI agents read.

The file is guide.md (the title, the metadata, and the guide for agents, written by hand)
followed by the paper: the abstract and the body as ../html-version writes them in Markdown
(build/md/abstract.md and body.md, made from the LaTeX source), passed through agents.lua.
After pandoc, three changes that an agent's text search needs, none to the words:
  - a non-breaking space becomes a space ("Rule 3" is then found by a search for it);
  - curly quotation marks and apostrophes become straight ones, as in the LaTeX source;
  - the cells of each table lose their padding, and square brackets pandoc's backslashes.
Then the guide's line "<!-- index -->" becomes the list of the paper's sections by line number.

usage: build.py <dir with abstract.md and body.md> <output file>
"""
import re
import subprocess
import sys
from pathlib import Path

md_dir, out_path = Path(sys.argv[1]), Path(sys.argv[2])
here = Path(__file__).resolve().parent

# the line that starts the paper in power-rules.md (check.py splits the file there)
PAPER_STARTS = "## Abstract"


def pandoc(path):
    return subprocess.run(
        ["pandoc", "-f", "markdown", "-t", "gfm+tex_math_dollars", "--wrap=none",
         "-L", str(here / "agents.lua"), str(path)],
        check=True, capture_output=True, text=True).stdout


def unpad(line):
    """a row of a pipe table without the padding that aligns its columns"""
    cells = [c.strip() for c in re.split(r"(?<!\\)\|", line.strip())[1:-1]]
    if all(re.fullmatch(r":?-+:?", c) for c in cells):
        cells = [("---:" if c.endswith(":") and not c.startswith(":") else
                  ":---:" if c.endswith(":") else "---") for c in cells]
        return "|" + "|".join(cells) + "|"
    return "| " + " | ".join(cells) + " |"


def brackets(line):
    """square brackets outside math, without pandoc's backslashes: [3, 10], not \\[3, 10\\]"""
    parts = re.split(r"(\$[^$]*\$)", line)
    return "".join(part if k % 2 else re.sub(r"\\([\[\]])", r"\1", part) for k, part in enumerate(parts))


def tidy(text):
    text = text.replace("\u00a0", " ")
    text = text.translate(str.maketrans({"\u201c": '"', "\u201d": '"', "\u2018": "'", "\u2019": "'"}))
    return "\n".join(unpad(line) if line.startswith("|") else brackets(line.rstrip()) for line in text.split("\n"))


guide = (here / "guide.md").read_text()
if guide.startswith("---"):
    # GitHub Pages (Jekyll) turns a Markdown file with front matter into an HTML page
    sys.exit("build.py: guide.md opens with YAML front matter; GitHub Pages would not serve the file as Markdown")
if PAPER_STARTS in guide.split("\n"):
    sys.exit(f"build.py: guide.md has the line {PAPER_STARTS!r}, which marks the start of the paper")

abstract = subprocess.run(
    ["pandoc", "-f", "markdown", "-t", "gfm+tex_math_dollars", "--wrap=none", str(md_dir / "abstract.md")],
    check=True, capture_output=True, text=True).stdout
paper = PAPER_STARTS + "\n\n" + abstract.strip() + "\n\n" + pandoc(md_dir / "body.md")

lines = (guide.rstrip("\n") + "\n\n" + tidy(paper).rstrip("\n")).split("\n")

# the index of the paper's sections by line, in place of the guide's line "<!-- index -->";
# its length does not depend on the numbers in it, so the numbers can be worked out first
INDEX = "<!-- index -->"
if lines.count(INDEX) != 1:
    sys.exit(f"build.py: guide.md must have the line {INDEX!r} exactly once")
at, start = lines.index(INDEX), lines.index(PAPER_STARTS)
heads = [(i, line) for i, line in enumerate(lines) if i >= start and re.match(r"#{2,3} ", line)]
grow = len(heads) + 2 - 1  # the index's lines, less the line it replaces
index = [f"This file has {len(lines) + grow} lines, and the paper starts at line {start + 1 + grow}. "
         "A tool that reads a long file in parts may stop before the end: read on from the line needed.", ""]
for i, line in heads:
    level, title = line.split(" ", 1)
    index.append(("  " if level == "###" else "") + f"- line {i + 1 + grow}: {title}")
lines[at:at + 1] = index

out_path.write_text("\n".join(lines) + "\n")
print(f"build.py: wrote {out_path}")

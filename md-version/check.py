#!/usr/bin/env python3
"""Check power-rules.md, the version of the paper that AI agents read.

1. The paper. Every paragraph, heading, list item, footnote, and table of the paper's Markdown
   (../html-version/build/md/abstract.md and body.md, which that folder checks against the
   PDFs) must be in power-rules.md from "## Abstract" on, with the same words, numbers, math,
   and web addresses, and nothing else may be there except the three additions listed in
   ADDED. Spaces, emphasis, and the place of a footnote are not compared.
2. The guide. Its title is the paper's; its index gives each section's line; every number in its table of numbers to check is in
   the paper; and its formulas, worked the way it says the paper works them, give the
   paper's numbers.
3. No non-breaking space, curly quotation mark, or [CTK] cue anywhere in the file.

usage: check.py <dir with abstract.md and body.md> <title.tex> <power-rules.md>
"""
import json
import math
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path
from statistics import NormalDist

md_dir, title_path, out_path = (Path(a) for a in sys.argv[1:4])
PAPER_STARTS = "## Abstract"
problems = []


# 1. the paper -----------------------------------------------------------------

def ast(text, fmt):
    out = subprocess.run(["pandoc", "-f", fmt, "-t", "json"], input=text, check=True,
                         capture_output=True, text=True).stdout
    return json.loads(out)["blocks"]


def squeeze(s):
    s = s.translate(str.maketrans({"\u201c": '"', "\u201d": '"', "\u2018": "'", "\u2019": "'"}))
    return re.sub(r"[\s\u00a0]+", "", s)


def units(blocks):
    """the text of each paragraph, heading, footnote, and table, without spaces"""
    out = []

    def inlines(xs):
        s = ""
        for x in xs:
            t, c = x["t"], x.get("c")
            if t == "Str":
                s += c
            elif t in ("Space", "SoftBreak", "LineBreak"):
                s += " "
            elif t == "Math":
                s += "-" if c[1] == "-" else "→" if c[1] == "\\downarrow" else "$" + c[1] + "$"
            elif t == "Code":
                s += c[1]
            elif t == "Note":
                walk(c)
            elif t == "Link":
                s += inlines(c[1])
                if not c[2][0].startswith("#"):
                    s += "<" + c[2][0] + ">"
            elif t == "Underline":
                s += "_____"
            elif t == "RawInline":
                pass
            elif t in ("Emph", "Strong", "Strikeout", "Superscript", "Subscript", "SmallCaps"):
                s += inlines(c)
            elif t == "Quoted":
                q = "'" if c[0]["t"] == "SingleQuote" else '"'
                s += q + inlines(c[1]) + q
            elif t in ("Span", "Cite", "Image"):
                s += inlines(c[1])
            else:
                sys.exit(f"check.py: an inline of type {t}")
        return s

    def cells(rows):
        text = []
        for row in rows:
            for cell in row[1]:
                text.append(squeeze("".join(leaf(b) for b in cell[4])))
        return text

    def leaf(b):
        t, c = b["t"], b.get("c")
        if t in ("Para", "Plain"):
            return inlines(c)
        sys.exit(f"check.py: a table cell holds a {t}")

    def table(c):
        """the table's cells, without spaces; a cell that repeats the one above it counts once"""
        caption, head, bodies, foot = c[1], c[3], c[4], c[5]
        walk(caption[1])
        rows = list(head[1])
        for body in bodies:
            rows += body[2] + body[3]
        rows += foot[1]
        text, above = [], None
        for row in rows:
            row_cells = [squeeze("".join(leaf(b) for b in cell[4])) for cell in row[1]]
            if row_cells and row_cells[0] == above:
                row_cells[0] = ""
            elif row_cells and row_cells[0]:
                above = row_cells[0]
            text.append("|".join(row_cells))
        out.append("TABLE:" + "/".join(text))

    def walk(blocks):
        for b in blocks:
            t, c = b["t"], b.get("c")
            if t in ("Para", "Plain"):
                out.append(squeeze(inlines(c)))
            elif t == "Header":
                out.append(squeeze(inlines(c[2])))
            elif t == "BlockQuote":
                walk(c)
            elif t == "Div":
                walk(c[1])
            elif t in ("BulletList",):
                for item in c:
                    walk(item)
            elif t == "OrderedList":
                for item in c[1]:
                    walk(item)
            elif t == "Table":
                table(c)
            elif t == "Figure":
                walk(c[1][1])
            elif t in ("RawBlock", "HorizontalRule"):
                pass
            else:
                sys.exit(f"check.py: a block of type {t}")

    walk(blocks)
    return [u for u in out if u]


text = out_path.read_text()
lines = text.split("\n")
if lines.count(PAPER_STARTS) != 1:
    sys.exit(f"check.py: {out_path} must have the line {PAPER_STARTS!r} exactly once")
cut = lines.index(PAPER_STARTS)
guide, paper = "\n".join(lines[:cut]), "\n".join(lines[cut:])

source = units(ast((md_dir / "abstract.md").read_text(), "markdown")) \
    + units(ast((md_dir / "body.md").read_text(), "markdown"))
ours = units(ast(paper, "gfm+footnotes+tex_math_dollars"))

# what power-rules.md adds to the paper: two headings and the figure in words
ADDED = [r"Abstract", r"References", r"Figureinwords:.*"]
a, b = Counter(source), Counter(ours)
for u in (a - b).elements():
    problems.append(f"in the paper but not in {out_path.name}: {u[:150]}")
extra = list((b - a).elements())
for pattern in ADDED:
    hits = [u for u in extra if re.fullmatch(pattern, u)]
    if len(hits) != 1:
        problems.append(f"expected one added unit matching {pattern!r}, found {len(hits)}")
    for u in hits:
        extra.remove(u)
for u in extra:
    problems.append(f"in {out_path.name} but not in the paper: {u[:150]}")
n_notes = len(re.findall(r"^\[\^A?\d+\]: ", paper, flags=re.M))
n_marks = len(set(re.findall(r"\[\^A?\d+\](?!:)", paper)))
if n_notes != n_marks:
    problems.append(f"{n_marks} footnote marks but {n_notes} footnotes")

# 2. the guide -----------------------------------------------------------------

title = re.findall(r"\\newcommand\{\\title(?:main|sub)\}\{(.*)\}", title_path.read_text())
if f"# {title[0]}: {title[1]}" not in guide.split("\n"):
    problems.append("the guide's title is not the paper's")

# the index: each entry names the heading on its line, and every heading of the paper is listed
entries = re.findall(r"^ *- line (\d+): (.*)$", guide, flags=re.M)
for number, name in entries:
    if not re.fullmatch(r"#{2,3} " + re.escape(name), lines[int(number) - 1]):
        problems.append(f"the index says line {number} is {name!r}, but it is {lines[int(number) - 1][:60]!r}")
n_heads = sum(1 for line in lines[cut:] if re.match(r"#{2,3} ", line))
if len(entries) != n_heads:
    problems.append(f"the index lists {len(entries)} sections, but the paper has {n_heads}")
said = re.search(r"This file has (\d+) lines, and the paper starts at line (\d+)\.", guide)
if not said or (int(said.group(1)), int(said.group(2))) != (len(lines) - 1, cut + 1):
    problems.append("the index's count of lines or the line where the paper starts is wrong")

# every number in the guide's table of numbers to check is in the paper
section = re.search(r"### Numbers to check a calculation against\n(.*?)\n### ", guide, flags=re.S)
if not section:
    sys.exit("check.py: the guide has no section 'Numbers to check a calculation against'")
plain = paper.replace("{,}", ",")
table_rows = [r for r in section.group(1).split("\n") if r.startswith("| ") and "`" in r]
for row in table_rows:
    for cell in row.split(" | ")[1:]:
        for number in re.findall(r"\d+(?:,\d{3})*(?:\.\d+)?%?", cell.strip(" |")):
            if not re.search(r"(?<![\d.,])" + re.escape(number) + r"(?![\d]|[.,]\d)", plain):
                problems.append(f"the guide's number {number} is not in the paper (row: {row[:60]}...)")

# the guide's formulas, worked as the guide says the paper works them (rounded factors, the
# SE rounded to two decimals before it is multiplied, sample sizes rounded up)
pnorm = NormalDist().cdf
se = lambda sd, n, r2=0.0: round(2 * sd * math.sqrt(1 - r2) / math.sqrt(2 * n), 2)
n_for = lambda f, sd, tau, r2=0.0, k=2: math.ceil(k * (f * sd * math.sqrt(1 - r2) / tau) ** 2)
r2d = lambda x: f"{x + 1e-9:.2f}"
worked = {
    "80%": "80%" if abs(1 - pnorm(1.64 - 5 / 2) - 0.80) < 0.01 else "not 80%",
    "1.32": r2d(se(20.8, 500)), "3.30": r2d(2.5 * se(20.8, 500)), "4.36": r2d(3.3 * se(20.8, 500)),
    "3.70": r2d(2.8 * se(20.8, 500)), "4.75": r2d(3.6 * se(20.8, 500)),
    "1.28": r2d(se(20.8, 500, 0.05)), "3.20": r2d(2.5 * se(20.8, 500, 0.05)),
    "4.22": r2d(3.3 * se(20.8, 500, 0.05)),
    "1.02": r2d(se(20.8, 500, 0.40)), "2.55": r2d(2.5 * se(20.8, 500, 0.40)),
    "3.37": r2d(3.3 * se(20.8, 500, 0.40)),
    "1,047": f"{n_for(3.3, 20.8, 3):,}", "995": f"{n_for(3.3, 20.8, 3, 0.05):,}",
    "1,247": f"{n_for(3.6, 20.8, 3):,}",
    "223": f"{n_for(2.5, 2.0, 0.67, k=4):,}", "892": f"{4 * n_for(2.5, 2.0, 0.67, k=4):,}",
    "389": f"{n_for(3.3, 2.0, 0.67, k=4):,}", "1,556": f"{4 * n_for(3.3, 2.0, 0.67, k=4):,}",
    "112": f"{n_for(2.5, 2.0, 0.67):,}", "224": f"{2 * n_for(2.5, 2.0, 0.67):,}",
    "2%": f"{100 * (1 / math.sqrt(4 * 0.6 * 0.4) - 1):.0f}%",
    "9%": f"{100 * (1 / math.sqrt(4 * 0.7 * 0.3) - 1):.0f}%",
    "25%": f"{100 * (1 / math.sqrt(4 * 0.8 * 0.2) - 1):.0f}%",
    "67%": f"{100 * (1 / math.sqrt(4 * 0.9 * 0.1) - 1):.0f}%",
    "1.4": f"{math.sqrt(1 + 19 * 0.05):.1f}",
    "3.27": r2d((NormalDist().inv_cdf(0.95) + NormalDist().inv_cdf(0.80)) * 2 * 20.8 / math.sqrt(1000)),
    "2.49": r2d(NormalDist().inv_cdf(0.95) + NormalDist().inv_cdf(0.80)),
}
for printed, computed in worked.items():
    if printed != computed:
        problems.append(f"the guide's formulas give {computed} where the paper has {printed}")
    if not re.search(r"(?<![\d.,])" + re.escape(printed) + r"(?![\d]|[.,]\d)", guide):
        problems.append(f"check.py works out {printed}, which the guide no longer has")

# 3. characters ----------------------------------------------------------------

for name, pattern in [("a non-breaking space", "\u00a0"), ("a curly quotation mark", "[\u201c\u201d\u2018\u2019]"),
                      ("a [CTK] cue", r"CTK")]:
    n = len(re.findall(pattern, text))
    if n:
        problems.append(f"{out_path.name} has {name} ({n})")

for p in problems:
    print("check.py:", p)
print(f"CHECK: {len(source)} units of the paper (paragraphs, headings, footnotes, tables), "
      f"{n_notes} footnotes, {len(worked)} worked numbers: "
      + ("all match" if not problems else f"{len(problems)} problem(s)"))
sys.exit(1 if problems else 0)

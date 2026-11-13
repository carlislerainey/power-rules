#!/usr/bin/env python3
"""Check that the HTML has exactly the math of the paper's LaTeX source.

Every inline math expression in the body (counting each rule twice, since Appendix 4
restates the rules) must appear as a MathJax span in the HTML with the same LaTeX, and the
HTML must have no other math. compare.py checks where each expression sits in the text.

usage: check_math.py body.tex appendix.tex power-rules.html   (the first two from extract.pl)
"""
import html
import re
import sys
from collections import Counter

tex = "".join(open(f).read() for f in sys.argv[1:-1])
page = open(sys.argv[-1], encoding="utf-8").read()
# the text of the paper (after the table of contents), without the reference list
page = page[page.index("<main"):]
page = re.sub(r'<div id="ref-[^"]+" class="csl-entry".*?</div>', "", page, flags=re.S)

MATH = r"(?<!\\)\$([^$]+)\$"
expected = Counter(re.findall(MATH, tex))
for body in re.findall(r"\\begin\{restatable\}.*?\\end\{restatable\}", tex, re.S):
    expected.update(re.findall(MATH, body))

found = Counter(html.unescape(m) for m in
                re.findall(r'<span class="math inline">\\\((.*?)\\\)</span>', page, re.S))

missing, extra = expected - found, found - expected
print(f"math: {sum(expected.values())} expressions expected, {sum(found.values())} in the HTML, "
      f"{sum(missing.values())} missing, {sum(extra.values())} extra")
for m in missing.elements():
    print("missing:", m)
for m in extra.elements():
    print("extra:  ", m)
sys.exit(1 if missing or extra else 0)

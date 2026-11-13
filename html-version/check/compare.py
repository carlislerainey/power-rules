#!/usr/bin/env python3
"""Check that the page has the same text as the PDFs.

Each version (the PDFs or the page) is cut into sentences, and the script lists every sentence
that appears in one version but not the other, paired with its closest match in the other
version and a word-by-word diff. Comparing sets of sentences, rather than the running text,
ignores what legitimately differs between layouts: page breaks, where footnotes and floats
land, and line breaks. The tables are compared separately, as bags of words, because a PDF
reads a table across its columns.

The PDFs to compare are the check builds made by check/nomath.pl: every math expression is
the word MATH, each table sits between the words TABLESTART and TABLEEND, and each caption
and each note under a rule between SEGSTART and SEGEND (so that it is a segment of its own,
wherever it floats to). In the HTML, each MathJax span becomes MATH. So the comparison covers all of the
text and where each math expression sits; check/check_math.py compares the math itself.

Normalization before comparing:
  - Unicode compatibility forms (ligatures), whitespace, bullets, and every ASCII hyphen are dropped,
    so a word hyphenated at a line break matches the unbroken word (en and em dashes are kept)
  - page numbers, running heads, footnote marks, and the text inside Figure 1 are dropped
  - sentences are matched without regard to spaces, which PDF extraction gets wrong

usage: compare.py A [A2 ...] B [--expected FILE]   (.pdf or .html files; several A files are
  read as one version, in order: the main text and its appendix; B is the page)
  With --expected, the script fails unless the differences are exactly those in FILE (the
  ones already reviewed, separated by blank lines).
"""
import argparse
import difflib
import html
import re
import subprocess
import sys
import unicodedata
from collections import Counter
from html.parser import HTMLParser


def normalize(s):
    s = unicodedata.normalize("NFKC", s)
    s = s.replace("-", "").replace("\u00ad", "").replace("•", "")
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r" ([.,;:?!)\]’”])", r"\1", s)
    s = re.sub(r"([(\[“]) ", r"\1", s)
    return s.strip()


# a sentence ends at . ? ! or : (with any closing quotes or parentheses) before a capital,
# a digit, an opening quote or bracket, a bullet, or the dash for a repeated author in the
# references
SENTENCE_END = re.compile(r"(?:(?<=[.?!:])|(?<=[.?!:][”’)])|(?<=[.?!:][”’)][”’)]))\s+(?=[“(\[]?[A-Z0-9]|———|•)")


def sentences(segments):
    out = []
    for seg in segments:
        for s in SENTENCE_END.split(normalize(seg)):
            s = s.strip()
            if len(s) > 1:
                out.append(s)
    return out


def join(text, line):
    """append a line: no space after a hyphen or dash, or inside a URL broken across lines"""
    line = line.strip()
    if not text:
        return line
    last = text.split()[-1] if text.split() else ""
    url_goes_on = "http" in last and re.match(r"[a-z0-9/.\-_~%?=&#]|[A-Z][A-Z0-9]", line)
    if text[-1] in "-\u00ad\u2010–—/" or url_goes_on:
        return text + line
    return text + " " + line


# PDF -------------------------------------------------------------------------

FIGURE_FONT = re.compile(r"Verdana|font0000")      # the text inside Figure 1 (R's cairo fonts)
HEADING_FONT = re.compile(r"SourceSansPro|LMSans")  # headings (PA, preprint)
INTERNAL_LINK = re.compile(r'<a href="[^"]*\.html#')  # a link within the PDF, as pdftohtml writes it
DIGITS = re.compile(r"\s*\d+\s*")


def pdf_text(path):
    """(segments, tables): body text and small text each as one running stream (so a sentence
    interrupted by a page break or a footnote is rejoined), each heading as its own segment,
    and the words of each table"""
    xml = subprocess.run(["pdftohtml", "-xml", "-i", "-stdout", "-q", path],
                         capture_output=True, text=True, check=True).stdout
    fonts = {m.group(1): (float(m.group(2)), m.group(3))
             for m in re.finditer(r'<fontspec id="(\d+)" size="([\d.]+)" family="([^"]*)"', xml)}
    sizes = Counter()
    for m in re.finditer(r'<text [^>]*font="(\d+)"[^>]*>(.*?)</text>', xml):
        sizes[fonts[m.group(1)][0]] += len(m.group(2))
    body = sizes.most_common(1)[0][0]  # the size of the body text
    lines = []  # (size, font, text) for each run of text, in reading order
    for page in re.finditer(r'<page number="\d+"[^>]*height="([\d.]+)" width="([\d.]+)"[^>]*>(.*?)</page>',
                            xml, re.S):
        h, w = float(page.group(1)), float(page.group(2))
        for m in re.finditer(r'<text top="([\d.]+)" left="([\d.]+)" width="([\d.]+)" height="([\d.]+)" '
                             r'font="(\d+)">(.*?)</text>', page.group(3)):
            top, left, width = float(m.group(1)), float(m.group(2)), float(m.group(3))
            size, family = fonts[m.group(5)]
            raw = m.group(6)
            text = html.unescape(re.sub(r"<[^>]+>", "", raw))
            if not text.strip() or top < 0.06 * h or FIGURE_FONT.search(family):
                continue  # empty, running head, or text inside Figure 1
            if DIGITS.fullmatch(text) and top > 0.85 * h and abs(left + width / 2 - w / 2) < 0.05 * w:
                continue  # page number
            if DIGITS.fullmatch(text) and (INTERNAL_LINK.match(raw) or size < 0.75 * body):
                continue  # footnote mark: a superscript number, linked to its footnote
            lines.append((size, family, text))

    streams = {"body": "", "small": ""}
    segments, tables, table, heading, heading_font, segment = [], [], None, "", None, None
    for size, family, text in lines:
        if text.strip() == "TABLESTART":
            table = []
            continue
        if text.strip() == "TABLEEND":
            tables.append(table)
            table = None
            continue
        if table is not None:
            table = [join(table[0] if table else "", text)]
            continue
        if segment is not None or "SEGSTART" in text:
            # a caption or a note under a rule: its own segment, with the caption's label
            if segment is None:
                label, text = text.split("SEGSTART", 1)
                if not label.strip():
                    # the label ("Table 1.") came as a run of its own: take it back
                    if re.fullmatch(r"(Table|Figure) \d+[.:]?\s*", heading):
                        label, heading = heading, ""
                    for name in ("small", "body"):
                        m = re.search(r"(Table|Figure) \d+[.:]?\s*$", streams[name])
                        if m and not label.strip():
                            label, streams[name] = m.group(0), streams[name][:m.start()].rstrip()
                segment = label
            if "SEGEND" in text:
                segments.append(join(segment, text.split("SEGEND", 1)[0]))
                segment = None
            else:
                segment = join(segment, text)
            continue
        cls = "large" if (size > 1.1 * body or HEADING_FONT.search(family)) else "small" if size < 0.9 * body else "body"
        if cls == "large":
            if heading and (size, family) != heading_font:  # a section heading, then a subsection heading
                segments.append(heading)
                heading = ""
            heading, heading_font = join(heading, text), (size, family)
            continue
        if heading:
            segments.append(heading)
            heading = ""
        if cls == "small" and re.match(r"^\d+\.\s+[A-Z“]", text):
            text = re.sub(r"^\d+\.\s+", "", text)  # the number that starts a footnote
        streams[cls] = join(streams[cls], text)
    segments += [heading, streams["body"], streams["small"]]
    return segments, [words(t[0] if t else "") for t in tables]


def words(text):
    return Counter(normalize(text).split())


# HTML ------------------------------------------------------------------------

class TextBlocks(HTMLParser):
    """text of each block element, without code, note marks, or page furniture; math as
    MATH; numbered list items with their numbers, as a PDF prints them; the cells of each
    table separately; each margin note as its own text, and the paragraph around it as one
    text, as if the note were a footnote"""
    BLOCKS = {"p", "h1", "h2", "h3", "h4", "li", "figcaption", "caption", "div", "blockquote"}
    VOID = {"br", "img", "hr", "meta", "link", "input", "source", "col", "wbr"}
    DROP_TAGS = {"script", "style", "nav",  # the contents and the links under the abstract
                 "pre", "details"}          # the code boxes, which only the page has
    DROP_CLASSES = {"cell", "cell-output",  # knitr's code and output
                    "sidenote-number"}      # the mark of a margin note

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.blocks, self.buf = [], []
        self.tables, self.cells = [], None
        self.stack = []        # one flag per open element: was it dropped?
        self.skip_depth = 0    # >0 inside a dropped element
        self.in_main = False
        self.in_refs = False   # math in the reference list (a title) is kept as text, as in the PDFs
        self.refs_depth = None
        self.lists = []        # for each open list, the number of its next item (None: unnumbered)
        self.held = []         # for each open margin note: the text of the paragraph around it
        self.note_depths = []

    def flush(self):
        text = "".join(self.buf).strip()
        if text:
            self.blocks.append(text)
        self.buf = []

    def handle_starttag(self, tag, attrs):
        if tag in self.VOID:
            return
        a = dict(attrs)
        cls = set((a.get("class") or "").split())
        if a.get("id") == "title-block-header" or tag == "main":
            self.in_main = True
        if a.get("id") == "refs":
            self.in_refs, self.refs_depth = True, len(self.stack)
        drop = tag in self.DROP_TAGS or bool(cls & self.DROP_CLASSES)
        if "math" in cls and not self.skip_depth and not self.in_refs:
            self.buf.append("MATH")
            drop = True
        if not drop and "sidenote" in cls:
            self.held.append(self.buf)
            self.buf = []
            self.note_depths.append(len(self.stack))
        elif not drop and cls & {"sn-p", "sn-quote"}:
            self.flush()
        self.stack.append(drop)
        if drop:
            self.skip_depth += 1
        elif tag == "table":
            self.flush()
            self.cells = []
        elif tag in ("td", "th") and self.cells is not None:
            self.flush()
        elif tag in self.BLOCKS and self.cells is None:
            self.flush()
        if not drop and tag in ("ol", "ul"):
            # a numbered list prints its numbers
            self.lists.append(int(a.get("start", 1)) if tag == "ol" else None)
        elif not drop and tag == "li" and self.lists and self.lists[-1] is not None:
            self.buf.append(f"{self.lists[-1]}. ")
            self.lists[-1] += 1

    def handle_endtag(self, tag):
        if tag in self.VOID or not self.stack:
            return
        if self.stack.pop():
            self.skip_depth -= 1
        if self.note_depths and len(self.stack) == self.note_depths[-1]:
            self.flush()
            self.buf = self.held.pop()
            self.note_depths.pop()
            return
        if self.in_refs and len(self.stack) == self.refs_depth:
            self.in_refs = False
        elif tag in ("td", "th") and self.cells is not None:
            self.cells.append("".join(self.buf))
            self.buf = []
        elif tag == "table":
            self.tables.append(words(" ".join(self.cells)))
            self.cells = None
            self.buf = []
        elif tag in self.BLOCKS and self.cells is None:
            self.flush()
        if tag in ("ol", "ul") and self.lists:
            self.lists.pop()

    def handle_data(self, data):
        if self.skip_depth == 0 and self.in_main:
            self.buf.append(re.sub(r"\\[()]", "", data) if self.in_refs else data)


def html_text(path):
    p = TextBlocks()
    p.feed(open(path, encoding="utf-8").read())
    p.flush()
    return p.blocks, p.tables


# compare ---------------------------------------------------------------------

def load(path):
    segments, tables = pdf_text(path) if path.endswith(".pdf") else html_text(path)
    return sentences(segments), tables


def word_diff(a, b):
    out = []
    aw, bw = a.split(), b.split()
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, aw, bw, autojunk=False).get_opcodes():
        if op == "equal":
            same = aw[i1:i2]
            out.append(" ".join(same) if len(same) <= 8 else " ".join(same[:4]) + " … " + " ".join(same[-4:]))
        else:
            if i2 > i1:
                out.append("[-" + " ".join(aw[i1:i2]) + "-]")
            if j2 > j1:
                out.append("{+" + " ".join(bw[j1:j2]) + "+}")
    return " ".join(out)


def unmatched(xs, ys):
    """the sentences of xs that are not in ys, matched without regard to spaces"""
    key = lambda s: re.sub(r"\s+", "", s)
    extra = Counter(map(key, xs)) - Counter(map(key, ys))
    out = []
    for s in xs:
        if extra[key(s)] > 0:
            extra[key(s)] -= 1
            out.append(s)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("a", nargs="+")
    ap.add_argument("b")
    ap.add_argument("--expected", help="file of the differences already reviewed; any other difference fails")
    args = ap.parse_args()
    sa, ta = [], []
    for path in args.a:
        s, t = load(path)
        sa, ta = sa + s, ta + t
    sb, tb = load(args.b)

    # compare without spaces, which PDF extraction gets wrong ("meaning ful", "https: //")
    only_a, only_b = unmatched(sa, sb), unmatched(sb, sa)
    table_diffs = [(i + 1, x - y, y - x) for i, (x, y) in enumerate(zip(ta, tb)) if x != y]
    print(f"A: {' + '.join(args.a)}\n   {len(sa)} sentences, {len(only_a)} not in B; {len(ta)} tables")
    print(f"B: {args.b}\n   {len(sb)} sentences, {len(only_b)} not in A; {len(tb)} tables")
    print(f"tables with different words: {len(table_diffs) + abs(len(ta) - len(tb))}\n")

    diffs = []
    pool = list(only_b)
    for s in only_a:
        match = difflib.get_close_matches(s, pool, n=1, cutoff=0.6)
        if match:
            pool.remove(match[0])
            diffs.append("~ " + word_diff(s, match[0]))
        else:
            diffs.append("A only: " + s)
    diffs += ["B only: " + s for s in pool]
    diffs += [f"table {i}: A only {sorted(x.elements())}; B only {sorted(y.elements())}" for i, x, y in table_diffs]
    if len(ta) != len(tb):
        diffs.append(f"tables: {len(ta)} in A, {len(tb)} in B")
    print("\n\n".join(diffs) + "\n")

    if not args.expected:
        return 1 if diffs else 0
    expected = [d for d in open(args.expected, encoding="utf-8").read().split("\n\n") if d.strip()]
    new = [d for d in diffs if d not in expected]
    gone = [d for d in expected if d not in diffs]
    print(f"\nCHECK: {len(diffs)} differences; {len(new)} not in {args.expected}; "
          f"{len(gone)} expected but not found")
    for d in new:
        print("NEW: " + d)
    for d in gone:
        print("GONE: " + d)
    return 1 if (new or gone) else 0


if __name__ == "__main__":
    sys.exit(main())

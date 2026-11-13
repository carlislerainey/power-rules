#!/usr/bin/env python3
"""Turn the paper's text (the pieces from extract.pl) into Markdown for the HTML version.

The LaTeX is changed only where pandoc cannot read the source as written:
  - \\ref{x} becomes a link whose text is the number LaTeX printed in the PDF (from its .aux)
  - each restatable rule becomes a .rulebox div headed "Rule N (Title):", and each
    starred restatement (\\rulepowerint*) repeats the box
  - appendix sections get the "Appendix N." prefix that the PA class prints
  - \\citealt, \\citealp, and \\citeauthor are marked for cites-mark.lua and cites-fix.lua
  - tabularx becomes tabular, \\cmidrule a full rule, \\headrow is dropped,
    and the figure is the SVG
  - captions start with "Table N." or "Figure N.", as the PA class prints them
  - citations of an entry with a shortauthor print it ("ANES"), as biblatex does
  - the notes under the rules become .rulenote divs
Then pandoc (with citeproc) writes Markdown with one line per paragraph.

The appendix (appendix.tex) follows the body, after the reference list; its labels
come from its own .aux.

usage: tex2md.py <dir of extract.pl's pieces> <main text .aux> <appendix .aux> <out dir>
       (writes abstract.md and body.md)
"""
import re
import subprocess
import sys
from pathlib import Path

text_dir, aux_path, app_aux_path, out_dir = (Path(a) for a in sys.argv[1:5])
out_dir.mkdir(parents=True, exist_ok=True)
here = Path(__file__).resolve().parent


def die(msg):
    sys.exit(f"tex2md.py: {msg}")


def sub_count(pattern, repl, text, expected=None, flags=0):
    """re.subn that fails when the number of replacements is not the expected one"""
    new, n = re.subn(pattern, repl, text, flags=flags)
    if n == 0 or (expected is not None and n != expected):
        die(f"pattern {pattern!r} matched {n} times (expected {expected or 'at least 1'})")
    return new


# the printed value of every label in the PDFs (main text and appendix); a label in both
# (the rules, which the appendix restates) must print the same in both
def read_labels(path):
    out = {}
    for m in re.finditer(r"\\newlabel\{([^}]+)\}\{\{(.*?)\}\{", path.read_text()):
        key, value = m.groups()
        if not key.startswith("thmt@"):
            out[key] = re.sub(r"\\nobreakspace\s*\{\}", " ", value).replace("  ", " ")
    return out


labels, app_labels = read_labels(aux_path), read_labels(app_aux_path)
for key in labels.keys() & app_labels.keys():
    if labels[key] != app_labels[key]:
        die(f"{key} prints {labels[key]} in {aux_path} but {app_labels[key]} in {app_aux_path}")
labels.update(app_labels)

tex = (text_dir / "body.tex").read_text() + (text_dir / "appendix.tex").read_text()
abstract = (text_dir / "abstract.tex").read_text()

# restatable rules: define once, repeat with \name*
rules = {}


def rulebox(name, ident):
    title, label, body = rules[name]
    target = f"\\hypertarget{{{ident}}}{{}}" if ident else ""
    return f"\\begin{{rulebox}}\n{target}\\textbf{{Rule {labels[label]} ({title}):}} {body.strip()}\n\\end{{rulebox}}"


def define_rule(m):
    title, name, label, body = m.groups()
    rules[name] = (title, label, body)
    return rulebox(name, label)


tex = sub_count(
    r"\\begin\{restatable\}\[(.*?)\]\{rule0\}\{(\w+)\}\s*\\label\{([^}]+)\}\s*(.*?)\\end\{restatable\}",
    define_rule, tex, expected=7, flags=re.S)
tex = sub_count(r"\\(" + "|".join(rules) + r")\*", lambda m: rulebox(m.group(1), m.group(1) + "-restated"),
                tex, expected=7)


# appendix sections print as "Appendix N. Title"
def appendix_section(m):
    title, label = m.groups()
    return f"\\section*{{{labels[label]}. {title}}}\\label{{{label}}}"


head, appendix = tex.split("\\appendix", 1)
appendix = sub_count(r"\\section\{(.*)\}\\label\{([^}]+)\}", appendix_section, appendix)
tex = head + appendix


# cross-references: the number as printed, linked to its target
def ref(m):
    key = m.group(1)
    if key not in labels:
        die(f"no label {key} in {aux_path}")
    return f"\\hyperref[{key}]{{{labels[key]}}}"


tex = sub_count(r"\\ref\{([^}]+)\}", ref, tex)

# natbib forms without a pandoc citation mode
tex = sub_count(r"\\cite(?:alt|alp)(\[[^\]]*\])?\{", lambda m: f"\\citep[NOPAREN]{m.group(1) or '[]'}{{", tex)
tex = sub_count(r"\\citeauthor\{", r"\\citet[AUTHORONLY][]{", tex)

# tables and figure
tex = sub_count(r"\\headrow\s*", "", tex)
tex = sub_count(r"\\cmidrule\(lr\)\{2-5\}", r"\\hline", tex, expected=3)
tex = re.sub(r"\\renewcommand\s*\\tabularxcolumn.*\n", "", tex)
tex = sub_count(r"\\noindent\\makebox\[\\textwidth\]\[c\]\{%\n(\\begin\{tabularx\}.*\n)", r"\1", tex, expected=1)
tex = sub_count(r"\\end\{tabularx\}\}", r"\\end{tabularx}", tex, expected=1)


def plain_columns(m):
    """Table 2's column specification as one l per column"""
    spec = re.sub(r">\{[^{}]*\}", "", m.group(1))
    if not re.fullmatch(r"(?:X|m\{[^{}]*\})+", spec):
        die(f"cannot read the columns of the tabularx: {m.group(1)}")
    return "\\begin{tabular}{" + "l" * len(re.findall(r"X|m\{[^{}]*\}", spec)) + "}\n"


tex = sub_count(r"\\begin\{tabularx\}\{\\dimexpr[^\n{}]*\\relax\}\{(.*)\}\n", plain_columns, tex, expected=1)
# the appendix's tables (Tables 3 and 4), in the booktabs style
tex = sub_count(r"\\begin\{tabularx\}\{\\linewidth\}\{XXX\}(.*)\n", "\\\\begin{tabular}{lll}\n", tex, expected=2)
tex = sub_count(r"\\end\{tabularx\}", r"\\end{tabular}", tex, expected=3)
tex = sub_count(r"\{geometry\.pdf\}", "{geometry.svg}", tex, expected=1)


# captions start with the label the PA class prints: "Table 1." and "Figure 1."
def caption_label(m):
    env = m.group(0)
    label = re.search(r"\\label\{((tbl|fig):[^}]+)\}", env)
    if not label:
        die("a float without a label")
    name = "Table" if label.group(2) == "tbl" else "Figure"
    return env.replace("\\caption{", f"\\caption{{{name} {labels[label.group(1)]}. ", 1)


tex = sub_count(r"\\begin\{(table|figure)\}.*?\\end\{\1\}", caption_label, tex, expected=5, flags=re.S)

# notes under the rules
tex = sub_count(r"^\{\\noindent ?\\footnotesize ?\\textit\{(.*)\}\}$",
                r"\\begin{rulenote}\n\\textit{\1}\n\\end{rulenote}", tex, flags=re.M)

def pandoc(tex, name, extra=()):
    """pandoc LaTeX -> Markdown; the input is kept next to the output for inspection"""
    src = out_dir / f"{name}-pandoc.tex"
    src.write_text("\\documentclass{article}\n\\begin{document}\n" + tex + "\\end{document}\n")
    subprocess.run(["pandoc", "-f", "latex", "-t", "markdown-citations", "--wrap=none", *extra,
                    "-o", str(out_dir / f"{name}.md"), str(src)], check=True)


# entries cited by a short author ("ANES"), for cites-fix.lua
bib = (here.parent.parent / "latex-version" / "bibliography.bib").read_text()
pairs = []
for entry in re.split(r"\n(?=@)", bib):
    key = re.match(r"@\w+\{([^,]+),", entry)
    full = re.search(r"\bauthor\s*=\s*\{\{?([^{}]+)\}?\}", entry)
    abbrev = re.search(r"\bshortauthor\s*=\s*\{\{?([^{}]+)\}?\}", entry)
    if key and full and abbrev:
        pairs.append(f"  {key.group(1)}:\n    full: \"{full.group(1)}\"\n    short: \"{abbrev.group(1)}\"\n")
(out_dir / "shortauthors.yaml").write_text("shortauthors:\n" + "".join(pairs))

pandoc(abstract, "abstract")
pandoc(tex, "body", [
     "--lua-filter", str(here / "cites-mark.lua"),
     "--citeproc", "--csl", str(here / "pa.csl"),
     "--bibliography", str(here.parent.parent / "latex-version" / "bibliography.bib"),
     "--metadata", "link-citations=true",
     "--metadata-file", str(out_dir / "shortauthors.yaml"),
     "--lua-filter", str(here / "cites-fix.lua"),
     "--lua-filter", str(here / "blocks.lua")])

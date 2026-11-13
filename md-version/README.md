# The Markdown version of the paper, for AI agents

`power-rules.md` is the paper as one plain Markdown file that an AI agent can read from top to bottom: a short guide written for agents, then the paper's text word for word (the abstract, the main text, Appendices 1–4, and the references).

```
make          power-rules.md and the check
make check    compares power-rules.md with the paper
make clean    removes power-rules.md
```

Never edit `power-rules.md`. Edit `guide.md` or the paper's LaTeX source, then `make`.

## What is here

| | |
|---|---|
| `power-rules.md` | The file agents read. Generated. |
| `guide.md` | The top of that file, written by hand: the title, the metadata, and the guide for agents |
| `agents.lua` | The pandoc filter that turns the paper's Markdown into plain Markdown (its opening comment lists every change) |
| `build.py` | Runs pandoc with the filter and puts the paper after the guide |
| `check.py` | The check |
| `Makefile` | `make` |

## How the file is made

The paper's text comes from `../latex-version/power-rules.tex` and `power-rules-appendix.tex` there, through the LaTeX-to-Markdown step of `../html-version/` (its `build/md/abstract.md` and `body.md`; `make` here asks that folder's Makefile for them, so `html-version/` and its requirements must be present). `agents.lua` then changes the markup only, and `build.py` makes three more changes that an agent's text search needs: non-breaking spaces become spaces, curly quotation marks become straight, and the tables lose their padding (square brackets also lose pandoc's backslashes). Last, it writes the index of sections by line number into the guide, at the line `<!-- index -->`.

## How it is written for agents

- **The guide comes first.** An agent may read only the start of a long file: the whole file is about 44,000 tokens (the math is costly), and a test agent's first read stopped at 25,000, before the appendices. So the first 177 lines hold what an agent needs to do a power analysis: an index of the paper's sections by line number (written by `build.py`), when the rules apply, the rules as formulas, the factors, the changes for other designs, where each input comes from, and numbers from the paper to check a calculation against.
- **The paper follows, word for word.** An agent that quotes or cites needs the paper's own sentences, so the text is not shortened or rephrased. The guide says that the paper governs where the two differ.
- **Nothing depends on layout.** Cross-references are plain text ("Rule 3", "Table 1"). Each footnote sits right below the paragraph that cites it. Each rule is a block quote that begins `**Rule N (Name):**`. Each row of a table can be read alone. Figure 1 is its caption and a description in words.
- **It can be searched.** One paragraph per line, the paper's own section titles as headings, ordinary spaces, and straight quotation marks, so that a search for `Rule 3` or `Bloom's Rule` finds it.
- **No YAML front matter.** The metadata is a list under the title. GitHub Pages builds this repository with Jekyll, which turns a Markdown file that opens with front matter into an HTML page; without it, the file is served as it is, at carlislerainey.com/power-rules/md-version/power-rules.md. `build.py` stops if `guide.md` opens with `---`.
- **Left out:** the R code and the simulation checks of the HTML version.

## The check

`check.py` compares every paragraph, heading, list item, footnote, and table of the paper's Markdown with `power-rules.md` (words, numbers, math, and web addresses; not spaces, emphasis, or where a footnote sits) and allows only three additions: the headings "Abstract" and "References" and the figure in words. It also checks the guide: its title is the paper's, its index gives the right line for every section, every number in its table of numbers to check is in the paper, and its formulas give the paper's numbers when worked the way the guide says the paper works them. It was tested by planting errors in copies of the file: a changed number in the text, in math, in a table, and in the guide, a changed web address, and a deleted footnote were each reported.

A fresh agent given only the file (2026-11-13) answered four test questions correctly: a two-sided MDE, the total sample for an interaction, the paper's advice on pilot data with the quoted sentence, and power under a 70/30 split. Its report led to the index and to three clearer rows in the guide.

The check does not compare the guide's prose with the paper. Read the guide again after a change to the paper's rules, factors, or examples.

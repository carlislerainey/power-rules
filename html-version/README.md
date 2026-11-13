# The HTML version of the paper

This folder makes the page at carlislerainey.com/power-rules/html-version/ from the paper's LaTeX source in `../latex-version/`: `power-rules.tex` (the main text) and `power-rules-appendix.tex` (Appendices 1–4). The source is the only place the text lives, so an edit to the paper reaches the page at the next build. This folder is in git, all but `build/`, and GitHub Pages serves the published page from it (`index.html` with its CSS, JS, and figure, which `make publish` writes here).

```
make            the page and the check
make page       build/page/power-rules.html, with its CSS, JS, and figure
make check      compares the page's text and math with the PDFs
make publish    copies the page into this folder, which GitHub Pages serves
make clean      removes build/
```

Build the PDF first (`make` in `../latex-version`).

## What is here

| | |
|---|---|
| `code.qmd` | The R code boxes and the "Check by simulation" boxes, each with the text it follows |
| `convert/` | LaTeX to Markdown: `extract.pl`, `tex2md.py`, `assemble.py`, three pandoc filters, and the citation style `pa.csl` |
| `design/` | How the page looks and behaves: `template.html`, `page.lua`, `power-rules.css`, `power-rules.js` |
| `check/` | The comparison of the page with the PDFs |
| `build/` | Everything generated, including knitr's cache. Never edit it. |

## How the page is made

1. **The text** (`build/text/`). `convert/extract.pl` copies the title, the abstract (between the lines `%%% begin abstract` and `%%% end abstract`), and the body (between `%%% begin body` and `%%% end body`) out of `../power-rules.tex`, byte for byte, and the appendix (from `\appendix` to its `\printbibliography`) out of the appendix file. The appendix restates the seven rule boxes; `extract.pl` turns each back into the main text's restatement (`\rulepowerint*`), so that the page repeats the main text's box, and stops if a box is not the main text's rule word for word.
2. **Markdown** (`build/md/`). `convert/tex2md.py` makes the few changes pandoc needs to read the source (listed at the top of the script; for example, each `\ref` becomes the number printed in the PDF, read from the `.aux` files in `build/tex/`), and pandoc writes Markdown. Citations go through citeproc with `convert/pa.csl`, a copy of the Chicago author-date style adapted to print what the PDF prints. `cites-mark.lua` and `cites-fix.lua` handle the natbib forms (`\citealt`, `\citeyear`, `\citeauthor`) and short authors ("ANES"); `blocks.lua` puts each rule's anchor on its box. The appendix follows the main text's references.
3. **The code** (`build/knit/`). `convert/assemble.py` writes the Quarto document: the text, with each chunk of `code.qmd` placed after the one paragraph that contains the text on its `<!-- after: TEXT -->` line (it stops if that text is in no paragraph or in several). Quarto knits it and keeps knitr's Markdown, `power-rules.html.md`, which has the code's output.
4. **The page** (`build/page/`). Pandoc writes the page from that Markdown with `design/template.html` and `design/page.lua`. The filter changes only elements, never text: each footnote becomes a margin note at its mark, each code callout a `<details>` box, each tabset a row of radio buttons and their panels, and each table caption moves above its table. `power-rules.css` and `power-rules.js` are copied beside the page; their opening comments describe the layout and the script's behaviors, and the page reads the same without the script.
5. **The PDF button.** It goes to `../power-rules.pdf`, the main text, then the appendix, in one file, which `make` in `../latex-version` builds (that Makefile says why Ghostscript joins the two parts). GitHub Pages serves it one folder above the page, at carlislerainey.com/power-rules/power-rules.pdf.

## The code boxes

Each R box in `code.qmd` is a collapsed callout. After each power calculation that the paper makes with the rules, a second callout, "Check by simulation", simulates the design in base R and in DeclareDesign (after Declaration 18.1 of Blair, Coppock, and Humphreys 2023) and reports the average standard error and the share of rejections. The two are tabs in the group "simulation", so that choosing a tab chooses it in every box.

The displayed code reads the cleaned data from the replication archive on Dataverse, by file ID (`https://dataverse.harvard.edu/api/access/datafile/14366477`, `…78`, `…79` for the ANES, BKW, and pilot files). Hidden chunks read the same files from `../replication-archive/output/data/`, which the make copies into `build/knit/data/`, so the page builds offline.

The simulation chunks are cached and labeled (`sim-*`), so an edit elsewhere in `code.qmd` does not rerun them. A build with no cache takes about 11 minutes. An anchor that names a footnote number breaks when a footnote is added before it; `assemble.py` stops and says which.

## The check

- `check/nomath.pl` builds copies of the two PDFs (in `build/check/`) in which every math expression is the word MATH, and tables, captions, and the notes under the rules are marked. The page has one reference list for both parts, so the main text's copy also lists the appendix's references and the appendix's copy has none.
- `check/compare.py` cuts the PDFs and the page into sentences and lists every sentence that is in one but not the other, with a word diff (tables are compared as bags of words; each margin note is read as a footnote). Report: `build/check/text.txt`.
- `check/check_math.py` checks that the page has exactly the math of the LaTeX source. Report: `build/check/math.txt`.

`make check` passes only if the text differences are exactly the reviewed ones in `check/expected.txt` (the PDFs' title blocks, author notes, and date, against the page's own title block), the math matches, and the text has no `[CTK]` cue. After a change to the front matter, review the new report and copy its differences into `check/expected.txt`.

The check was tested by planting errors in copies of the page: a changed number, citation year, cross-reference, table cell, and math expression, a deleted sentence, and a removed margin note were each reported. It does not see differences in hyphens, bullets, or spaces between words (dropped before comparing, because PDF extraction gets them wrong), or in italics, bold, and link targets. It compares sentences wherever they sit, so it would not see a note's text moved into the paragraph around it.

## Requirements

pdflatex and biber (TeX Live 2023), pandoc 3.1, Quarto 1.6, R with tidyverse, sandwich, lmtest, and DeclareDesign, poppler's `pdftohtml`, `pdftocairo`, and `pdfinfo`, Ghostscript 10, and Python 3.

If biber's universal binary fails to unpack, extract the arm64 binary (`/usr/bin/lipo -thin arm64 "$(which biber)" -output biber-arm64`) and run `make BIBER=/path/to/biber-arm64`, here and in `..`. If biber then exits with status 2 and no error after "Found BibTeX data source", its unpacked cache in `$TMPDIR/par-*` is stale: run `make BIBER="env TMPDIR=/some/empty/dir /path/to/biber-arm64"`.

## Posting

1. After a change to the paper: `make` in `../latex-version`, then `make` here.
2. `make publish` copies the page into this folder (as `index.html`, with its CSS, JS, and figure). Then commit and push: GitHub Pages serves the repository's `main` branch. The page's old address, carlislerainey.com/papers/power-rules/, is a redirect in the website.
3. After the journal publishes the article: set `JOURNAL_URL` in the Makefile, which adds the journal button (and `PDF_URL`, if the PDF button should go to the journal's PDF), then build and publish again.

Two things to know:

- The buttons under the abstract take their addresses from `JOURNAL_URL`, `PDF_URL`, `DATAVERSE_URL`, `WEBAPP_URL`, and `PACKAGE_URL` in the Makefile, and the page carries the website's Google Analytics tag (`GA_ID`; empty for none). The page loads Source Serif 4 from Google Fonts and MathJax 4 from jsDelivr.
- The main text types its references to the appendices and to Tables 3 and 4 ("Appendix~2", "Tables~3 and~4"), so these are plain text on the page, with no link and no hover preview. Restoring them would mean changing the LaTeX source.

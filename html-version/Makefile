# The HTML version of the paper (the page at carlislerainey.com/power-rules/html-version/), made
# from ../latex-version/power-rules.tex (the main text) and power-rules-appendix.tex there
#   make            the page and the check
#   make page       build/page/power-rules.html, with its CSS, JS, and figure
#   make check      compares the page's text and math with the PDFs (reports in build/check/)
#   make publish    copies the page into this folder, which GitHub Pages serves
#   make clean      removes build/ (the next build reruns the simulations: about 11 minutes)
# The PDF is built in ../latex-version (its own Makefile). Everything in build/ is generated; never edit it.

# the paper's LaTeX source, and the paper's PDF (the main text and the appendix in one file),
# which ../latex-version's Makefile builds
SRC     = ../latex-version
MAIN    = $(SRC)/power-rules
APP     = $(SRC)/power-rules-appendix
BIB     = $(SRC)/bibliography.bib
FIG     = $(SRC)/geometry.pdf
PDF     = ../power-rules.pdf
# the cleaned data, for knitting offline (the displayed code reads the same files from Dataverse)
DATA    = ../replication-archive/output/data
# the buttons under the abstract (the journal's is left out while JOURNAL_URL is empty, until
# the article has a DOI; the PDF is ../power-rules.pdf, the main text and the appendix in one
# file, which GitHub Pages serves one folder above the page)
JOURNAL_URL   ?=
DATAVERSE_URL ?= https://doi.org/10.7910/DVN/EMLFBT
PDF_URL       ?= ../power-rules.pdf
# the web app (../app/, served from this repository by GitHub Pages) and the R package's site
WEBAPP_URL    ?= https://www.carlislerainey.com/power-rules/app/
PACKAGE_URL   ?= https://www.carlislerainey.com/powerrules/
# the Google Analytics tag of carlislerainey.com (empty: no analytics)
GA_ID         ?= G-F57WQLHH67
BIBER  ?= biber
LATEX   = pdflatex -interaction=nonstopmode -halt-on-error

all: page check

# 1. the text ------------------------------------------------------------------

# the title, abstract, body, and appendix, copied out of the LaTeX source (build/text/)
build/text/body.tex: $(MAIN).tex $(APP).tex convert/extract.pl
	perl convert/extract.pl $(MAIN).tex $(APP).tex build/text

# a build of the main text and of the appendix, for the printed value of every \ref
# (build/tex/*.aux)
build/tex/power-rules.aux: $(MAIN).tex $(BIB) $(FIG)
	mkdir -p build/tex
	cd $(SRC) && $(LATEX) -output-directory=../html-version/build/tex power-rules.tex > /dev/null \
	  && $(BIBER) --input-directory . --output-directory ../html-version/build/tex ../html-version/build/tex/power-rules > /dev/null \
	  && $(LATEX) -output-directory=../html-version/build/tex power-rules.tex > /dev/null \
	  && $(LATEX) -output-directory=../html-version/build/tex power-rules.tex | grep 'Output written'

build/tex/power-rules-appendix.aux: $(APP).tex $(BIB)
	mkdir -p build/tex
	cd $(SRC) && $(LATEX) -output-directory=../html-version/build/tex power-rules-appendix.tex > /dev/null \
	  && $(LATEX) -output-directory=../html-version/build/tex power-rules-appendix.tex | grep 'Output written'

# the text as Markdown (build/md/)
build/md/body.md: build/text/body.tex build/tex/power-rules.aux build/tex/power-rules-appendix.aux convert/tex2md.py convert/*.lua convert/pa.csl $(BIB)
	python3 convert/tex2md.py build/text build/tex/power-rules.aux build/tex/power-rules-appendix.aux build/md

# 2. the code ------------------------------------------------------------------

# the text with the code boxes of code.qmd, knitted by Quarto (build/knit/, which also holds
# knitr's cache); the next step uses knitr's Markdown, with the code's output
build/knit/power-rules.html.md: build/md/body.md convert/assemble.py code.qmd
	python3 convert/assemble.py build/text/title.tex build/md code.qmd build/knit/power-rules.qmd
	mkdir -p build/knit/data
	cp $(DATA)/anes-2020.csv $(DATA)/bkw-survey-5.csv $(DATA)/cutler-pilot.csv build/knit/data/
	cd build/knit && quarto render power-rules.qmd --quiet

# 3. the page ------------------------------------------------------------------

page: build/page/power-rules.html

# pandoc writes the page from knitr's Markdown, with the design in design/
build/page/power-rules.html: build/knit/power-rules.html.md design/template.html design/page.lua design/power-rules.css design/power-rules.js $(FIG) $(PDF)
	mkdir -p build/page
	pandoc build/knit/power-rules.html.md --template design/template.html --toc --toc-depth=1 --wrap=none \
	  $(if $(JOURNAL_URL),-V journal-url=$(JOURNAL_URL)) -V pdf-url=$(PDF_URL) -V dataverse-url=$(DATAVERSE_URL) \
	  -V app-url=$(WEBAPP_URL) -V package-url=$(PACKAGE_URL) $(if $(GA_ID),-V ga-id=$(GA_ID)) \
	  --mathjax -L design/page.lua -o $@ 2>&1 | { grep -v 'Could not convert TeX math' || true; }
	@test -n "$(JOURNAL_URL)" || echo "page: JOURNAL_URL is not set, so the page has no journal button"
	cp design/power-rules.css design/power-rules.js build/page/
	pdftocairo -svg $(FIG) build/page/geometry.svg

# the PDF behind the page's PDF button is ../power-rules.pdf (the main text, then the appendix,
# in one file), built in ../latex-version (make there), never here
$(PDF): $(MAIN).tex $(APP).tex
	@echo "$@ is older than its source: run make in ../latex-version first"; false

# 4. the check -----------------------------------------------------------------

# copies of the two PDFs with each math expression replaced by the word MATH; the main text's
# copy also lists the appendix's references, as the page's one reference list does
build/check/stamp: check/nomath.pl $(MAIN).tex $(APP).tex $(BIB) $(FIG)
	perl check/nomath.pl
	cd build/check && $(LATEX) power-rules.tex > /dev/null && $(BIBER) power-rules > /dev/null \
	  && $(LATEX) power-rules.tex > /dev/null && $(LATEX) power-rules.tex | grep 'Output written'
	cd build/check && $(LATEX) power-rules-appendix.tex > /dev/null && $(BIBER) power-rules-appendix > /dev/null \
	  && $(LATEX) power-rules-appendix.tex > /dev/null && $(LATEX) power-rules-appendix.tex | grep 'Output written'
	touch build/check/stamp

# the text (differences other than the reviewed ones in check/expected.txt fail), the math,
# and no [CTK] cue left in the text
check: build/check/stamp build/page/power-rules.html
	@python3 check/compare.py build/check/power-rules.pdf build/check/power-rules-appendix.pdf build/page/power-rules.html \
	  --expected check/expected.txt > build/check/text.txt; \
	  a=$$?; tail -n +$$(grep -n '^CHECK:' build/check/text.txt | cut -d: -f1) build/check/text.txt; \
	  python3 check/check_math.py build/text/body.tex build/text/appendix.tex build/page/power-rules.html > build/check/math.txt; \
	  b=$$?; cat build/check/math.txt; \
	  ! grep -n 'CTK' build/text/body.tex build/text/appendix.tex || { echo "check: the text still has a [CTK] cue"; false; } && \
	  test $$a -eq 0 -a $$b -eq 0

# publish ----------------------------------------------------------------------

# copy the page into this folder, which is in git (all but build/): GitHub Pages serves the
# repository's main branch, so after a push the page is at carlislerainey.com/power-rules/html-version/;
# the page is index.html here, and its PDF button goes to ../power-rules.pdf. Until 2026-11-13 the page was copied into the website
# (carlislerainey.com/papers/power-rules/, which now redirects here).
SITE ?= .

publish: build/page/power-rules.html
	mkdir -p $(SITE)
	rsync -a --checksum build/page/power-rules.css build/page/power-rules.js build/page/geometry.svg $(SITE)/
	cp build/page/power-rules.html $(SITE)/index.html
	@echo "publish: copied to $(SITE); commit and push to update the page"

clean:
	rm -rf build

.PHONY: all page check publish clean
# a failed recipe leaves no half-built target (a PDF from LaTeX's first pass) for the next make
.DELETE_ON_ERROR:

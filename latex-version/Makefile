# The paper's LaTeX source: power-rules.tex (the main text), power-rules-appendix.tex
# (Appendices 1-4), bibliography.bib, and geometry.pdf (Figure 1).
#   make        builds ../power-rules.pdf (the paper: the main text, then the appendix, in one file)
#   make clean  removes ../power-rules.pdf and build/
# The two parts are built in build/ (ignored by git): build/power-rules.pdf is the main text
# alone, build/power-rules-appendix.pdf the appendix alone.
# If biber's universal binary fails to unpack,
# extract the arm64 binary (lipo -thin arm64 "$(which biber)" -output biber-arm64) and run
# make BIBER=/path/to/biber-arm64.
PDF    = ../power-rules.pdf
BIBER ?= biber
LATEX  = pdflatex -interaction=nonstopmode -halt-on-error -output-directory=build
JUNK   = aux bbl bcf blg fdb_latexmk fls log out run.xml synctex.gz

all: $(PDF)

# the paper: the main text, then the appendix, in one file. Ghostscript joins them because it
# turns each file's named link targets into page targets: qpdf drops the targets, and pdfunite
# keeps only the first file's, so the appendix's links (which reuse names such as Hfootnote.1)
# would go to the main text. Ghostscript rewrites the pages' fonts, which changes nothing
# visible (checked page by page on 2026-10-25).
$(PDF): build/power-rules.pdf build/power-rules-appendix.pdf
	gs -q -dNOPAUSE -dBATCH -sDEVICE=pdfwrite -dAutoRotatePages=/None -dDownsampleColorImages=false \
	  -dDownsampleGrayImages=false -dDownsampleMonoImages=false -o $@ $^ \
	  -c "[ /Title (Power Rules: Practical Advice for Computing Statistical Power) /Author (Carlisle Rainey) /DOCINFO pdfmark"
	@m=$$(pdfinfo build/power-rules.pdf | awk '/^Pages:/{print $$2}'); \
	  a=$$(pdfinfo build/power-rules-appendix.pdf | awk '/^Pages:/{print $$2}'); \
	  n=$$(pdfinfo $@ | awk '/^Pages:/{print $$2}'); echo "$@: $$m + $$a = $$n pages"; test $$n -eq $$((m + a))

build/power-rules.pdf: geometry.pdf

# pdflatex, biber, pdflatex twice, all in build/; the log is kept only if the build fails
build/%.pdf: %.tex bibliography.bib
	mkdir -p build
	$(LATEX) $*.tex > /dev/null
	$(BIBER) --input-directory . --output-directory build build/$* > /dev/null
	$(LATEX) $*.tex > /dev/null
	$(LATEX) $*.tex | grep 'Output written'
	@! grep -E 'There were undefined references|Citation .* undefined' build/$*.log \
	  || { echo "$*: undefined references or citations"; false; }
	rm -f $(addprefix build/$*.,$(JUNK))

clean:
	rm -rf build $(PDF)

.PHONY: all clean
.DELETE_ON_ERROR:

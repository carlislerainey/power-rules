# make        builds power-rules.pdf (the main text) and power-rules-appendix.pdf
# make clean  removes both PDFs and LaTeX's intermediate files
# If biber's universal binary fails to unpack,
# extract the arm64 binary (lipo -thin arm64 "$(which biber)" -output biber-arm64) and run
# make BIBER=/path/to/biber-arm64.
PAPERS = power-rules power-rules-appendix
BIBER ?= biber
LATEX  = pdflatex -interaction=nonstopmode -halt-on-error
JUNK   = aux bbl bcf blg fdb_latexmk fls log out run.xml synctex.gz

all: $(addsuffix .pdf,$(PAPERS))

power-rules.pdf: geometry.pdf

# pdflatex, biber, pdflatex twice; the log is kept only if the build fails
%.pdf: %.tex bibliography.bib
	$(LATEX) $*.tex > /dev/null
	$(BIBER) $* > /dev/null
	$(LATEX) $*.tex > /dev/null
	$(LATEX) $*.tex | grep 'Output written'
	@! grep -E 'There were undefined references|Citation .* undefined' $*.log \
	  || { echo "$*: undefined references or citations"; false; }
	rm -f $(addprefix $*.,$(JUNK))

clean:
	rm -f $(addsuffix .pdf,$(PAPERS)) $(foreach p,$(PAPERS),$(addprefix $(p).,$(JUNK)))

.PHONY: all clean
.DELETE_ON_ERROR:

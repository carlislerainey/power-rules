# The Markdown version of the paper for AI agents: power-rules.md
#   make          power-rules.md and the check
#   make check    compares power-rules.md with the paper
#   make clean    removes power-rules.md
# power-rules.md is guide.md (written by hand) followed by the paper's text, which comes
# from ../power-rules.tex and ../power-rules-appendix.tex through ../html-version's LaTeX
# to Markdown step (its build/md/). Edit guide.md or the LaTeX source, never power-rules.md.

HTML = ../html-version
MD   = $(HTML)/build/md

all: power-rules.md check

# the paper as Markdown, made in ../html-version (its Makefile knows how)
$(MD)/body.md: ../power-rules.tex ../power-rules-appendix.tex ../bibliography.bib
	$(MAKE) -C $(HTML) build/md/body.md

power-rules.md: guide.md agents.lua build.py $(MD)/body.md
	python3 build.py $(MD) $@

check: power-rules.md
	@python3 check.py $(MD) $(HTML)/build/text/title.tex power-rules.md

clean:
	rm -f power-rules.md

.PHONY: all check clean
.DELETE_ON_ERROR:

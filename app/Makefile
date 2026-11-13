# The Power Rules web app (carlislerainey.com/power-rules/app/): the Shiny guide of the R
# package powerrules, as static files
#   make check      compares the app with the installed R package (needs R and Node; about
#                   two minutes, most of it R running the Shiny app's server)
# Nothing here is generated: index.html, app.js, powerrules.js, base.css, and board.css are
# the app, as they are. GitHub Pages serves this repository's main branch, so a push
# publishes them; there is nothing to copy. The check writes R's values to a temporary
# folder outside this one and removes it.

# check ------------------------------------------------------------------------

# every number, format, sentence, note, pipeline string, and board output, against R
check:
	@command -v node > /dev/null || { echo "check: Node is not installed"; exit 1; }
	@Rscript -e 'for (p in c("powerrules", "shiny", "jsonlite")) if (!requireNamespace(p, quietly = TRUE)) { cat("check: the R package", p, "is not installed (see README.md)\n"); quit(status = 1) }'
	@tmp=$$(mktemp -d) && trap 'rm -rf "$$tmp"' EXIT \
	  && Rscript check/expected.R "$$tmp/expected.json" \
	  && node check/check.js "$$tmp/expected.json"

.PHONY: check

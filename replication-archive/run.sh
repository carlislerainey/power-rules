#!/bin/bash
# replicate "Power Rules: Practical Advice for Computing Statistical Power"

cd "$(dirname "$0")" || exit 1      # run from this folder, wherever run.sh is called from
exec > run.log 2>&1                 # write all output to run.log
set -ex                             # print each command; stop at the first error

date

# clean the data
Rscript -e 'source("R/01-clean-anes.R", echo = TRUE, keep.source = TRUE, max.deparse.length = Inf)'
Rscript -e 'source("R/02-clean-bkw.R", echo = TRUE, keep.source = TRUE, max.deparse.length = Inf)'
Rscript -e 'source("R/03-clean-pilot.R", echo = TRUE, keep.source = TRUE, max.deparse.length = Inf)'

# compute the numbers in the paper that come from data
Rscript -e 'source("R/04-compute-quantities.R", echo = TRUE, keep.source = TRUE, max.deparse.length = Inf)'

# make the base plot for Figure 1
Rscript -e 'source("R/05-make-figure-1.R", echo = TRUE, keep.source = TRUE, max.deparse.length = Inf)'

# simulation for footnote 12
Rscript -e 'source("R/06-simulate-rule-1.R", echo = TRUE, keep.source = TRUE, max.deparse.length = Inf)'

date

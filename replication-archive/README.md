

# Replication Archive for “Power Rules: Practical Advice for Computing Statistical Power”

Carlisle Rainey, Florida State University (crainey@fsu.edu)

## Overview

Run `run.sh` to reproduce:

1.  the empirical results in the paper,
2.  the base plot for Figure 1 (I added annotations by hand in Apple
    Keynote in `keynote/geometry.key`), and
3.  the simulation in footnote 12.

The other numbers in the paper, including those in Tables 1, 3, and 4,
are simple arithmetic on the rules.

## Data Availability and Provenance Statements

All data needed to run the code are in `data/`.

**American National Election Studies.**
`data/anes_timeseries_cdf_csv_20260205.csv` is the [ANES Time Series
Cumulative Data
File](https://electionstudies.org/data-center/anes-time-series-cumulative-data-file/)
(release of February 5, 2026). The ANES codebook
(<https://electionstudies.org/wp-content/uploads/2026/02/anes_timeseries_cdf_codebook_var_20260205.pdf>)
explains the variables.

**Broockman, Kalla, and Westwood (2023).** `data/bkw-survey-5.dta` is
the file `Survey 5/Survey 5 Data.tab` from their replication archive on
[Dataverse](https://doi.org/10.7910/DVN/3AOBP2). The file
`Survey 5/Survey 5 Codebook.txt` explains each variable.

**Cutler, Pietryka, and Rainey pilot study.**
`data/cutler-pilot-extract.csv` is an extract from a pilot study for
Cutler, Pietryka, and Rainey’s (2026) replication of Ahler and Sood
(2018). The variables are described below:

- `condition`: experimental condition (`control`, `ask`, or `tell`)
- `pre_ft_outparty`: feeling thermometer toward the out-party (0-100);
  measured pre-treatment
- `post_ft_outparty`: the same feeling thermometer; measured
  post-treatment

## Computational Requirements

The output was last run on October 23, 2026 with the software and
hardware below.

### Software

- R version 4.6.1 (2026-06-24)
  - tidyverse 2.0.0
  - dplyr 1.2.1
  - ggplot2 4.0.3
  - purrr 1.2.2
  - readr 2.2.0
  - tibble 3.3.1
  - haven 2.5.5
  - sandwich 3.1-3
  - lmtest 0.9-40
  - testthat 3.3.2

### Hardware

- macOS Tahoe 26.7.1, Apple M2 Max (12 cores), 32 GB of RAM

The code took 8 seconds to run using one core and used less than 2 GB of
RAM. The archive uses 164 MB of disk space.

## Description of Files

| File | Description |
|----|----|
| `run.sh` | Runs all scripts in order and writes `run.log` |
| `run.log` | Log file of the commands and output from `run.sh` |
| `R/01-clean-anes.R` | Creates the cleaned ANES dataset `output/data/anes-2020.csv` |
| `R/02-clean-bkw.R` | Creates the cleaned Broockman, Kalla, and Westwood dataset `output/data/bkw-survey-5.csv` (respondents in the control and Ahler and Sood conditions) |
| `R/03-clean-pilot.R` | Creates the cleaned Cutler, Pietryka, and Rainey pilot dataset `output/data/cutler-pilot.csv` |
| `R/04-compute-quantities.R` | Computes quantities contained in the empirical examples |
| `R/05-make-figure-1.R` | Creates the base plot for Figure 1, `output/fig/figure-1-base.pdf`; annotations were added in `keynote/geometry.key` |
| `R/06-simulate-rule-1.R` | Runs the simulation in footnote 12 |
| `keynote/geometry.key` | Keynote source for Figure 1: the base plot from `R/05-make-figure-1.R` with hand-added annotations |
| `keynote/geometry.pdf` | Figure 1 as it appears in the paper, exported from `keynote/geometry.key` |
| `output/` | Files created by the R scripts |
| `data/` | Datasets described above |

Further, `R/04-compute-quantities.R` and `R/06-simulate-rule-1.R`
compare each number to a hand-entered value (i.e., the one that is typed
into the paper). They generate an error if any number does not match.

## Instructions to Replicators

1.  Install R and the packages with
    `install.packages(c("tidyverse", "haven", "sandwich", "lmtest", "testthat"))`.
2.  From this folder, run `bash run.sh`.

`run.sh` contains the following:

``` bash
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
```

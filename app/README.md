# The Power Rules web app

A static, in-browser port of the Shiny guide in the R package `powerrules` (`shiny_rules()`; its source is `inst/shiny/` in the package), at carlislerainey.com/power-rules/app/. It has no framework, no server, and no build step: the files in this folder are the app. Open `index.html` in a browser to use it.

```
make check      compares the app with the installed R package
```

## What is here

| | |
|---|---|
| `index.html` | The page: the Shiny app's board, with its markup, labels, and descriptions |
| `app.js` | The interface: the formula lines (a port of `inst/shiny/helpers.R`), the board's logic (the server in `inst/shiny/app.R`), and the wiring to the page |
| `powerrules.js` | Only the formulas and the number formatting: `pnorm`, `qnorm`, `from_*()`, `find_*()`, the formats of `R/format.R`, the manuscript sentence, the MDE-factor note, and the pipeline string |
| `board.css` | The package's `inst/shiny/www/board.css`, byte for byte. Never edit it here; copy it again when the package's changes. |
| `base.css` | The rules of Bootstrap 3 and `shiny.css` that `board.css` was written on top of (the Shiny page is a Bootstrap page, with a 10px root font size, so each `rem` in `board.css` is 10px). Loaded before `board.css`. |
| `check/` | The comparison with R: `expected.R` and `check.js` |
| `Makefile` | `make check` |

`powerrules.js` and `app.js` each say at the top which R file each part ports. They load in a browser and under Node, which is how the check runs them.

## The check

R is the reference. `make check` needs R with the packages `powerrules`, `shiny`, and `jsonlite`, and Node. It takes about two minutes.

- `check/expected.R` writes what R says to a temporary file: `pnorm()` and `qnorm()` over a grid; the package's number formats over a list of values; `from_*() |> find_*()` over a grid of all nine source-by-goal combinations, both designs, and eleven power levels (0.975 and 0.999 among them), with every number in the result, the manuscript sentence, the note, and the pipeline string; and the HTML of every output of the Shiny app's own server (run with `shiny::testServer()`) for about 1,900 states of the inputs: blank, partly filled, complete, and out of range.
- `check/check.js` runs `powerrules.js` and `app.js` under Node over the same inputs. `pnorm` and `qnorm` must agree with R to 1e-12, the other numbers to a relative 1e-12 (the sample size exactly), and every string exactly. It also computes ten values from the paper written out in the script, and checks that `board.css` is the installed package's.

If `powerrules` is not installed, install it from its folder without building there:

```bash
cd "$(mktemp -d)" && R CMD build --no-build-vignettes --no-manual ~/Library/CloudStorage/Dropbox/-old/packages/powerrules && R CMD INSTALL powerrules_*.tar.gz
```

The check does not cover the page itself: which blocks of inputs show for each choice, the copy buttons, and how it looks. Look at those in a browser after a change to `index.html`, `base.css`, or the end of `app.js`.

## Posting

GitHub Pages serves this repository's `main` branch at carlislerainey.com/power-rules/, so the app is whatever `app/` holds on GitHub.

1. `make check`.
2. Commit and push. The page updates a minute or so later.

The page loads Fira Sans and Fira Code from Google Fonts (the first line of `board.css`).

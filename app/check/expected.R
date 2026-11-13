# expected.R: what R says, for check.js to compare the app with.
#
#   Rscript expected.R <file.json>
#
# Writes one JSON file with five parts, each computed by the installed R
# package powerrules (and, for the board, by its Shiny app's own server):
#
#   normal    pnorm() and qnorm() over a grid
#   formats   the number formats of R/format.R over a list of values
#   pipeline  from_*() |> find_*() over a grid: every number in the result,
#             the manuscript sentence, the MDE-factor note, the pipeline string
#   board     the HTML of every output of the Shiny server, for a list of raw
#             inputs (blank, partial, complete, and out of range)
#   board_css the checksum of the package's board.css
#
# Numbers are written as strings with 17 significant digits, which is enough
# to read back the same double.

suppressPackageStartupMessages({
  library(powerrules)
  library(shiny)
  library(jsonlite)
})

out_file <- commandArgs(trailingOnly = TRUE)[1]
if (is.na(out_file)) stop("usage: Rscript expected.R <file.json>")

pr <- asNamespace("powerrules")
set.seed(20261113)

# a number as a string that reads back exactly (NA: null)
g <- function(x) ifelse(is.na(x), NA_character_, sprintf("%.17g", x))
g1 <- function(x) if (is.null(x) || is.na(x)) NULL else sprintf("%.17g", x)

# --- normal -------------------------------------------------------------------

x <- c(seq(-40, 40, by = 0.0137), rnorm(5000, 0, 3),
       0, 1e-17, 0.67448975, 5.656854249492381, -37.5, 8.29, 8.3)
p <- c(seq(0.0005, 0.9995, by = 0.0005), runif(5000),
       10^-seq(2, 323, by = 0.25), 1 - 10^-seq(2, 15.9, by = 0.1),
       0.80, 0.90, 0.95, 0.975, 0.999, 0.85, 0.5, 0.075, 0.925,
       exp(-25), 1 - exp(-25), 5e-324, 1 - 2^-53)

normal <- list(x = g(x), pnorm = g(pnorm(x)), p = g(p), qnorm = g(qnorm(p)))

# --- formats ------------------------------------------------------------------

v <- c(0, 1, 2, 20.8, 0.05, 2.13, 268, 0.67, 1.005, 2.675, 0.995, 0.9949999,
       1234.5678, 1234567.891, 0.000123, 0.00001234, 3.14159265358979,
       99.99999999999, 1e-11, 1e15, 123456789012, 12345678901.5, 0.1 + 0.2,
       97.5, 99.9, 2 / 3, 1e5 / 3, 999.995, 999999.5, 1000.5, 2469135.8,
       (1:48) / 8, 100 + (1:48) / 8, (1:20) / 2,          # exact ties
       10^runif(400, -6, 9), round(10^runif(400, -3, 6), sample(0:6, 400, TRUE)),
       signif(10^runif(400, -4, 7), sample(1:12, 400, TRUE)))
pv <- c(0.80, 0.90, 0.95, 0.975, 0.999, 0.85, 0.5, 0.06, 0.9999, 0.123456,
        0.03, 0.05, 0.0500001, 0.725, 0.735, 0.72499999, 0.995, 0.9951,
        0.99499, 0.999999, 0.8 + 1e-9, 0.95 - 1e-9, 0.8 + 1e-7,
        seq(0.005, 0.995, by = 0.005), runif(300))

formats <- list(
  v = g(v),
  fmt = vapply(v, pr$fmt, ""),
  fmt_val = vapply(v, pr$fmt_val, ""),
  fmt_int = vapply(v, pr$fmt_int, ""),
  fmt_total = vapply(v, function(x) format(x, big.mark = ",", scientific = FALSE), ""),
  p = g(pv),
  fmt_pct = vapply(pv, pr$fmt_pct, ""),
  fmt_prob = vapply(pv, pr$fmt_prob, ""),
  fmt_power = vapply(pv, pr$fmt_power, ""),
  mde_factor_table = vapply(pv, pr$mde_factor_table, "", ci = 0.90)
)

# --- pipeline -----------------------------------------------------------------

sources <- c(
  unlist(lapply(c(20.8, 2.0, 1, 0.5, 15.37, 100), function(s)
    lapply(c(0, 0.05, 0.3, 0.9), function(r)
      list(type = "sd", sd_y = s, r_squared = r))), recursive = FALSE),
  Map(function(se, n) list(type = "existing", se_existing = se, n_existing = n),
      c(1.8, 0.21, 5, 0.75, 12.5), c(268, 1000, 30, 150.5, 64)),
  Map(function(se, n) list(type = "pilot", se_pilot = se, n_pilot = n),
      c(2.13, 0.4, 10, 1.234567), c(85, 50, 20, 12))
)
ns <- c(500, 50, 1000, 2500, 12, 100000, 1, 128)
taus <- c(3, 0.67, 0.1, 1.5, 10, 50)
powers <- c(0.80, 0.90, 0.95, 0.975, 0.999, 0.85, 0.5, 0.06, 0.9999, 0.05001,
            0.99999999999)

make_source <- function(s, interaction) {
  switch(s$type,
    sd = from_sd(s$sd_y, s$r_squared, interaction = interaction),
    existing = from_existing(s$se_existing, s$n_existing, interaction = interaction),
    pilot = from_pilot(s$se_pilot, s$n_pilot, interaction = interaction))
}

# The manuscript sentence. The three text builders are internal functions of
# the package, and build_sentence() has taken the design's labels as arguments
# in some versions and worked them out from the result in others.
sentence_of <- function(res, interaction) {
  if (length(formals(pr$build_sentence)) == 1) return(pr$build_sentence(res))
  pr$build_sentence(res,
                    if (interaction) "interaction" else "treatment effect",
                    if (interaction) "an interaction" else "a treatment effect",
                    if (interaction) 4 else 2)
}

one_case <- function(s, interaction, goal, n = NULL, tau = NULL, power = NULL) {
  src <- make_source(s, interaction)
  res <- switch(goal,
    mde = find_mde(src, n_planned = n, quiet = TRUE),
    power = find_power(src, n_planned = n, tau = tau, quiet = TRUE),
    n = find_n(src, tau = tau, power = power, quiet = TRUE))

  # the inputs as the Shiny app passes them (inst/shiny/helpers.R)
  inputs <- c(s[setdiff(names(s), "type")],
              list(n_planned = n, tau = tau, interaction = interaction,
                   ci = 0.90, power = if (is.null(power)) 0.80 else power))

  list(
    source = lapply(s, function(z) if (is.character(z)) z else g1(z)),
    interaction = interaction, goal = goal,
    n = g1(n), tau = g1(tau), power = g1(power),
    numbers = lapply(res[setdiff(names(res), c("goal", "source"))], g1),
    sentence = sentence_of(res, interaction),
    note = pr$build_note(res),
    pipeline = pr$build_pipeline_code(s$type, goal, inputs)
  )
}

pipeline <- list()
for (s in sources) for (interaction in c(FALSE, TRUE)) {
  for (n in ns) {
    pipeline[[length(pipeline) + 1]] <- one_case(s, interaction, "mde", n = n)
    for (tau in taus)
      pipeline[[length(pipeline) + 1]] <- one_case(s, interaction, "power", n = n, tau = tau)
  }
  for (tau in taus) for (power in powers)
    pipeline[[length(pipeline) + 1]] <- one_case(s, interaction, "n", tau = tau, power = power)
}

# --- board ----------------------------------------------------------------------

# what the user has typed (NA: a blank field)
base <- list(custom_power = NA, sd_y = 20.8, r_squared = NA, se_existing = 1.8,
             n_existing = 268, se_pilot = 2.13, n_pilot = 85, n_planned = 500,
             tau = 3)
fields <- setdiff(names(base), "custom_power")
blank <- lapply(base, function(z) NA)
vary <- function(...) { s <- base; a <- list(...); s[names(a)] <- a; s }

typed <- c(
  list(blank, base),
  lapply(c(0.05, 0.3, 0, 5, 1, -0.1, 0.999, 1e-4), function(z) vary(r_squared = z)),
  lapply(fields, function(f) { s <- base; s[[f]] <- NA; s }),      # one blank
  lapply(fields, function(f) { s <- blank; s[[f]] <- base[[f]]; s }),  # one typed
  lapply(c(500.5, 0, -5, 1234567, 500.000000001, 500.0000001, 1, 12, 500.25),
         function(z) vary(n_planned = z)),
  lapply(c(0, -3, 0.67, 0.00001, 250), function(z) vary(tau = z)),
  lapply(c(123456.789, 0.000123, 3.14159265358979, 0, -2), function(z) vary(sd_y = z)),
  list(vary(sd_y = 2.0, tau = 0.67),
       vary(sd_y = 2.0, tau = 0.67, r_squared = 0.25),
       vary(sd_y = 1, n_planned = 128),                 # SE is exactly 0.125
       vary(se_existing = 0.21, n_existing = 1000),
       vary(n_existing = 150.5), vary(se_existing = 0), vary(n_existing = -4),
       vary(se_pilot = 0.4, n_pilot = 50), vary(n_pilot = 1), vary(n_pilot = -3),
       vary(se_pilot = 0), vary(r_squared = 5, n_planned = 500.5),
       vary(n_planned = 100000, tau = 50), vary(n_planned = 3, tau = 0.01))
)

selects <- expand.grid(source_type = c("sd", "existing", "pilot"),
                       goal_type = c("mde", "power", "n"),
                       design_type = c("treatment", "interaction"),
                       stringsAsFactors = FALSE)

states <- list()
add <- function(sel, s, power_choice = "0.80", custom_power = NA) {
  s$custom_power <- custom_power
  states[[length(states) + 1]] <<- c(as.list(sel), list(power_choice = power_choice), s)
}
for (i in seq_len(nrow(selects))) for (s in typed) add(selects[i, ], s)

# the power-level setting (the sample-size goal only)
customs <- c(NA, 0.85, 0.975, 0.999, 0.9, 0.05, 0.03, 0, 1, 1.5, -0.2,
             0.0500001, 0.5, 0.99999999999)
some <- list(blank, base, vary(r_squared = 0.05), vary(tau = NA), vary(sd_y = NA),
             vary(r_squared = 5), vary(sd_y = 2.0, tau = 0.67),
             vary(n_planned = 500.5))
for (i in which(selects$goal_type == "n")) for (s in some) {
  add(selects[i, ], s, "0.90")
  add(selects[i, ], s, "0.95")
  for (cp in customs) add(selects[i, ], s, "custom", cp)
}
# a custom value left in its field while another level is chosen, and while
# the goal is not the sample size
for (i in seq_len(nrow(selects))) {
  add(selects[i, ], base, "0.95", 0.03)
  add(selects[i, ], base, "custom", 0.03)
}

outputs <- c("n_label", "total_annotation", "problem_box", "computation",
             "result_highlight", "sentence_box", "note_box", "pipeline_box")
store <- new.env()
store$html <- vector("list", length(states))

# the Shiny app's own server, driven without a browser
testServer(system.file("shiny", package = "powerrules"), {
  for (i in seq_along(states)) {
    do.call(session$setInputs, states[[i]])
    store$html[[i]] <- lapply(setNames(outputs, outputs), function(o) {
      value <- output[[o]]
      if (is.null(value)) "" else as.character(value$html)
    })
  }
})

board <- Map(function(s, h) {
  list(input = lapply(s, function(z) if (is.character(z)) z else g1(z)), html = h)
}, states, store$html)

# --- write ----------------------------------------------------------------------

css <- system.file("shiny", "www", "board.css", package = "powerrules")

write_json(
  list(package_version = as.character(packageVersion("powerrules")),
       r_version = R.version.string,
       normal = normal, formats = formats, pipeline = pipeline, board = board,
       board_css_md5 = unname(tools::md5sum(css))),
  out_file, auto_unbox = TRUE, null = "null", na = "null")

cat(sprintf("expected.R: powerrules %s, %s; %d + %d normal values, %d + %d formatted, %d pipelines, %d board states\n",
            packageVersion("powerrules"), R.version.string, length(x), length(p),
            length(v), length(pv), length(pipeline), length(board)))

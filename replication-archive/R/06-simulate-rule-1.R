# run simulation for footnote 12

# load packages
library(tidyverse)
library(testthat)

# set seed
set.seed(1234)

# design
n   <- 50             # respondents per condition
se  <- 2*1/sqrt(2*n)  # true SE with SD = 1 (Rule 3)
tau <- 2.5*se         # treatment effect, so that tau/SE = 2.5

# simulate experiments in chunks; each row of y0 and y1 is one experiment
simulate_experiments <- function(n_exp) {
  y0 <- matrix(rnorm(n_exp*n, mean = 0,   sd = 1), nrow = n_exp)
  y1 <- matrix(rnorm(n_exp*n, mean = tau, sd = 1), nrow = n_exp)
  row_var <- function(y) rowSums((y - rowMeans(y))^2)/(n - 1)
  se_hat  <- sqrt(row_var(y1)/n + row_var(y0)/n)  # HC2 (Neyman) SE
  rowMeans(y1) - rowMeans(y0) - 1.64*se_hat > 0
}
reject <- map(rep(10000, 100), simulate_experiments) %>% unlist()  # 1,000,000 experiments

# power from Rules 1 and 2 (the two forms are equal) and simulated power
power_rule_1    <- 1 - pnorm(1.64 - tau/se)
power_simulated <- mean(reject)
c(power_rule_1, power_simulated)

# error in power (percentage points; paper: less than 1)
error_pct_points <- 100*abs(power_simulated - power_rule_1)
error_pct_points

# test that code reproduces value reported in the paper
expect_lt(
  error_pct_points,
  1  # reported in paper (less than 1 percentage point)
  )

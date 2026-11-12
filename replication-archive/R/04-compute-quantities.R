# compute the numbers in "Power Rules" that come from data

# load packages
library(tidyverse)
library(sandwich)
library(lmtest)
library(testthat)

# load clean data
anes  <- read_csv("output/data/anes-2020.csv")
bkw   <- read_csv("output/data/bkw-survey-5.csv")
pilot <- read_csv("output/data/cutler-pilot.csv")

# Example: Evaluating Power for a Fixed Sample Size -----------------------

# Broockman, Kalla, and Westwood's replication of Ahler and Sood
fit_bkw <- lm(ft_outparty ~ treatment, data = bkw)

# estimate
est_bkw <- coef(fit_bkw)[["treatment"]]
est_bkw

# test that code reproduces value reported in the paper
expect_equal(
  round(est_bkw, 1),
  3.9  # reported in paper
  )

# 90% CI
ci_bkw <- coefci(fit_bkw, "treatment", level = 0.90, vcov. = vcovHC(fit_bkw, type = "HC2"), df = Inf)
ci_bkw

# test that code reproduces value reported in the paper
expect_equal(
  unname(round(ci_bkw[1, ], 1)),
  c(1.1, 6.6)  # reported in paper
  )

## Without Control Variables: Rules 3 and 5 -------------------------------

# SD of the out-party ft in the 2020 ANES (unweighted)
sd_anes <- sd(anes$ft_outparty)
sd_anes

# test that code reproduces value reported in the paper
expect_equal(
  round(sd_anes, 1),
  20.8  # reported in paper
  )

## With Control Variables: Rules 3, 4, and 5 ------------------------------

# R^2 of party id and partisan strength in the 2020 ANES (%)
r_sq_anes <- summary(lm(ft_outparty ~ pid7 + pid_strength, data = anes))$r.squared
r_sq_anes

# test that code reproduces value reported in the paper
expect_equal(
  round(100*r_sq_anes),
  5  # reported in paper
  )

# footnote 27: R^2 in Broockman, Kalla, and Westwood's control group (%)
r_sq_bkw_control <- summary(lm(ft_outparty ~ pid7 + pid_strength, data = filter(bkw, treatment == 0)))$r.squared
r_sq_bkw_control

# test that code reproduces value reported in the paper
expect_equal(
  round(100*r_sq_bkw_control, 1),
  1.0  # reported in paper
  )

# footnote 27: R^2 in Broockman, Kalla, and Westwood's treatment group (%)
r_sq_bkw_treatment <- summary(lm(ft_outparty ~ pid7 + pid_strength, data = filter(bkw, treatment == 1)))$r.squared
r_sq_bkw_treatment

# test that code reproduces value reported in the paper
expect_equal(
  round(100*r_sq_bkw_treatment, 1),
  1.8  # reported in paper
  )

# footnote 27: average R^2 of the two groups (%)
r_sq_bkw <- mean(c(r_sq_bkw_control, r_sq_bkw_treatment))
r_sq_bkw

# test that code reproduces value reported in the paper
expect_equal(
  round(100*r_sq_bkw, 1),
  1.4  # reported in paper
  )

# footnote 27: reduction in the SE from the average R^2 (%)
se_reduction_bkw <- 1 - sqrt(1 - r_sq_bkw)
se_reduction_bkw

# test that code reproduces value reported in the paper
expect_equal(
  round(100*se_reduction_bkw, 1),
  0.7  # reported in paper
  )

# footnote 28: R^2 of the pre-treatment measure within condition in the pilot (%)
fit_pilot_pre  <- lm(post_ft_outparty ~ condition + pre_ft_outparty, data = pilot)
fit_pilot_cond <- lm(post_ft_outparty ~ condition, data = pilot)
r_sq_pilot <- 1 - sum(resid(fit_pilot_pre)^2)/sum(resid(fit_pilot_cond)^2)
r_sq_pilot

# test that code reproduces value reported in the paper
expect_equal(
  round(100*r_sq_pilot),
  76  # reported in paper
  )

# footnote 28: reduction in the SE from the pilot R^2 (%)
se_reduction_pilot <- 1 - sqrt(1 - r_sq_pilot)
se_reduction_pilot

# test that code reproduces value reported in the paper
expect_equal(
  round(100*se_reduction_pilot),
  51  # reported in paper
  )


# software versions -------------------------------------------------------

sessionInfo()

# clean Broockman, Kalla, and Westwood's (2023) replication of Ahler and Sood (2018)

# load packages
library(tidyverse)
library(haven)

# load data
svy5_raw <- read_dta("data/bkw-survey-5.dta") %>%
  # keep respondents who finished Survey 5
  filter(finished_survey == 1) %>%
  glimpse()

bkw <- svy5_raw %>%
  # keep the control and the Ahler and Sood treatment
  filter(treatment %in% c("control", "ahler_sood")) %>%
  mutate(treatment = case_when(treatment == "control" ~ 0,
                               treatment == "ahler_sood" ~ 1),
         pid7 = as.numeric(pid7),
         pid_strength = abs(pid7 - 4)) %>%
  # outcome is the out-party ft (not the difference between the in- and out-party fts)
  select(treatment, pid7, pid_strength, ft_outparty = therm_outparty) %>%
  glimpse()

# write clean data
dir.create("output/data", recursive = TRUE, showWarnings = FALSE)
write_csv(bkw, "output/data/bkw-survey-5.csv")

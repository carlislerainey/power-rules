# clean the 2020 ANES for the worked examples

# load packages
library(tidyverse)

# load data (ANES cumulative data file; from February 5, 2026)
anes_raw <- read_csv("data/anes_timeseries_cdf_csv_20260205.csv",
                     col_select = c(VCF0004,   # year of study
                                    VCF0218,   # feeling thermometer toward Democratic party
                                    VCF0224,   # feeling thermometer toward Republican party
                                    VCF0301,   # party identification, 7 categories
                                    VCF0303,   # party identification, 3 categories, including leaners
                                    VCF0305),  # strength of partisanship
                     show_col_types = FALSE) %>%
  glimpse()

anes <- anes_raw %>%
  # keep 2020 respondents
  filter(VCF0004 == 2020) %>%
  select(raw_ft_dem = VCF0218,
         raw_ft_rep = VCF0224,
         raw_pid = VCF0303,
         pid7 = VCF0301,
         pid_strength = VCF0305) %>%
  # party id
  mutate(pid3 = case_when(raw_pid == 1 ~ "Democrat",
                          raw_pid == 2 ~ "Independent",
                          raw_pid == 3 ~ "Republican")) %>%
  # out-party ft (97 = 97-100 degrees; 98 = DK and 99 = NA are missing)
  mutate(ft_outparty = case_when(pid3 == "Democrat" ~ raw_ft_rep,
                                 pid3 == "Republican" ~ raw_ft_dem)) %>%
  mutate(ft_outparty = case_when(ft_outparty > 97 ~ NA,
                                 TRUE ~ ft_outparty)) %>%
  # drop missing values and independents (independents have no out-party)
  select(pid7, pid_strength, ft_outparty) %>%
  na.omit() %>%
  glimpse()

# write clean data
dir.create("output/data", recursive = TRUE, showWarnings = FALSE)
write_csv(anes, "output/data/anes-2020.csv")

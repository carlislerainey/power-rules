# clean the Cutler, Pietryka, and Rainey pilot study

# load packages
library(tidyverse)

# load data
pilot <- read_csv("data/cutler-pilot-extract.csv", show_col_types = FALSE) %>%
  na.omit() %>%
  glimpse()

# write clean data
dir.create("output/data", recursive = TRUE, showWarnings = FALSE)
write_csv(pilot, "output/data/cutler-pilot.csv")

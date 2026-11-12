# make the base plot for Figure 1 ("The Geometry of 80% Power")

# load packages
library(tidyverse)

# create folder for figures
dir.create("output/fig", recursive = TRUE, showWarnings = FALSE)

# study parameters
true_effect <- 5
se_fig <- true_effect/2.5

# plot
gg <- ggplot() +
  annotate("segment", x = 1.64*se_fig, xend = 1.64*se_fig,
           y = 0, yend = dnorm(1.64*se_fig, mean = true_effect, sd = se_fig),
           linewidth = 0.5, color = "#d95f02") +
  geom_vline(xintercept = 0, linewidth = 0.5, color = "grey50") +
  geom_function(fun = dnorm, args = list(mean = true_effect, sd = se_fig),
                linewidth = 0.5, n = 1001, color = "grey50") +
  geom_area(data = tibble(x = seq(1.64*se_fig, 3*se_fig + true_effect, by = 0.1)),  # stat = "function" ignores these values, but the layer needs non-empty data
            stat = "function", fun = dnorm, args = list(mean = true_effect, sd = se_fig),
            fill = "#d95f02", alpha = 0.1, xlim = c(1.64*se_fig, 3*se_fig + true_effect)) +
  theme_bw(base_family = "Verdana") +  # the journal's preferred font for figures
  theme(panel.grid = element_blank()) +
  labs(x = "Treatment Effect\n(in original units)",
       y = "Density") +
  scale_x_continuous(breaks = c(0, 1, 3, 5, 7, 9, 11),
                     limits = c(true_effect - 3*se_fig, true_effect + 3*se_fig))

# save figure
#   - cairo_pdf embeds the font (Verdana must be installed; otherwise cairo substitutes another font)
ggsave("output/fig/figure-1-base.pdf", gg, height = 4, width = 6, scale = 1.2, device = cairo_pdf)

# note: I added the annotations manually using keynote

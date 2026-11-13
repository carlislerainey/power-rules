# Power Rules: Practical Advice for Computing Statistical Power

Carlisle Rainey. Accepted at *Political Analysis*.

- `author`: Carlisle Rainey (Florida State University)
- `journal`: Political Analysis
- `status`: accepted, forthcoming (no article DOI yet)
- `text`: the accepted manuscript, word for word (main text, Appendices 1-4, references)
- `format`: Markdown for AI agents; math is LaTeX between dollar signs
- `html_version`: https://www.carlislerainey.com/papers/power-rules/
- `preprint`: https://osf.io/preprints/osf/5am9q
- `replication_archive`: https://doi.org/10.7910/DVN/EMLFBT
- `web_app`: https://www.carlislerainey.com/power-rules/app/
- `r_package`: https://www.carlislerainey.com/powerrules/

> This file is the paper in plain Markdown, for AI agents and other programs that read text. It has two parts. The **guide** comes first. It was written for this file and is not part of the paper: it says when the rules apply, gives the rules as formulas, lists the inputs they need, and gives numbers to check a calculation against. The **paper** runs from the heading "Abstract" to the end of the file, word for word: the main text, Appendices 1-4, and the references. Where the guide and the paper differ, the paper is right. Quote and cite the paper, not the guide.

## Guide for AI agents

### How this file is laid out

- Each section of the paper is a level-2 heading with the paper's own title, such as "Rule 3: From the SD to the SE" or "Appendix 2. Extensions for Different Designs". Each paragraph is one line.
- Each rule is a block quote that begins `**Rule N (Name):**`. All seven are together under "Appendix 4. The Rules".
- A footnote is printed right below the paragraph that cites it, as `[^12]` in the main text and `[^A3]` in the appendices.
- Each table is a pipe table with its caption above it. Figure 1 is its caption and a description of the image in words.
- Citations are author and year in plain text. The full references are under "References", at the end.
- There are no page numbers. To point to a passage, name its section. The PDFs have the page numbers.
- The R code and the simulation checks are not here. They are in the HTML version (`html_version` above).

### Sections and their lines

<!-- index -->

### What the rules cover

The rules apply directly to a comparison with all of these features:

- two conditions (treatment and control); in an experiment with more conditions, each comparison of two gets its own power calculation
- between-subjects, with respondents assigned independently (not in clusters)
- balanced: the same number of respondents in each condition
- estimated by least squares regression with robust (HC2) standard errors
- a directional hypothesis, tested with a size-0.05, one-sided test: reject when the whole 90% confidence interval is on the hypothesized side of zero
- an outcome that is a single item or a multi-item index (the index is then the outcome)

With a change described in the appendices, they also cover a two-sided test (a 95% confidence interval), power levels other than 80% and 95%, unbalanced assignment, clustered assignment, blocked random assignment, and an interaction in a 2x2 factorial design.

For anything else, the paper says: "For designs with other complications, the rules might still provide a ballpark starting point, but a careful power analysis requires simulation or specialized software."

### Symbols

| Symbol | Meaning |
|---|---|
| $\tau$ | the actual average treatment effect |
| $\widetilde{\tau}$ | the treatment effect assumed to compute power; a tilde always marks a value assumed for the power calculation, an "informed guess" |
| $\widehat{\tau}$ | the estimated treatment effect |
| $SE$ | the standard error of the estimated treatment effect |
| $\widetilde{SD(Y)}$ | the assumed standard deviation of the outcome within a condition, taken from a reference population |
| $\widetilde{R^{2}}$ | the assumed $R^2$ of a regression of the outcome on the pre-treatment control variables, taken from a reference population |
| $n$ | the number of respondents **per condition** (not the total) |
| $N$ | the total number of respondents in the comparison; $N = 2n$ for treatment and control |
| $\delta$ | an interaction: the difference between two treatment effects |

### The rules as formulas

These are for the default one-sided test, in R's notation: `pnorm()` is the standard normal CDF and `qnorm()` is its inverse. The paper's statement of each rule is under "Appendix 4. The Rules".

| Rule | Name | Formula |
|---|---|---|
| 1 | Power; Most Intuitively | `power = 1 - pnorm(1.64 * se, mean = tau, sd = se)` |
| 2 | Power; From a z Table | `power = 1 - pnorm(1.64 - tau / se)` |
| 3 | SD to SE | `se = 2 * sd_y / sqrt(2 * n)` |
| 4 | Adjustment | `se_adj = se * sqrt(1 - r2)` |
| 5 | Bloom's Rule; SE to MDE | `mde_80 = 2.5 * se` and `mde_95 = 3.3 * se` |
| 6 | SD to Sample Size | `n_80 = 2 * (2.5 * sd_y / tau)^2` per condition, rounded up; with control variables, use `sd_y * sqrt(1 - r2)` for `sd_y`; for 95% power, use 3.3 for 2.5 |
| 7 | 80% to 95% Power | `n_95 = 1.75 * n_80` |

The factors change with the test and the power (Table 1 of the paper):

| Test | Threshold in Rules 1 and 2 | Factor for 80% power | Factor for 95% power | Rule 7: more sample for 95% than 80% power |
|---|---|---|---|---|
| one-sided, size 0.05 (90% confidence interval); the paper's default | 1.64 | 2.5 | 3.3 | about 75% |
| two-sided, size 0.05 (95% confidence interval) | 1.96 | 2.8 | 3.6 | about 66% |

For another power level, take the factor from Table 3 (one-sided) or Table 4 (two-sided) in Appendix 1, or compute `qnorm(0.95) + qnorm(power)` (one-sided) or `qnorm(0.975) + qnorm(power)` (two-sided).

### Which rules answer which question

This is Table 2 of the paper ("How to Use the Rules") in brief. Rule 4 is used only with control variables.

| Known | Wanted | Rules, in order |
|---|---|---|
| sample size and power | minimum detectable effect (MDE) | 3, then 4, then 5 |
| sample size and effect of interest | power | 3, then 4, then 2 |
| power and effect of interest | sample size | 6 |

### Changes for other designs

From Appendix 2, where each is explained.

| Design | Change |
|---|---|
| unbalanced: a fraction `p` of the `N` respondents is assigned to treatment | Compute Rule 3 with `n = N / 2`, multiply the SE by `1 / sqrt(4 * p * (1 - p))`, and go on to Rule 2, 4, or 5 as usual. In Rule 6, multiply `sd_y` by the same factor; the rule then returns `N / 2`. |
| clustered: whole clusters are assigned, with `m` sampled respondents per cluster and intraclass correlation `icc` | Multiply the SE from Rule 3 by `sqrt(1 + (m - 1) * icc)` and go on to Rule 2, 4, or 5 as usual. Cluster the standard errors at the level of assignment. |
| blocked random assignment | Use Rule 4 with `r2` as the $R^2$ of a regression of the outcome on indicators for the blocks, provided the analysis includes those indicators. |
| interaction in a 2x2 factorial design, with `n` respondents in each of the four conditions | Rule 3 becomes `se = 2 * sd_y / sqrt(n)`. Rule 6 becomes `n_80 = 4 * (2.5 * sd_y / delta)^2`, again per condition, so the total is `4 * n_80`. |

### Where the inputs come from

- **The effect, `tau`.** The paper treats this as the researcher's judgment (section "What Treatment Effect Should I Assume?"). By default it is the smallest substantively meaningful effect; when the smallest plausible effect is much larger, it can be that instead. The paper says not to estimate it from pilot data, and calls a benchmark such as 0.15 standard deviations "only a first approximation". If the researcher has not chosen an effect, ask for one, or report the minimum detectable effect, which needs none.
- **The standard deviation, `sd_y`.** The standard deviation of the outcome, or of a similar outcome, in a reference population that resembles the population under study: a survey such as the ANES or the CES, or an earlier experiment with the same outcome. The paper's fallback "in a pinch" is the range of the scale divided by `sqrt(12)`, "only as a first approximation, if used at all" (a footnote in "Example: Evaluating Power for a Fixed Sample Size").
- **The explained variance, `r2`.** The $R^2$ of a regression of the outcome on the planned control variables in a reference population. For a pre-treatment measure of the outcome, the paper cites a range of about 37% to 81% across five studies.
- **The sample size, `n`.** Per condition. A study of 1,000 respondents in two conditions has `n = 500`.

### Numbers to check a calculation against

All of these are in the paper, in the sections named.

| Section | Inputs | Result in the paper |
|---|---|---|
| Rule 5 (Figure 1) | `tau = 5`, `se = 2` | power of about 80% |
| Example: Evaluating Power for a Fixed Sample Size | `sd_y = 20.8`, `n = 500` | SE of 1.32; MDE of 3.30 at 80% power and 4.36 at 95% power (two-sided: 3.70 and 4.75) |
| the same, with control variables | adding `r2 = 0.05` | SE of 1.28; MDE of 3.20 and 4.22 |
| the same, with a pre-treatment measure of the outcome | `r2 = 0.40` in place of 0.05 | SE of 1.02; MDE of 2.55 and 3.37 |
| Example: Finding the Sample Size | `sd_y = 20.8`, `tau = 3`, 95% power | 1,047 per condition; 995 with `r2 = 0.05`; 1,247 for a two-sided test without control variables |
| Appendix 2, "Example: Interactions" | `sd_y = 2.0`, `delta = 0.67` | 223 per condition (892 in total) for 80% power; 389 (1,556 in total) for 95% power; 112 per condition (224 in total) for a treatment effect of 0.67 in a two-arm study at 80% power |
| Appendix 2, "What If My Design Is Unbalanced?" | `p` for splits of 60/40, 70/30, 80/20, and 90/10 | SE larger by about 2%, 9%, 25%, and 67% |
| Appendix 2, "What If Respondents Are Assigned in Clusters?" | `m = 20`, `icc = 0.05` | SE larger by a factor of about 1.4 |

The paper's numbers are worked by hand: with the rounded factors (2.5, 3.3, 2.8, and 3.6), with the standard error rounded to two decimals before it is multiplied, and with each sample size rounded up. A calculation that does not round along the way differs a little. The exact factor for 80% power is 2.49, for example, which gives an MDE of 3.27 where the paper has 3.30. The R package and the web app use the exact factors. The paper puts the error from rounding the factors at less than 1% in the MDE and less than 2% in the sample size (section "Rule 5: From the SE to the MDE").

### How to state a result

The paper: "Statements about statistical power always have the form: 'the experiment has _____% power *to detect a treatment effect of _____*.'" State the inputs with the result, so that each assumption is explicit: the test (one-sided or two-sided), the sample size per condition, the standard deviation and the $R^2$ with the reference population each comes from, and the assumed effect with the reason for it.

### Related

- The R package `powerrules` computes the rules, for example `from_sd(sd_y = 20.8) |> find_mde(n = 500)`, and the web app does the same in a browser (`r_package` and `web_app` above).
- The replication archive has the data and code behind the paper's numbers (`replication_archive` above).
- A companion working paper, "Automating Power Analysis with Pilot Data", covers predicting the standard error from an existing study or from pilot data.
- To cite the paper: Rainey, Carlisle. Forthcoming. "Power Rules: Practical Advice for Computing Statistical Power." *Political Analysis*.

---

The paper's text begins here and runs to the end of the file.

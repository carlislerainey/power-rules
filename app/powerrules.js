// powerrules.js: the formulas and the number formatting of the Power Rules app.
//
// A port of the computation in the R package powerrules (R/from.R, R/find.R,
// R/mde_factor.R, R/format.R, R/sentence.R, R/pipeline.R). R is the reference:
// check/ compares every number and string this file produces with the
// installed package. Nothing here touches the page; app.js does that.
//
// Loaded by index.html (as the global PowerRules) and by Node (check/).

(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.PowerRules = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // --- The normal distribution ----------------------------------------------

  // pnorm(x): the standard normal CDF. Cody's (1969) rational Chebyshev
  // approximations, as in R's nmath/pnorm.c (lower tail, not log).
  var PA = [2.2352520354606839287, 161.02823106855587881,
            1067.6894854603709582, 18154.981253343561249,
            0.065682337918207449113];
  var PB = [47.20258190468824187, 976.09855173777669322,
            10260.932208618978205, 45507.789335026729956];
  var PC = [0.39894151208813466764, 8.8831497943883759412,
            93.506656132177855979, 597.27027639480026226,
            2494.5375852903726711, 6848.1904505362823326,
            11602.651437647349984, 9842.7148383839780218,
            1.0765576773720192317e-8];
  var PD = [22.266688044328115691, 235.38790178262499861,
            1519.377599407554805, 6485.558298266760755,
            18615.571640885098091, 34900.952721145977266,
            38912.003286093271411, 19685.429676859990727];
  var PP = [0.21589853405795699, 0.1274011611602473639,
            0.022235277870649807, 0.001421619193227893466,
            2.9112874951168792e-5, 0.02307344176494017303];
  var PQ = [1.28426009614491121, 0.468238212480865118,
            0.0659881378689285515, 0.00378239633202758244,
            7.29751555083966205e-5];
  var M_SQRT_32 = 5.656854249492380195206754896838;
  var M_1_SQRT_2PI = 0.398942280401432677939946059934;

  function pnorm(x) {
    if (isNaN(x)) return NaN;
    var y = Math.abs(x), xnum, xden, xsq, temp, del, cum, i;

    if (y <= 0.67448975) {
      if (y > 1.1102230246251565e-16) {
        xsq = x * x;
        xnum = PA[4] * xsq;
        xden = xsq;
        for (i = 0; i < 3; i++) {
          xnum = (xnum + PA[i]) * xsq;
          xden = (xden + PB[i]) * xsq;
        }
      } else {
        xnum = xden = 0;
      }
      temp = x * (xnum + PA[3]) / (xden + PB[3]);
      return 0.5 + temp;
    }

    if (y <= M_SQRT_32) {
      xnum = PC[8] * y;
      xden = y;
      for (i = 0; i < 7; i++) {
        xnum = (xnum + PC[i]) * y;
        xden = (xden + PD[i]) * y;
      }
      temp = (xnum + PC[7]) / (xden + PD[7]);
      xsq = Math.trunc(y * 16) / 16;
      del = (y - xsq) * (y + xsq);
      cum = Math.exp(-xsq * xsq * 0.5) * Math.exp(-del * 0.5) * temp;
      return x > 0 ? 1 - cum : cum;
    }

    if (x > -37.5193 && x < 8.2924) {
      xsq = 1 / (x * x);
      xnum = PP[5] * xsq;
      xden = xsq;
      for (i = 0; i < 4; i++) {
        xnum = (xnum + PP[i]) * xsq;
        xden = (xden + PQ[i]) * xsq;
      }
      temp = xsq * (xnum + PP[4]) / (xden + PQ[4]);
      temp = (M_1_SQRT_2PI - temp) / y;
      xsq = Math.trunc(x * 16) / 16;
      del = (x - xsq) * (x + xsq);
      cum = Math.exp(-xsq * xsq * 0.5) * Math.exp(-del * 0.5) * temp;
      return x > 0 ? 1 - cum : cum;
    }

    return x > 0 ? 1 : 0;
  }

  // qnorm(p): the standard normal quantile function. Wichura's (1988)
  // algorithm AS 241 (PPND16), as in R's nmath/qnorm.c.
  function qnorm(p) {
    if (isNaN(p) || p < 0 || p > 1) return NaN;
    if (p === 0) return -Infinity;
    if (p === 1) return Infinity;

    var q = p - 0.5, r, val;

    if (Math.abs(q) <= 0.425) {
      r = 0.180625 - q * q;
      return q * (((((((r * 2509.0809287301226727 +
                        33430.575583588128105) * r + 67265.770927008700853) * r +
                      45921.953931549871457) * r + 13731.693765509461125) * r +
                    1971.5909503065514427) * r + 133.14166789178437745) * r +
                  3.387132872796366608) /
        (((((((r * 5226.495278852545925 +
               28729.085735721942674) * r + 39307.89580009271061) * r +
             21213.794301586595867) * r + 5394.1960214247511077) * r +
           687.1870074920579083) * r + 42.313330701600911252) * r + 1);
    }

    var lp = Math.log(q < 0 ? p : 0.5 - p + 0.5);
    r = Math.sqrt(-lp);

    if (r <= 5) {
      r -= 1.6;
      val = (((((((r * 7.7454501427834140764e-4 +
                   0.0227238449892691845833) * r + 0.24178072517745061177) * r +
                 1.27045825245236838258) * r + 3.64784832476320460504) * r +
               5.7694972214606914055) * r + 4.6303378461565452959) * r +
             1.42343711074968357734) /
        (((((((r * 1.05075007164441684324e-9 +
               5.475938084995344946e-4) * r + 0.0151986665636164571966) * r +
             0.14810397642748007459) * r + 0.68976733498510000455) * r +
           1.6763848301838038494) * r + 2.05319162663775882187) * r + 1);
    } else if (r <= 27) {
      r -= 5;
      val = (((((((r * 2.01033439929228813265e-7 +
                   2.71155556874348757815e-5) * r + 0.0012426609473880784386) * r +
                 0.026532189526576123093) * r + 0.29656057182850489123) * r +
               1.7848265399172913358) * r + 5.4637849111641143699) * r +
             6.6579046435011037772) /
        (((((((r * 2.04426310338993978564e-15 +
               1.4215117583164458887e-7) * r + 1.8463183175100546818e-5) * r +
             7.868691311456132591e-4) * r + 0.0148753612908506148525) * r +
           0.13692988092273580531) * r + 0.59983220655588793769) * r + 1);
    } else {
      // min(p, 1 - p) below exp(-729): R's asymptotic expansion (27 < r < 55)
      var s2 = -2 * lp, twoPi = 6.283185307179586476925286766559;
      var x2 = s2 - Math.log(twoPi * s2);
      x2 = s2 - Math.log(twoPi * x2) - 2 / (2 + x2);
      x2 = s2 - Math.log(twoPi * x2) + 2 * Math.log1p(-(1 - 1 / (4 + x2)) / (2 + x2));
      x2 = s2 - Math.log(twoPi * x2) +
        2 * Math.log1p(-(1 - (1 - 5 / (6 + x2)) / (4 + x2)) / (2 + x2));
      x2 = s2 - Math.log(twoPi * x2) +
        2 * Math.log1p(-(1 - (1 - (5 - 9 / (8 + x2)) / (6 + x2)) / (4 + x2)) / (2 + x2));
      val = Math.sqrt(x2);
    }

    return q < 0 ? -val : val;
  }

  // --- Number formatting (R/format.R) ---------------------------------------

  function nonFinite(x) {
    return isNaN(x) ? "NaN" : x > 0 ? "Inf" : "-Inf";
  }

  // C's "%.<digits>f", which is what R's formatC(x, format = "f") prints.
  // toFixed() rounds the exact value of x the same way except at an exact
  // tie (0.125 to two places), where C rounds to even and toFixed() rounds up.
  function fixed(x, digits) {
    if (!isFinite(x)) return nonFinite(x);
    var a = Math.abs(x), s;
    if (a >= 1e21) {
      s = BigInt(a).toString();
      if (digits > 0) s += "." + "0".repeat(digits);
    } else {
      s = a.toFixed(digits);
      var scaled = a * Math.pow(2, digits + 1);
      var tie = Number.isInteger(scaled) && scaled % 2 === 1;
      if (tie) {
        var last = s.charCodeAt(s.length - 1) - 48;
        if (last % 2 === 1) s = s.slice(0, -1) + (last - 1);
      }
    }
    return (x < 0 || Object.is(x, -0) ? "-" : "") + s;
  }

  // R's round(x): to the nearest whole number, ties to even
  function round(x) {
    var f = Math.floor(x), d = x - f;
    if (d < 0.5) return f;
    if (d > 0.5) return f + 1;
    return f % 2 === 0 ? f : f + 1;
  }

  // R's format(x, digits = digits, scientific = FALSE, drop0trailing = TRUE):
  // as many decimals as x needs at `digits` significant digits, never
  // scientific notation
  function format(x, digits) {
    if (!isFinite(x)) return nonFinite(x);
    if (x === 0) return "0";
    var parts = Math.abs(x).toExponential(digits - 1).split("e");
    var nsig = parts[0].replace(".", "").replace(/0+$/, "").length;
    var decimals = Math.max(0, nsig - Number(parts[1]) - 1);
    var s = fixed(x, decimals);
    if (s.indexOf(".") !== -1) s = s.replace(/0+$/, "").replace(/\.$/, "");
    return s;
  }

  // big.mark = ","
  function commas(s) {
    var m = /^(-?)(\d+)(.*)$/.exec(s);
    if (!m) return s;
    return m[1] + m[2].replace(/\B(?=(\d{3})+(?!\d))/g, ",") + m[3];
  }

  // Computed values: fixed 2 decimal places
  function fmt(x, digits) {
    return fixed(x, digits === undefined ? 2 : digits);
  }

  // Input values: natural display (no trailing zeros, up to 10 significant
  // digits, never scientific notation)
  function fmt_val(x) {
    if (Math.abs(x - round(x)) < 1e-10) return fixed(round(x), 0);
    return format(x, 10);
  }

  // Integer with comma separator (never scientific notation)
  function fmt_int(x) {
    return commas(format(Math.ceil(x), 7));
  }

  // R's format(x, big.mark = ",", scientific = FALSE), with the default seven
  // significant digits (the total beside the sample size input)
  function fmt_total(x) {
    return commas(format(x, 7));
  }

  // Input proportion to percentage string, without rounding away digits the
  // user supplied (0.80 -> "80%", 0.975 -> "97.5%", 0.999 -> "99.9%")
  function fmt_pct(x) {
    return fmt_val(x * 100) + "%";
  }

  // Probability as a qnorm() argument: two decimals when that is exact
  // (0.80, 0.95), otherwise every digit the user supplied (0.975, 0.999)
  function fmt_prob(x) {
    return Math.abs(x * 100 - round(x * 100)) < 1e-8 ? fmt(x) : fmt_val(x);
  }

  // Computed power to percentage string: whole percent, but never "100%"
  function fmt_power(x) {
    return x > 0.995 ? ">99%" : round(x * 100) + "%";
  }

  // Is this power level one of the two the paper gives a rounded factor for?
  function is_power_level(power, level) {
    return Math.abs(power - level) < 1e-8;
  }

  // Where the paper tabulates the MDE factor: Table 1 for the headline 80% and
  // 95% power levels; Appendix Tables 3 (90% CI) and 4 (95% CI) otherwise
  function mde_factor_table(power, ci) {
    if (is_power_level(power, 0.80) || is_power_level(power, 0.95)) return "[Table 1]";
    return ci === 0.90 ? "[Table 3]" : "[Table 4]";
  }

  // --- The MDE factor (R/mde_factor.R) --------------------------------------

  function mde_factor(power, ci) {
    if (ci === undefined) ci = 0.90;
    return qnorm(1 - (1 - ci) / 2) + qnorm(power);
  }

  // --- Sources (R/from.R) ---------------------------------------------------

  function isNumber(x) {
    return typeof x === "number" && !isNaN(x);
  }

  function from_sd(sd_y, r_squared, interaction) {
    if (r_squared === undefined) r_squared = 0;
    if (interaction === undefined) interaction = false;
    if (!isNumber(sd_y) || sd_y <= 0)
      throw new Error("`sd_y` must be a positive number");
    if (!isNumber(r_squared) || r_squared < 0 || r_squared >= 1)
      throw new Error("`r_squared` must be between 0 (inclusive) and 1 (exclusive)");
    if (typeof interaction !== "boolean")
      throw new Error("`interaction` must be TRUE or FALSE");
    return { type: "sd", sd_y: sd_y, r_squared: r_squared, interaction: interaction };
  }

  function from_existing(se_existing, n_existing, interaction) {
    if (interaction === undefined) interaction = false;
    if (!isNumber(se_existing) || se_existing <= 0)
      throw new Error("`se_existing` must be a positive number");
    if (!isNumber(n_existing) || n_existing <= 0)
      throw new Error("`n_existing` must be a positive number");
    if (typeof interaction !== "boolean")
      throw new Error("`interaction` must be TRUE or FALSE");
    return { type: "existing", se_existing: se_existing, n_existing: n_existing,
             interaction: interaction };
  }

  function from_pilot(se_pilot, n_pilot, interaction) {
    if (interaction === undefined) interaction = false;
    if (!isNumber(se_pilot) || se_pilot <= 0)
      throw new Error("`se_pilot` must be a positive number");
    if (!isNumber(n_pilot) || n_pilot <= 0)
      throw new Error("`n_pilot` must be a positive number");
    if (typeof interaction !== "boolean")
      throw new Error("`interaction` must be TRUE or FALSE");
    return { type: "pilot", se_pilot: se_pilot, n_pilot: n_pilot,
             interaction: interaction };
  }

  // --- Goals (R/find.R) -----------------------------------------------------

  function check_source(source) {
    if (!source || ["sd", "existing", "pilot"].indexOf(source.type) === -1)
      throw new Error("`source` must be a power_source object " +
                      "(use from_sd(), from_existing(), or from_pilot())");
  }

  // Validate the planned sample size per condition
  function check_n_planned(n_planned) {
    if (!isNumber(n_planned) || n_planned <= 0)
      throw new Error("`n_planned` must be a positive number");
    if (Math.abs(n_planned - round(n_planned)) > 1e-8)
      throw new Error("`n_planned` must be a whole number of respondents per condition");
  }

  // Validate the confidence interval level
  function check_ci(ci) {
    if (ci !== 0.90 && ci !== 0.95) throw new Error("`ci` must be 0.90 or 0.95");
  }

  function check_tau(tau) {
    if (!isNumber(tau)) throw new Error("`tau` must be a number");
    if (tau <= 0)
      throw new Error("`tau` must be positive (use a positive value; " +
                      "the sign indicates the direction of the hypothesis)");
  }

  // Conservative adjustment factor for pilot data (Pilot Rule 3)
  function get_conservative_factor(source) {
    if (source.type !== "pilot") return null;
    var cf_denom = source.interaction ? 2 * source.n_pilot : source.n_pilot;
    return Math.sqrt(1 / cf_denom) + 1;
  }

  // Predicted SE from a source and the planned n per condition
  function compute_se(source, n_planned) {
    if (source.type === "sd") {
      var denom = source.interaction ? Math.sqrt(n_planned) : Math.sqrt(2 * n_planned);
      return 2 * source.sd_y * Math.sqrt(1 - source.r_squared) / denom;
    }
    if (source.type === "existing") {
      return Math.sqrt(source.n_existing / n_planned) * source.se_existing;
    }
    var cf = get_conservative_factor(source);
    return Math.sqrt(source.n_pilot / n_planned) * cf * source.se_pilot;
  }

  // The minimum detectable effect at 80% and 95% power (Rule 5)
  function find_mde(source, n_planned, ci) {
    if (ci === undefined) ci = 0.90;
    check_source(source);
    check_n_planned(n_planned);
    check_ci(ci);

    var se = compute_se(source, n_planned);
    var mf80 = mde_factor(0.80, ci);
    var mf95 = mde_factor(0.95, ci);

    return {
      goal: "mde",
      source: source,
      ci: ci,
      n_planned: n_planned,
      se: se,
      mde_80: mf80 * se,
      mde_95: mf95 * se,
      mde_factor_80: mf80,
      mde_factor_95: mf95,
      conservative_factor: get_conservative_factor(source)
    };
  }

  // The power for a given effect (Rule 2)
  function find_power(source, n_planned, tau, ci) {
    if (ci === undefined) ci = 0.90;
    check_source(source);
    check_n_planned(n_planned);
    check_tau(tau);
    check_ci(ci);

    var se = compute_se(source, n_planned);
    var cv = qnorm(1 - (1 - ci) / 2);
    var ratio = tau / se;

    return {
      goal: "power",
      source: source,
      ci: ci,
      n_planned: n_planned,
      tau: tau,
      se: se,
      ratio: ratio,
      critical_value: cv,
      power: 1 - pnorm(cv - ratio),
      conservative_factor: get_conservative_factor(source)
    };
  }

  // The required sample size per condition (Rule 6; Pilot Rules 2 and 4)
  function find_n(source, tau, power, ci) {
    if (power === undefined) power = 0.80;
    if (ci === undefined) ci = 0.90;
    check_source(source);
    check_tau(tau);
    if (!isNumber(power) || power <= 0 || power >= 1)
      throw new Error("`power` must be between 0 and 1 (exclusive)");
    check_ci(ci);
    var test_size = (1 - ci) / 2;
    if (power <= test_size + 1e-8)
      throw new Error("`power` must be greater than the size of the test (" +
                      fmt_val(test_size) + ")");

    var mf = mde_factor(power, ci);
    var cf = get_conservative_factor(source);
    var x, n_raw;

    if (source.type === "sd") {
      var k = source.interaction ? 4 : 2;
      x = mf * source.sd_y * Math.sqrt(1 - source.r_squared) / tau;
      n_raw = k * (x * x);
    } else if (source.type === "existing") {
      x = mf * source.se_existing / tau;
      n_raw = source.n_existing * (x * x);
    } else {
      x = mf * cf * source.se_pilot / tau;
      n_raw = source.n_pilot * (x * x);
    }

    var n_planned = Math.ceil(n_raw);

    return {
      goal: "n",
      source: source,
      ci: ci,
      tau: tau,
      power: power,
      n_planned: n_planned,
      n_planned_raw: n_raw,
      se: compute_se(source, n_planned),
      mde_factor_val: mf,
      conservative_factor: cf
    };
  }

  // --- Manuscript sentence (R/sentence.R) -----------------------------------

  function build_sentence(x, effect_label, effect_article, n_cond) {
    return x.goal === "n"
      ? build_sentence_n(x, effect_label, effect_article, n_cond)
      : build_sentence_se(x, effect_label, effect_article, n_cond);
  }

  // Sentence for find_mde / find_power (SE-based goals)
  function build_sentence_se(x, effect_label, effect_article, n_cond) {
    var source = x.source;
    var total_str = fmt_int(n_cond * x.n_planned);
    var n_str = fmt_int(x.n_planned);

    var design_str = source.interaction ? "balanced, 2x2 factorial"
                                        : "balanced, between-subjects";
    var cond_note = n_cond === 4 ? total_str + " total, 4 conditions"
                                 : total_str + " total";

    var opening = "For a " + design_str + " design with " + n_str +
                  " respondents per condition (" + cond_note + ")";

    var src_desc;
    if (source.type === "sd") {
      src_desc = ", assuming a standard deviation of " + fmt_val(source.sd_y);
      if (source.r_squared > 0)
        src_desc += " and control variables that explain " +
                    fmt_val(source.r_squared * 100) +
                    "% of the variance in the outcome";
    } else if (source.type === "existing") {
      src_desc = " replicating an existing study with a standard error of " +
                 fmt_val(source.se_existing) + " (" + fmt_val(source.n_existing) +
                 " per condition)";
    } else {
      src_desc = ", using pilot data with a standard error of " +
                 fmt_val(source.se_pilot) + " (" + fmt_val(source.n_pilot) +
                 " per condition) and a conservative adjustment for pilot noise";
    }

    var se_part = ", the predicted standard error is " + fmt(x.se) + ".";

    var test_size = x.ci === 0.90 ? "0.05" : "0.025";
    var conclusion;
    if (x.goal === "mde") {
      conclusion =
        " Using a one-sided test at the " + test_size + " level, the experiment has " +
        "80% power to detect " + effect_article + " of " + fmt(x.mde_80) +
        " units and 95% power to detect " + effect_article + " of " + fmt(x.mde_95) +
        " units.";
    } else {
      var power_str = x.power > 0.995 ? "more than 99%" : round(x.power * 100) + "%";
      conclusion =
        " Using a one-sided test at the " + test_size + " level, the experiment has " +
        power_str + " power to detect " + effect_article + " of " +
        fmt_val(x.tau) + " units.";
    }

    return opening + src_desc + se_part + conclusion;
  }

  // Sentence for find_n
  function build_sentence_n(x, effect_label, effect_article, n_cond) {
    var source = x.source;
    var total_str = fmt_int(n_cond * x.n_planned);
    var n_str = fmt_int(x.n_planned);
    var power_pct = fmt_val(x.power * 100);
    var test_size = x.ci === 0.90 ? "0.05" : "0.025";

    var design_str = source.interaction ? "balanced, 2x2 factorial"
                                        : "balanced, between-subjects";
    var cond_note = n_cond === 4 ? ", 4 conditions" : "";

    if (source.type === "sd") {
      var src_desc = ", assuming a standard deviation of " + fmt_val(source.sd_y);
      if (source.r_squared > 0)
        src_desc += " and control variables that explain " +
                    fmt_val(source.r_squared * 100) +
                    "% of the variance in the outcome";

      var cond_note_str = n_cond === 4 ? total_str + " total, 4 conditions"
                                       : total_str + " total";
      return "For a " + design_str + " design" + src_desc +
        ", the experiment requires " + n_str +
        " respondents per condition (" + cond_note_str + ") for " +
        power_pct + "% power to detect " +
        effect_article + " of " + fmt_val(x.tau) +
        " units, using a one-sided test at the " + test_size + " level.";
    }

    if (source.type === "existing") {
      return "For a " + design_str + " design replicating an existing study " +
        "with a standard error of " + fmt_val(source.se_existing) +
        " (" + fmt_val(source.n_existing) + " per condition), " +
        "the experiment requires " + n_str +
        " respondents per condition (" + total_str + " total" + cond_note + ") for " +
        power_pct + "% power to detect " + effect_article + " of " +
        fmt_val(x.tau) +
        " units, using a one-sided test at the " + test_size + " level.";
    }

    return "For a " + design_str + " design, using pilot data with a standard " +
      "error of " + fmt_val(source.se_pilot) + " (" +
      fmt_val(source.n_pilot) +
      " per condition) and a conservative adjustment for pilot noise, " +
      "the experiment requires " + n_str +
      " respondents per condition (" + total_str + " total" + cond_note +
      ") for " + power_pct + "% power to detect " + effect_article + " of " +
      fmt_val(x.tau) +
      " units, using a one-sided test at the " + test_size + " level.";
  }

  // --- MDE factor note (R/sentence.R) ---------------------------------------

  // Explains the difference between exact and rounded MDE factors; null for
  // find_power results
  function build_note(x) {
    if (x.goal === "power") return null;

    // Rounded constants depend on CI level (90% CI: 2.5/3.3; 95% CI: 2.8/3.6)
    var r80 = x.ci === 0.95 ? "2.8" : "2.5";
    var r95 = x.ci === 0.95 ? "3.6" : "3.3";

    if (x.goal === "mde") {
      return "Note: The paper rounds the MDE factor to " + r80 + " for 80% power " +
        "and " + r95 + " for 95% power. This software uses exact values (" +
        fmt(x.mde_factor_80) + " and " + fmt(x.mde_factor_95) +
        "), so results differ slightly from hand calculations using the " +
        "rounded factors.";
    }

    var power_pct = fmt_val(x.power * 100);
    var rounded = is_power_level(x.power, 0.80) ? r80
                : is_power_level(x.power, 0.95) ? r95
                : null;

    if (rounded !== null) {
      return "Note: The paper rounds the MDE factor to " + rounded +
        " for " + power_pct + "% power. This software uses the exact value (" +
        fmt(x.mde_factor_val) +
        "), so results differ slightly from hand calculations using the " +
        "rounded factor.";
    }

    return "Note: The paper rounds the MDE factor to " + r80 + " for 80% power " +
      "and " + r95 + " for 95% power. This software uses the exact MDE factor (" +
      fmt(x.mde_factor_val) +
      "), so results may differ slightly from hand calculations using " +
      "the rounded factors.";
  }

  // --- Pipeline code (R/pipeline.R) -----------------------------------------

  function present(x) {
    return x !== null && x !== undefined;
  }

  function build_pipeline_code(source_type, goal_type, inputs) {
    var interaction = inputs.interaction === true;
    var ci = present(inputs.ci) ? inputs.ci : 0.90;
    var power_val = present(inputs.power) ? inputs.power : 0.80;
    var args, source_call, goal_call;

    if (source_type === "sd") {
      args = "sd_y = " + fmt_val(inputs.sd_y);
      var r2 = present(inputs.r_squared) ? inputs.r_squared : 0;
      if (r2 > 0) args += ", r_squared = " + fmt_val(r2);
      if (interaction) args += ", interaction = TRUE";
      source_call = "from_sd(" + args + ")";
    } else if (source_type === "existing") {
      args = "se_existing = " + fmt_val(inputs.se_existing) +
             ", n_existing = " + fmt_val(inputs.n_existing);
      if (interaction) args += ", interaction = TRUE";
      source_call = "from_existing(" + args + ")";
    } else {
      args = "se_pilot = " + fmt_val(inputs.se_pilot) +
             ", n_pilot = " + fmt_val(inputs.n_pilot);
      if (interaction) args += ", interaction = TRUE";
      source_call = "from_pilot(" + args + ")";
    }

    var n_arg = source_type === "sd" ? "n" : "n_planned";

    if (goal_type === "mde") {
      args = n_arg + " = " + fmt_val(inputs.n_planned);
      if (ci !== 0.90) args += ", ci = " + fmt_val(ci);
      goal_call = "find_mde(" + args + ")";
    } else if (goal_type === "power") {
      args = n_arg + " = " + fmt_val(inputs.n_planned) +
             ", tau = " + fmt_val(inputs.tau);
      if (ci !== 0.90) args += ", ci = " + fmt_val(ci);
      goal_call = "find_power(" + args + ")";
    } else {
      args = "tau = " + fmt_val(inputs.tau);
      if (power_val !== 0.80) args += ", power = " + fmt_val(power_val);
      if (ci !== 0.90) args += ", ci = " + fmt_val(ci);
      goal_call = "find_n(" + args + ")";
    }

    return source_call + " |> " + goal_call;
  }

  return {
    pnorm: pnorm,
    qnorm: qnorm,
    round: round,
    fmt: fmt,
    fmt_val: fmt_val,
    fmt_int: fmt_int,
    fmt_total: fmt_total,
    fmt_pct: fmt_pct,
    fmt_prob: fmt_prob,
    fmt_power: fmt_power,
    is_power_level: is_power_level,
    mde_factor_table: mde_factor_table,
    mde_factor: mde_factor,
    from_sd: from_sd,
    from_existing: from_existing,
    from_pilot: from_pilot,
    find_mde: find_mde,
    find_power: find_power,
    find_n: find_n,
    build_sentence: build_sentence,
    build_note: build_note,
    build_pipeline_code: build_pipeline_code
  };
});

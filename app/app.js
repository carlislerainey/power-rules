// app.js: the interface of the Power Rules app.
//
// A port of the Shiny guide in the R package powerrules: the formula lines of
// inst/shiny/helpers.R, then the server of inst/shiny/app.R, then the wiring
// to the page. The formulas and the number formatting are in powerrules.js.
//
// Under Node (check/) this file only exports its functions; view() takes the
// raw inputs and returns the HTML of every output, so the check can compare
// it with the Shiny server's.

(function (root) {
  "use strict";

  var PR = typeof module === "object" && module.exports
    ? require("./powerrules.js")
    : root.PowerRules;

  var fmt = PR.fmt, fmt_val = PR.fmt_val, fmt_int = PR.fmt_int,
      fmt_prob = PR.fmt_prob, fmt_power = PR.fmt_power;

  function has(x) {
    return x !== null && x !== undefined;
  }

  // htmltools::htmlEscape()
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // --- HTML span wrappers ---------------------------------------------------

  function vi(x) { return '<span class="val-input">' + x + "</span>"; }
  function vr(x) { return '<span class="val-result">' + x + "</span>"; }
  function vb() { return '<span class="val-blank">&nbsp;</span>'; }
  function rr(text) { return '<span class="rule-ref">' + text + "</span>"; }

  // An input value, or a blank until it arrives
  function vin(x) { return has(x) ? vi(fmt_val(x)) : vb(); }

  // A single formula line: formula text left, rule reference right
  function fline(formula_html, rule_text) {
    var rule = rule_text ? rr(rule_text) : "";
    return '<div class="formula-line"><span class="formula-text">' +
           formula_html + "</span>" + rule + "</div>";
  }

  // --- SE line --------------------------------------------------------------

  function render_se_line(source_type, interaction, inputs, use_r2, result) {
    var se_val = has(result) ? vr(fmt(result.se)) : vb();
    var formula, rule;

    if (source_type === "sd") {
      var r2_part = use_r2 ? " × sqrt(1 − " + vin(inputs.r_squared) + ")" : "";
      var denom = interaction ? "sqrt(" + vin(inputs.n_planned) + ")"
                              : "sqrt(2 × " + vin(inputs.n_planned) + ")";

      formula = "Predicted SE = 2 × " + vin(inputs.sd_y) + r2_part + " / " +
                denom + " = " + se_val;

      rule = use_r2 && interaction ? "[Rules 3-4*]"
           : use_r2 ? "[Rules 3-4]"
           : interaction ? "[Rule 3*]"
           : "[Rule 3]";

      return fline(formula, rule);
    }

    if (source_type === "existing") {
      formula = "Predicted SE = sqrt(" + vin(inputs.n_existing) + " / " +
                vin(inputs.n_planned) + ") × " + vin(inputs.se_existing) +
                " = " + se_val;
      return fline(formula, "[Pilot Rule 1]");
    }

    var n_pil = vin(inputs.n_pilot);
    var cf_inner = interaction ? "1/(2×" + n_pil + ")" : "1/" + n_pil;

    formula = "Predicted SE = sqrt(" + n_pil + " / " + vin(inputs.n_planned) +
              ") × (sqrt(" + cf_inner + ") + 1) × " +
              vin(inputs.se_pilot) + " = " + se_val;
    rule = interaction ? "[Pilot Rule 3*]" : "[Pilot Rule 3]";
    return fline(formula, rule);
  }

  // --- MDE lines (find_mde) -------------------------------------------------

  function render_mde_lines(ci, result) {
    var mf80 = fmt(PR.mde_factor(0.80, ci));
    var mf95 = fmt(PR.mde_factor(0.95, ci));
    var has_result = has(result);

    var se_str = has_result ? vr(fmt(result.se)) : vb();
    var mde80 = has_result ? vr(fmt(result.mde_80)) : vb();
    var mde95 = has_result ? vr(fmt(result.mde_95)) : vb();

    var line80 = "MDE (80% power) = " + mf80 + " × " + se_str + " = " + mde80;
    var line95 = "MDE (95% power) = " + mf95 + " × " + se_str + " = " + mde95;

    return fline(line80, "[Rule 5]") + "\n" + fline(line95, "[Rule 5]");
  }

  // --- Power lines (find_power) ---------------------------------------------

  function render_power_lines(ci, inputs, result) {
    var cv = fmt(PR.qnorm(1 - (1 - ci) / 2));
    var has_result = has(result);

    var se_str = has_result ? vr(fmt(result.se)) : vb();
    var ratio_str = has_result ? vr(fmt(result.ratio)) : vb();
    var power_str = has_result ? vr(fmt_power(result.power)) : vb();

    var line1 = "tau / SE = " + vin(inputs.tau) + " / " + se_str + " = " + ratio_str;
    var line2 = "Power = 1 − pnorm(" + cv + " − " + ratio_str +
                ") = " + power_str;

    return fline(line1) + "\n" + fline(line2, "[Rule 2]");
  }

  // --- Conservative factor line (find_n, pilot only) ------------------------

  function render_cf_line(interaction, inputs, result) {
    var n_pil = vin(inputs.n_pilot);
    var cf_val = has(result) ? vr(fmt(result.conservative_factor)) : vb();

    var inner = interaction ? "1 / (2 × " + n_pil + ")" : "1 / " + n_pil;
    var rule = interaction ? "[Pilot Rule 3*]" : "[Pilot Rule 3]";

    return fline("Conservative factor = sqrt(" + inner + ") + 1 = " + cf_val, rule);
  }

  // --- MDE factor line (find_n) ---------------------------------------------

  function render_mf_line(ci, power_level, result) {
    var ci_arg = fmt_prob(1 - (1 - ci) / 2);
    var pow_arg = fmt_prob(power_level);
    var mf_val = has(result) ? vr(fmt(result.mde_factor_val)) : vb();

    return fline("MDE factor = qnorm(" + ci_arg + ") + qnorm(" + pow_arg +
                 ") = " + mf_val, PR.mde_factor_table(power_level, ci));
  }

  // --- Sample size formula lines (find_n) -----------------------------------

  function render_n_lines(source_type, interaction, inputs, use_r2, result) {
    var has_result = has(result);
    var tau_str = vin(inputs.tau);
    var mf_str = has_result ? vr(fmt(result.mde_factor_val)) : vb();
    var formula;

    if (source_type === "sd") {
      var k = interaction ? "4" : "2";
      var r2_part = use_r2 ? " × sqrt(1 − " + vin(inputs.r_squared) + ")" : "";
      formula = "n (planned) = " + k + " × (" + mf_str + " × " +
                vin(inputs.sd_y) + r2_part + " / " + tau_str + ")²";
    } else if (source_type === "existing") {
      formula = "n (planned) = " + vin(inputs.n_existing) + " × [" + mf_str +
                " / " + tau_str + " × " + vin(inputs.se_existing) + "]²";
    } else {
      var cf_str = has_result ? vr(fmt(result.conservative_factor)) : vb();
      formula = "n (planned) = " + vin(inputs.n_pilot) + " × [" + mf_str +
                " / " + tau_str + " × " + cf_str + " × " +
                vin(inputs.se_pilot) + "]²";
    }

    var lines = fline(formula);

    // Result line
    if (has_result) {
      var n_cond = interaction ? 4 : 2;
      var total = n_cond * result.n_planned;
      var cond_note = n_cond === 4 ? ", 4 conditions" : "";

      // Rule 6 is from the tutorial paper; Pilot Rules 2 and 4 are Rules 2 and
      // 4 of the companion paper on pilot data (Pilot Rule 2 is unchanged for
      // interactions, so it carries no star)
      var rule = source_type === "sd" ? (interaction ? "[Rule 6*]" : "[Rule 6]")
               : source_type === "existing" ? "[Pilot Rule 2]"
               : (interaction ? "[Pilot Rule 4*]" : "[Pilot Rule 4]");

      var result_html =
        '<span class="formula-continuation">= ' + vr(fmt_int(result.n_planned)) +
        " per condition (" + vr(fmt_int(total)) + " total" + cond_note + ")</span>";
      lines += "\n" + fline(result_html, rule);
    }

    return lines;
  }

  // --- Main computation renderer --------------------------------------------

  function render_computation(source_type, goal_type, interaction, ci,
                              power_level, inputs, use_r2, result) {
    var lines = [];

    if (goal_type === "mde" || goal_type === "power") {
      lines.push(render_se_line(source_type, interaction, inputs, use_r2, result));
      if (goal_type === "mde") lines.push(render_mde_lines(ci, result));
      else lines.push(render_power_lines(ci, inputs, result));
    } else {
      if (source_type === "pilot")
        lines.push(render_cf_line(interaction, inputs, result));
      lines.push(render_mf_line(ci, power_level, result));
      lines.push(render_n_lines(source_type, interaction, inputs, use_r2, result));
    }

    return lines.join("\n");
  }

  // --- Result highlight -----------------------------------------------------

  function render_result_highlight(result, goal_type, interaction) {
    if (!has(result)) return "";

    var n_cond = interaction ? 4 : 2;

    if (goal_type === "mde") {
      return '<div class="result-highlight">' +
             'MDE (80% power) = <span class="result-value-red">' +
             fmt(result.mde_80) + "</span>" +
             " &nbsp;|&nbsp; " +
             'MDE (95% power) = <span class="result-value-blue">' +
             fmt(result.mde_95) + "</span></div>";
    }

    if (goal_type === "power") {
      return '<div class="result-highlight">' +
             'Power = <span class="result-value-red">' +
             fmt_power(result.power) + "</span></div>";
    }

    var total = n_cond * result.n_planned;
    var cond_note = n_cond === 4 ? ", 4 conditions" : "";
    return '<div class="result-highlight">' +
           '<span class="result-value-red">' + fmt_int(result.n_planned) +
           '</span> per condition (<span class="result-value-red">' +
           fmt_int(total) + "</span> total" + cond_note + ")</div>";
  }

  // --- Manuscript sentence --------------------------------------------------

  function render_sentence(result, interaction) {
    if (!has(result)) return "";

    var effect_label = interaction ? "interaction" : "treatment effect";
    var effect_article = interaction ? "an interaction" : "a treatment effect";
    var n_cond = interaction ? 4 : 2;

    var sentence = PR.build_sentence(result, effect_label, effect_article, n_cond);

    return '<div class="sentence-box">' +
           '<div class="sentence-header">Manuscript sentence (edit as needed)</div>' +
           '<div class="sentence-text" id="sentence-text">' +
           esc(sentence) + "</div>" +
           '<button class="copy-btn" onclick="copyText(\'sentence-text\')">' +
           "Copy</button></div>";
  }

  // --- MDE factor note ------------------------------------------------------

  function render_note(result) {
    if (!has(result)) return "";

    var note = PR.build_note(result);
    if (note === null) return "";

    return '<div class="note-box">' + esc(note) + "</div>";
  }

  // --- Pipeline code --------------------------------------------------------

  function render_pipeline(source_type, goal_type, interaction, ci,
                           power_level, inputs) {
    var pipe_inputs = {};
    for (var key in inputs) pipe_inputs[key] = inputs[key];
    pipe_inputs.interaction = interaction;
    pipe_inputs.ci = ci;
    pipe_inputs.power = power_level;

    var pipeline = PR.build_pipeline_code(source_type, goal_type, pipe_inputs);

    // a script that runs on its own: install, load, compute
    var goal_label = { mde: "MDE", power: "power", n: "sample size" }[goal_type];
    var script =
      "# install package\n" +
      'pak::pak("carlislerainey/powerrules")\n\n' +
      "# load package\n" +
      "library(powerrules)\n\n" +
      "# compute " + goal_label + "\n" +
      pipeline;

    return '<div class="pipeline-box">' +
           '<div class="pipeline-header">Save this to your script</div>' +
           '<code class="pipeline-code" id="pipeline-text">' +
           esc(script) + "</code>" +
           '<button class="copy-btn" onclick="copyText(\'pipeline-text\')">' +
           "Copy</button></div>";
  }

  // --- The board's state (the server of inst/shiny/app.R) --------------------

  var CI = 0.90;

  // A number the user has typed (a blank field is null)
  function num(x) {
    return typeof x === "number" && !isNaN(x);
  }

  // A positive number, or null
  function vp(x) {
    return num(x) && x > 0 ? x : null;
  }

  // The HTML of every output, given the raw inputs:
  //   source_type, goal_type, design_type, power_choice (strings), and
  //   custom_power, sd_y, r_squared, se_existing, n_existing, se_pilot,
  //   n_pilot, n_planned, tau (numbers, or null when blank)
  function view(input) {
    var st = input.source_type, gt = input.goal_type;
    var interaction = input.design_type === "interaction";
    var ci = CI;

    var r2 = input.r_squared;
    var use_r2 = st === "sd" && num(r2) && r2 > 0 && r2 < 1;

    var cp = input.custom_power;
    var power_val;
    if (gt !== "n") power_val = 0.80;
    else if (input.power_choice === "custom")
      power_val = num(cp) && cp > 0 && cp < 1 ? cp : null;
    else power_val = Number(input.power_choice);

    // Input problems the board explains rather than ignoring. An out-of-range
    // value (e.g., R-squared typed as 5 for 5%) must not be silently dropped,
    // so it blocks the result and shows a message instead.
    var problem = null;
    var test_size = (1 - ci) / 2;
    var n = input.n_planned;
    if (st === "sd" && num(r2) && (r2 < 0 || r2 >= 1)) {
      problem = "R² must be a proportion between 0 and 1 " +
                "(for example, 0.05 for 5%).";
    } else if (gt === "n" && input.power_choice === "custom" &&
               num(cp) && (cp <= test_size + 1e-8 || cp >= 1)) {
      problem = "Power must be a proportion between " + fmt_val(test_size) +
                " and 1 (for example, 0.85 for 85%).";
    } else if ((gt === "mde" || gt === "power") &&
               num(n) && n > 0 && Math.abs(n - PR.round(n)) > 1e-8) {
      problem = "The sample size per condition must be a whole number.";
    }

    // Validated inputs
    var inp = {
      sd_y: vp(input.sd_y),
      r_squared: use_r2 ? r2 : null,
      se_existing: vp(input.se_existing),
      n_existing: vp(input.n_existing),
      se_pilot: vp(input.se_pilot),
      n_pilot: vp(input.n_pilot),
      n_planned: vp(input.n_planned),
      tau: vp(input.tau)
    };

    // Are all required inputs present?
    var complete = problem === null;
    if (complete) {
      complete = st === "sd" ? has(inp.sd_y)
               : st === "existing" ? has(inp.se_existing) && has(inp.n_existing)
               : has(inp.se_pilot) && has(inp.n_pilot);
    }
    if (complete) {
      complete = gt === "mde" ? has(inp.n_planned)
               : gt === "power" ? has(inp.n_planned) && has(inp.tau)
               : has(inp.tau) && has(power_val);
    }

    // The result
    var res = null;
    if (complete) {
      try {
        var src = st === "sd"
          ? PR.from_sd(inp.sd_y, has(inp.r_squared) ? inp.r_squared : 0, interaction)
          : st === "existing"
          ? PR.from_existing(inp.se_existing, inp.n_existing, interaction)
          : PR.from_pilot(inp.se_pilot, inp.n_pilot, interaction);
        res = gt === "mde" ? PR.find_mde(src, inp.n_planned, ci)
            : gt === "power" ? PR.find_power(src, inp.n_planned, inp.tau, ci)
            : PR.find_n(src, inp.tau, power_val, ci);
      } catch (e) {
        res = null;
      }
    }

    var pv = has(power_val) ? power_val : 0.80;
    var n_cond = interaction ? 4 : 2;

    return {
      // "n =" for the SD source, "n (planned) =" for existing/pilot
      n_label: st === "sd" ? "n =" : "n (planned) =",
      total_annotation: has(inp.n_planned)
        ? '<span class="total-annotation">(' +
          PR.fmt_total(n_cond * inp.n_planned) + " total)</span>"
        : "",
      problem_box: problem === null ? ""
        : '<div class="problem-box">' + esc(problem) + "</div>",
      computation: render_computation(st, gt, interaction, ci, pv, inp, use_r2, res),
      result_highlight: res === null ? "" : render_result_highlight(res, gt, interaction),
      sentence_box: res === null ? "" : render_sentence(res, interaction),
      note_box: res === null ? "" : render_note(res),
      pipeline_box: res === null ? "" : render_pipeline(st, gt, interaction, ci, pv, inp)
    };
  }

  // Which blocks of inputs show (the Shiny app's conditional panels)
  function panels(input) {
    var st = input.source_type, gt = input.goal_type;
    return {
      "panel-power": gt === "n",
      "panel-custom-power": input.power_choice === "custom",
      "panel-sd": st === "sd",
      "panel-existing": st === "existing",
      "panel-pilot": st === "pilot",
      "panel-n-planned": gt === "mde" || gt === "power",
      "panel-tau": gt === "power" || gt === "n"
    };
  }

  if (typeof module === "object" && module.exports) {
    module.exports = {
      view: view,
      panels: panels,
      render_computation: render_computation,
      render_result_highlight: render_result_highlight,
      render_sentence: render_sentence,
      render_note: render_note,
      render_pipeline: render_pipeline
    };
  }

  if (typeof document === "undefined") return;

  // --- The page -------------------------------------------------------------

  var SELECTS = ["source_type", "goal_type", "design_type"];
  var NUMBERS = ["custom_power", "sd_y", "r_squared", "se_existing", "n_existing",
                 "se_pilot", "n_pilot", "n_planned", "tau"];
  var OUTPUTS = ["n_label", "total_annotation", "problem_box", "computation",
                 "result_highlight", "sentence_box", "note_box", "pipeline_box"];

  // The value of a number field: null when blank or not a number
  function numberValue(id) {
    var s = document.getElementById(id).value;
    if (/^\s*$/.test(s)) return null;
    var x = Number(s);
    return isNaN(x) ? null : x;
  }

  function readInputs() {
    var input = {};
    SELECTS.forEach(function (id) {
      input[id] = document.getElementById(id).value;
    });
    NUMBERS.forEach(function (id) {
      input[id] = numberValue(id);
    });
    var checked = document.querySelector('input[name="power_choice"]:checked');
    input.power_choice = checked ? checked.value : "0.80";
    return input;
  }

  var shown = {};

  function update() {
    var input = readInputs();

    var show = panels(input);
    for (var id in show) document.getElementById(id).hidden = !show[id];

    var html = view(input);
    OUTPUTS.forEach(function (id) {
      if (shown[id] !== html[id]) {
        document.getElementById(id).innerHTML = html[id];
        shown[id] = html[id];
      }
    });
  }

  // The copy buttons (the Shiny app's copyText(), with a fallback for pages
  // the browser gives no clipboard)
  root.copyText = function (elementId) {
    var el = document.getElementById(elementId);
    var text = el.innerText;
    var btn = el.parentElement.querySelector(".copy-btn");

    function copied() {
      var orig = btn.innerText;
      btn.innerText = "Copied!";
      setTimeout(function () { btn.innerText = orig; }, 1500);
    }

    function fallback() {
      var area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      document.body.removeChild(area);
      if (ok) copied();
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(copied, fallback);
    } else {
      fallback();
    }
  };

  function start() {
    var board = document.querySelector(".board");
    board.addEventListener("input", update);
    board.addEventListener("change", update);
    // a page restored from the browser's history keeps what was typed
    window.addEventListener("pageshow", update);
    update();
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", start);
  else start();
})(typeof self !== "undefined" ? self : this);

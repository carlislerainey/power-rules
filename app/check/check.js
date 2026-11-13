// check.js: compares the app with R.
//
//   node check.js <file.json>
//
// <file.json> is what expected.R wrote from the installed R package
// powerrules. This script runs ../powerrules.js and ../app.js over the same
// inputs and reports every difference:
//
//   normal    pnorm() and qnorm(), to TOL_NORMAL (absolute)
//   formats   every formatted string, exactly
//   pipeline  every number of the result to TOL_NUMBER (relative; the sample
//             size exactly), and the sentence, note, and pipeline string exactly
//   board     the HTML of every output of the board, exactly
//   by hand   values from the paper, written out below
//   files     board.css is the package's; base.css precedes it in index.html
//
// Exit status 0 only if nothing differs.

"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PR = require("../powerrules.js");
const App = require("../app.js");

const TOL_NORMAL = 1e-12;
const TOL_NUMBER = 1e-12;

const file = process.argv[2];
if (!file) {
  console.error("usage: node check.js <file.json>");
  process.exit(2);
}
const R = JSON.parse(fs.readFileSync(file, "utf8"));

// a number as expected.R wrote it (null: blank)
const N = (s) => s === null ? null
  : s === "Inf" || s === "inf" ? Infinity
  : s === "-Inf" || s === "-inf" ? -Infinity
  : Number(s);
const count = (n) => n.toLocaleString("en-US");

let failures = 0;
const fail = (part, what) => {
  failures++;
  if (failures <= 25) console.log(`  DIFFERS [${part}] ${what}`);
};

console.log(`check: the app against powerrules ${R.package_version} (${R.r_version})`);

// --- normal -----------------------------------------------------------------

{
  let maxP = 0, maxQ = 0;
  R.normal.x.forEach((xs, i) => {
    const x = N(xs), a = PR.pnorm(x), b = N(R.normal.pnorm[i]);
    const d = Math.abs(a - b);
    if (d > maxP) maxP = d;
    if (!(d <= TOL_NORMAL)) fail("normal", `pnorm(${xs}) = ${a}, R ${b}`);
  });
  R.normal.p.forEach((ps, i) => {
    const p = N(ps), a = PR.qnorm(p), b = N(R.normal.qnorm[i]);
    const d = Math.abs(a - b);
    if (d > maxQ) maxQ = d;
    if (!(d <= TOL_NORMAL)) fail("normal", `qnorm(${ps}) = ${a}, R ${b}`);
  });
  console.log(`  normal    pnorm: ${count(R.normal.x.length)} values, largest difference ${maxP.toExponential(1)}; ` +
              `qnorm: ${count(R.normal.p.length)} values, largest difference ${maxQ.toExponential(1)}`);
}

// --- formats ----------------------------------------------------------------

{
  let n = 0;
  const each = (values, name, f) => values.forEach((s, i) => {
    n++;
    const a = f(N(s)), b = R.formats[name][i];
    if (a !== b) fail("formats", `${name}(${s}) = "${a}", R "${b}"`);
  });
  each(R.formats.v, "fmt", PR.fmt);
  each(R.formats.v, "fmt_val", PR.fmt_val);
  each(R.formats.v, "fmt_int", PR.fmt_int);
  each(R.formats.v, "fmt_total", PR.fmt_total);
  each(R.formats.p, "fmt_pct", PR.fmt_pct);
  each(R.formats.p, "fmt_prob", PR.fmt_prob);
  each(R.formats.p, "fmt_power", PR.fmt_power);
  each(R.formats.p, "mde_factor_table", (p) => PR.mde_factor_table(p, 0.90));
  console.log(`  formats   ${count(n)} strings (fmt, fmt_val, fmt_int, the total, fmt_pct, fmt_prob, fmt_power, the table reference)`);
}

// --- pipeline ---------------------------------------------------------------

{
  let numbers = 0, strings = 0, maxRel = 0;
  const combos = new Set(), designs = new Set(), powers = new Set();

  R.pipeline.forEach((c) => {
    const s = c.source, interaction = c.interaction;
    const n = N(c.n), tau = N(c.tau), power = N(c.power);
    const label = `${s.type} ${JSON.stringify(s)} interaction=${interaction} ${c.goal} n=${c.n} tau=${c.tau} power=${c.power}`;
    combos.add(s.type + " x " + c.goal);
    designs.add(interaction);
    if (power !== null) powers.add(power);

    const src = s.type === "sd" ? PR.from_sd(N(s.sd_y), N(s.r_squared), interaction)
      : s.type === "existing" ? PR.from_existing(N(s.se_existing), N(s.n_existing), interaction)
      : PR.from_pilot(N(s.se_pilot), N(s.n_pilot), interaction);
    const res = c.goal === "mde" ? PR.find_mde(src, n)
      : c.goal === "power" ? PR.find_power(src, n, tau)
      : PR.find_n(src, tau, power);

    for (const key of Object.keys(c.numbers)) {
      numbers++;
      const a = res[key], b = N(c.numbers[key]);
      if (b === null || a === null || a === undefined) {
        if (!(b === null && a === null)) fail("pipeline", `${label}: ${key} = ${a}, R ${b}`);
        continue;
      }
      if (key === "n_planned") {
        if (a !== b) fail("pipeline", `${label}: n_planned = ${a}, R ${b}`);
        continue;
      }
      const rel = a === b ? 0 : Math.abs(a - b) / Math.max(Math.abs(b), 1e-300);
      if (rel > maxRel) maxRel = rel;
      if (!(rel <= TOL_NUMBER)) fail("pipeline", `${label}: ${key} = ${a}, R ${b}`);
    }
    for (const key of Object.keys(res)) {
      if (key !== "goal" && key !== "source" && !(key in c.numbers))
        fail("pipeline", `${label}: ${key} is not in R's result`);
    }

    const effect_label = interaction ? "interaction" : "treatment effect";
    const effect_article = interaction ? "an interaction" : "a treatment effect";
    const n_cond = interaction ? 4 : 2;
    const inputs = Object.assign({}, src, { n_planned: n, tau: tau, interaction: interaction,
                                            ci: 0.90, power: power === null ? 0.80 : power });

    const got = {
      sentence: PR.build_sentence(res, effect_label, effect_article, n_cond),
      note: PR.build_note(res),
      pipeline: PR.build_pipeline_code(s.type, c.goal, inputs)
    };
    for (const key of ["sentence", "note", "pipeline"]) {
      strings++;
      if (got[key] !== c[key]) fail("pipeline", `${label}: ${key}\n      app: ${got[key]}\n      R:   ${c[key]}`);
    }
  });

  console.log(`  pipeline  ${count(R.pipeline.length)} cases (${combos.size} source-by-goal combinations, ${designs.size} designs, ` +
              `power ${[...powers].sort((a, b) => a - b).join(", ")}): ${count(numbers)} numbers, ` +
              `largest relative difference ${maxRel.toExponential(1)}; ${count(strings)} sentences, notes, and pipeline strings`);
}

// --- board ------------------------------------------------------------------

{
  let outputs = 0;
  const seen = { problem_box: 0, result_highlight: 0 };
  const messages = new Set();

  R.board.forEach((state) => {
    const input = {};
    for (const key of Object.keys(state.input)) {
      const value = state.input[key];
      input[key] = /_type$|^power_choice$/.test(key) ? value : N(value);
    }
    const html = App.view(input);
    for (const key of Object.keys(state.html)) {
      outputs++;
      if (html[key] !== state.html[key])
        fail("board", `${JSON.stringify(state.input)}: ${key}\n      app: ${html[key]}\n      R:   ${state.html[key]}`);
    }
    if (state.html.problem_box) {
      seen.problem_box++;
      messages.add(state.html.problem_box.replace(/<[^>]+>/g, ""));
    }
    if (state.html.result_highlight) seen.result_highlight++;
  });

  console.log(`  board     ${count(R.board.length)} states of the Shiny server (${count(seen.result_highlight)} with a result, ` +
              `${count(seen.problem_box)} with one of its ${messages.size} messages): ${count(outputs)} outputs`);
}

// --- by hand ----------------------------------------------------------------

{
  const f = PR;
  const cases = [
    ["from_sd(20.8), n = 500: SE", () => f.fmt(f.find_mde(f.from_sd(20.8), 500).se), "1.32"],
    ["from_sd(20.8), n = 500: MDE (80%)", () => f.fmt(f.find_mde(f.from_sd(20.8), 500).mde_80), "3.27"],
    ["from_sd(20.8), n = 500: MDE (95%)", () => f.fmt(f.find_mde(f.from_sd(20.8), 500).mde_95), "4.33"],
    ["from_sd(20.8), n = 500, tau = 3: power", () => f.fmt_power(f.find_power(f.from_sd(20.8), 500, 3).power), "74%"],
    ["from_sd(20.8), tau = 3, power 0.95: n", () => f.fmt_int(f.find_n(f.from_sd(20.8), 3, 0.95).n_planned), "1,041"],
    ["from_sd(20.8), tau = 3, power 0.95: total", () => f.fmt_int(2 * f.find_n(f.from_sd(20.8), 3, 0.95).n_planned), "2,082"],
    ["from_existing(1.8, 268), tau = 3, power 0.95: n", () => f.fmt_int(f.find_n(f.from_existing(1.8, 268), 3, 0.95).n_planned), "1,045"],
    ["from_pilot(2.13, 85), tau = 3, power 0.95: n", () => f.fmt_int(f.find_n(f.from_pilot(2.13, 85), 3, 0.95).n_planned), "570"],
    ["from_sd(2.0, interaction), tau = 0.67, power 0.80: n", () => f.fmt_int(f.find_n(f.from_sd(2.0, 0, true), 0.67, 0.80).n_planned), "221"],
    ["from_sd(2.0, interaction), tau = 0.67, power 0.80: total", () => f.fmt_int(4 * f.find_n(f.from_sd(2.0, 0, true), 0.67, 0.80).n_planned), "884"]
  ];
  let ok = 0;
  cases.forEach(([label, get, want]) => {
    const got = get();
    if (got === want) ok++;
    else fail("by hand", `${label} = ${got}, expected ${want}`);
  });
  console.log(`  by hand   ${ok} of ${cases.length} values from the paper`);
}

// --- files ------------------------------------------------------------------

{
  const here = path.join(__dirname, "..");
  const md5 = crypto.createHash("md5").update(fs.readFileSync(path.join(here, "board.css"))).digest("hex");
  const same = md5 === R.board_css_md5;
  if (!same) fail("files", "board.css is not the package's inst/shiny/www/board.css");

  const page = fs.readFileSync(path.join(here, "index.html"), "utf8");
  const order = ["base.css", "board.css", "powerrules.js", "app.js"].map((name) => page.indexOf(`"${name}"`));
  const ordered = order.every((at, i) => at !== -1 && (i === 0 || at > order[i - 1]));
  if (!ordered) fail("files", "index.html should load base.css, board.css, powerrules.js, app.js, in that order");

  console.log(`  files     board.css ${same ? "is" : "IS NOT"} the package's, byte for byte; index.html loads the four files ${ordered ? "in order" : "OUT OF ORDER"}`);
}

if (failures > 0) {
  if (failures > 25) console.log(`  ... and ${failures - 25} more`);
  console.log(`check: FAILED, ${count(failures)} difference${failures === 1 ? "" : "s"}`);
  process.exit(1);
}
console.log("check: passed, no differences");

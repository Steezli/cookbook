/**
 * GSD Settings: interactive updater for `.planning/config.json`.
 *
 * Usage:
 *   node .planning/gsd-settings.mjs
 *
 * This script updates:
 * - model_profile: quality | balanced | budget
 * - workflow: research | plan_check | verifier (boolean toggles)
 * - git.branching_strategy: none | phase | milestone
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_PATH = path.resolve(__dirname, "config.json");

function readJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if (err && (err.code === "ENOENT" || err.code === "ENOTDIR")) return null;
    throw err;
  }
}

function writeJson(filePath, obj) {
  const text = JSON.stringify(obj, null, 2) + "\n";
  fs.writeFileSync(filePath, text, "utf8");
}

function normalizeConfig(existing) {
  const cfg = existing && typeof existing === "object" ? existing : {};
  const workflow = cfg.workflow && typeof cfg.workflow === "object" ? cfg.workflow : {};
  const git = cfg.git && typeof cfg.git === "object" ? cfg.git : {};

  return {
    ...cfg,
    model_profile: cfg.model_profile ?? "balanced",
    workflow: {
      research: workflow.research ?? true,
      plan_check: workflow.plan_check ?? true,
      verifier: workflow.verifier ?? true,
      ...workflow,
    },
    git: {
      branching_strategy: git.branching_strategy ?? "none",
      ...git,
    },
  };
}

function formatOnOff(v) {
  return v ? "On" : "Off";
}

function table(rows) {
  const col1 = Math.max(...rows.map(([a]) => a.length));
  const col2 = Math.max(...rows.map(([, b]) => b.length));
  const line = `| ${"-".repeat(col1)} | ${"-".repeat(col2)} |`;
  const hdr = `| ${"Setting".padEnd(col1)} | ${"Value".padEnd(col2)} |`;
  const sep = `| ${"-".repeat(col1)} | ${"-".repeat(col2)} |`;
  const body = rows
    .map(([a, b]) => `| ${a.padEnd(col1)} | ${b.padEnd(col2)} |`)
    .join("\n");
  return `${hdr}\n${sep}\n${body}\n${line}`;
}

async function pickOne(rl, header, question, options, currentValue) {
  output.write(`\n${header}\n`);
  output.write(`${question}\n\n`);
  options.forEach((o, idx) => {
    const isCurrent = o.value === currentValue;
    output.write(
      `  ${idx + 1}) ${o.label}${isCurrent ? " (current)" : ""}\n     ${o.description}\n`,
    );
  });
  output.write("\n");
  while (true) {
    const ans = (await rl.question(`Select 1-${options.length} (Enter keeps current): `)).trim();
    if (!ans) return currentValue;
    const n = Number(ans);
    if (Number.isInteger(n) && n >= 1 && n <= options.length) return options[n - 1].value;
    output.write("Invalid selection. Try again.\n");
  }
}

async function pickYesNo(rl, header, question, currentValue) {
  output.write(`\n${header}\n`);
  output.write(`${question}\n`);
  output.write(`Current: ${formatOnOff(currentValue)}\n\n`);
  while (true) {
    const ans = (await rl.question("Select (y)es / (n)o (Enter keeps current): ")).trim().toLowerCase();
    if (!ans) return currentValue;
    if (ans === "y" || ans === "yes") return true;
    if (ans === "n" || ans === "no") return false;
    output.write("Invalid selection. Try again.\n");
  }
}

async function main() {
  const existing = readJson(CONFIG_PATH);
  if (!existing) {
    output.write(`Error: ${CONFIG_PATH} not found. Run /gsd-new-project first.\n`);
    process.exitCode = 1;
    return;
  }

  const cfg = normalizeConfig(existing);
  const rl = readline.createInterface({ input, output });

  try {
    const model_profile = await pickOne(
      rl,
      "Model",
      "Which model profile for agents?",
      [
        { value: "quality", label: "Quality", description: "Opus everywhere except verification (highest cost)" },
        { value: "balanced", label: "Balanced (Recommended)", description: "Opus for planning, Sonnet for execution/verification" },
        { value: "budget", label: "Budget", description: "Sonnet for writing, Haiku for research/verification (lowest cost)" },
      ],
      cfg.model_profile,
    );

    const research = await pickYesNo(
      rl,
      "Research",
      "Spawn Plan Researcher? (researches domain before planning)",
      cfg.workflow.research,
    );
    const plan_check = await pickYesNo(
      rl,
      "Plan Check",
      "Spawn Plan Checker? (verifies plans before execution)",
      cfg.workflow.plan_check,
    );
    const verifier = await pickYesNo(
      rl,
      "Verifier",
      "Spawn Execution Verifier? (verifies phase completion)",
      cfg.workflow.verifier,
    );

    const branching_strategy = await pickOne(
      rl,
      "Branching",
      "Git branching strategy?",
      [
        { value: "none", label: "None (Recommended)", description: "Commit directly to current branch" },
        { value: "phase", label: "Per Phase", description: "Create branch for each phase (gsd/phase-{N}-{name})" },
        { value: "milestone", label: "Per Milestone", description: "Create branch for entire milestone (gsd/{version}-{name})" },
      ],
      cfg.git.branching_strategy,
    );

    const updated = {
      ...cfg,
      model_profile,
      workflow: { ...cfg.workflow, research, plan_check, verifier },
      git: { ...cfg.git, branching_strategy },
    };

    writeJson(CONFIG_PATH, updated);

    output.write("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    output.write(" GSD ► SETTINGS UPDATED\n");
    output.write("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n");

    output.write(
      table([
        ["Model Profile", model_profile],
        ["Plan Researcher", formatOnOff(research)],
        ["Plan Checker", formatOnOff(plan_check)],
        ["Execution Verifier", formatOnOff(verifier)],
        ["Git Branching", branching_strategy === "none" ? "None" : branching_strategy === "phase" ? "Per Phase" : "Per Milestone"],
      ]) + "\n\n",
    );

    output.write("These settings apply to future /gsd-plan-phase and /gsd-execute-phase runs.\n\n");
    output.write("Quick commands:\n");
    output.write("- /gsd-set-profile <profile> — switch model profile\n");
    output.write("- /gsd-plan-phase --research — force research\n");
    output.write("- /gsd-plan-phase --skip-research — skip research\n");
    output.write("- /gsd-plan-phase --skip-verify — skip plan check\n\n");
  } finally {
    rl.close();
  }
}

await main();


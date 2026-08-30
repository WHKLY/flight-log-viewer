import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { normalizeViewerData } from "../viewer/js/data/loader.mjs";
import { buildInitialSelection, defaultMissionSourceId, sourceRegistryList } from "../viewer/js/data/sources.mjs";
import { missionSummary } from "../viewer/js/data/mission.mjs";
import { parameterModes, resolveParameter } from "../viewer/js/data/parameters.mjs";
import { signalById, signalSummary } from "../viewer/js/data/signals.mjs";

const root = process.argv[2] || "public-data";

async function readJson(path) {
  return JSON.parse(await readFile(join(root, path), "utf8"));
}

const data = normalizeViewerData({
  dataset: await readJson("dataset.json"),
  sources: await readJson("sources.json"),
  signals: await readJson("signals.json"),
  modes: await readJson("domains/modes.json"),
  mission: await readJson("domains/mission.json"),
  parameters: await readJson("domains/parameters.json"),
});

const selection = buildInitialSelection(data);
const mission = missionSummary(data, defaultMissionSourceId(data), data.dataset?.dataset?.time_range?.end_s);
const navPeriod = resolveParameter(data, "NAVL1_PERIOD", selection.parameterSource, data.dataset?.dataset?.time_range?.end_s);
const signals = signalSummary(data);

const checks = [
  ["sources", sourceRegistryList(data).length > 0],
  ["mission source", Boolean(selection.routeSource && mission.source)],
  ["parameter modes", parameterModes(data).length > 0],
  ["NAVL1_PERIOD", navPeriod.status === "direct"],
  ["ATT.Roll signal", Boolean(signalById(data, "ATT.Roll"))],
  ["signals", signals.total > 0 && signals.numeric > 0],
];

const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failed.length) {
  console.error(`frontend data smoke failed: ${failed.join(", ")}`);
  process.exit(1);
}

console.log(`frontend data smoke ok: ${signals.numeric}/${signals.total} numeric signals, route=${selection.routeSource}`);


import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { normalizeViewerData } from "../viewer/js/data/loader.mjs";
import { buildInitialSelection, defaultMissionSourceId, sourceRegistryList } from "../viewer/js/data/sources.mjs";
import { currentTaskSourceOptions, missionSummary } from "../viewer/js/data/mission.mjs";
import { parameterModes, resolveParameter } from "../viewer/js/data/parameters.mjs";
import { preferredSignalForRole, semanticRole, signalById, signalSummary } from "../viewer/js/data/signals.mjs";

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
  currentTasks: await readJson("domains/current_tasks.json"),
  parameters: await readJson("domains/parameters.json"),
  semanticSignals: await readJson("domains/semantic_signals.json"),
  trackSeries: await readJson("series/track.json"),
});

const selection = buildInitialSelection(data);
const mission = missionSummary(data, defaultMissionSourceId(data), data.dataset?.dataset?.time_range?.end_s);
const navPeriod = resolveParameter(data, "NAVL1_PERIOD", selection.parameterSource, data.dataset?.dataset?.time_range?.end_s);
const signals = signalSummary(data);
const trackPoints = data.trackSeries?.messages?.POS || [];

const checks = [
  ["sources", sourceRegistryList(data).length > 0],
  ["mission source", Boolean(selection.routeSource && mission.source)],
  ["current task domain", currentTaskSourceOptions(data).some((source) => !source.disabled)],
  ["parameter modes", parameterModes(data).length > 0],
  ["NAVL1_PERIOD", navPeriod.status === "direct"],
  ["ATT.Roll signal", Boolean(signalById(data, "ATT.Roll"))],
  ["attitude.roll role", Boolean(semanticRole(data, "attitude.roll"))],
  ["attitude.roll preferred signal", Boolean(preferredSignalForRole(data, "attitude.roll"))],
  ["signals", signals.total > 0 && signals.numeric > 0],
  ["track POS", trackPoints.length > 0],
];

const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failed.length) {
  console.error(`frontend data smoke failed: ${failed.join(", ")}`);
  process.exit(1);
}

console.log(`frontend data smoke ok: ${signals.numeric}/${signals.total} numeric signals, route=${selection.routeSource}, track=${trackPoints.length}, semantic=${signals.availableSemanticRoles}/${signals.semanticRoles}`);

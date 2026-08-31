import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { normalizeViewerData } from "../viewer/js/data/loader.mjs";
import { createInitialState, attachData, setInspectTime, setTimeWindow, setTrackMarkerTime, updateSelection } from "../viewer/js/state.mjs";

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
});

const state = attachData(createInitialState(), data);
const full = state.time.fullRange;
setTimeWindow(state, full.start + 10, full.start + 20);
setTrackMarkerTime(state, full.end);
setInspectTime(state, state.track.markerTime);
updateSelection(state, "parameterSource", "dataflash_latest");

const checks = [
  ["loaded", state.loaded],
  ["route source", Boolean(state.selection.routeSource)],
  ["current source", Boolean(state.selection.currentSource)],
  ["parameter source", state.selection.parameterSource === "dataflash_latest"],
  ["time window", state.time.window.end > state.time.window.start],
  ["marker clamp", state.track.markerTime === state.time.window.end],
  ["inspect", state.time.inspect === state.track.markerTime],
  ["semantic signals", data.semanticSignals?.counts?.available_roles > 0],
  ["current tasks", data.currentTasks?.counts?.sources_with_events > 0],
];

const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failed.length) {
  console.error(`state smoke failed: ${failed.join(", ")}`);
  process.exit(1);
}

console.log(`state smoke ok: ${state.selection.routeSource}, window=${state.time.window.start.toFixed(2)}..${state.time.window.end.toFixed(2)}`);

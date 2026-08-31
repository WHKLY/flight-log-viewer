const DEFAULT_DATA_ROOT = "../public-data";

const DATA_FILES = {
  dataset: "dataset.json",
  sources: "sources.json",
  signals: "signals.json",
  modes: "domains/modes.json",
  mission: "domains/mission.json",
  currentTasks: "domains/current_tasks.json",
  parameters: "domains/parameters.json",
  semanticSignals: "domains/semantic_signals.json",
};

export async function loadJson(dataRoot, path) {
  const response = await fetch(`${dataRoot}/${path}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return response.json();
}

export async function loadViewerData(dataRoot = DEFAULT_DATA_ROOT) {
  const entries = await Promise.all(
    Object.entries(DATA_FILES).map(async ([key, path]) => [key, await loadJson(dataRoot, path)]),
  );
  return normalizeViewerData(Object.fromEntries(entries));
}

export function normalizeViewerData(data) {
  return {
    dataset: data.dataset || {},
    sources: data.sources || { sources: {} },
    signals: data.signals || { signals: {} },
    modes: data.modes || { segments: [], focus_ranges: {} },
    mission: data.mission || { sources: [] },
    currentTasks: data.currentTasks || { sources: [], counts: {} },
    parameters: data.parameters || { selection_modes: [], available: {}, sets: {}, timeline: [] },
    semanticSignals: data.semanticSignals || { roles: {}, counts: {} },
  };
}

export function dataFiles() {
  return { ...DATA_FILES };
}

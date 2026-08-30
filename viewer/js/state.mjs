import { buildInitialSelection } from "./data/sources.mjs";

export function createInitialState() {
  return {
    data: null,
    loaded: false,
    selection: {
      routeSource: "",
      currentSource: "",
      parameterSource: "merged",
    },
    time: {
      fullRange: { start: 0, end: 1 },
      window: { start: 0, end: 1 },
      inspect: null,
    },
    track: {
      markerTime: null,
      pathMode: "window",
      markerScope: "window",
      playing: false,
      playbackSpeed: 1,
    },
    ui: {
      fontScale: "normal",
      collapsed: {},
    },
  };
}

export function datasetTimeRange(data) {
  const range = data?.dataset?.dataset?.time_range || {};
  const start = Number.isFinite(Number(range.start_s)) ? Number(range.start_s) : 0;
  const end = Number.isFinite(Number(range.end_s)) && Number(range.end_s) > start ? Number(range.end_s) : start + 1;
  return { start, end };
}

export function attachData(state, data) {
  const fullRange = datasetTimeRange(data);
  state.data = data;
  state.loaded = true;
  state.time.fullRange = fullRange;
  state.time.window = { ...fullRange };
  state.time.inspect = null;
  state.track.markerTime = fullRange.end;
  state.selection = buildInitialSelection(data, state.selection);
  return state;
}

export function updateSelection(state, key, value) {
  if (!Object.prototype.hasOwnProperty.call(state.selection, key)) {
    throw new Error(`Unknown selection key: ${key}`);
  }
  state.selection[key] = value;
  return state.selection;
}

export function setTimeWindow(state, start, end) {
  const full = state.time.fullRange;
  const nextStart = Number.isFinite(Number(start)) ? Number(start) : full.start;
  const nextEnd = Number.isFinite(Number(end)) && Number(end) > nextStart ? Number(end) : nextStart + 1;
  state.time.window = { start: nextStart, end: nextEnd };
  return state.time.window;
}

export function setInspectTime(state, time) {
  state.time.inspect = Number.isFinite(Number(time)) ? Number(time) : null;
  return state.time.inspect;
}

export function setTrackMarkerTime(state, time) {
  const number = Number(time);
  if (!Number.isFinite(number)) return state.track.markerTime;
  const bounds = state.track.markerScope === "full" ? state.time.fullRange : state.time.window;
  state.track.markerTime = Math.min(Math.max(number, bounds.start), bounds.end);
  return state.track.markerTime;
}

export function toggleCollapsed(state, key) {
  state.ui.collapsed[key] = !state.ui.collapsed[key];
  return state.ui.collapsed[key];
}


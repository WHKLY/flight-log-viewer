import { buildInitialSelection } from "./data/sources.mjs";

export function createInitialState() {
  return {
    data: null,
    config: null,
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
      theme: "dark",
      fontScale: "normal",
      sidebar: {
        collapsed: false,
        widthPx: 320,
        sections: {},
      },
      panels: {},
    },
  };
}

export function datasetTimeRange(data) {
  const range = data?.dataset?.dataset?.time_range || {};
  const start = Number.isFinite(Number(range.start_s)) ? Number(range.start_s) : 0;
  const end = Number.isFinite(Number(range.end_s)) && Number(range.end_s) > start ? Number(range.end_s) : start + 1;
  return { start, end };
}

export function attachConfig(state, config) {
  state.config = config;
  state.ui.theme = config?.app?.defaultTheme || state.ui.theme;
  state.ui.fontScale = config?.app?.defaultFontScale || state.ui.fontScale;
  state.ui.sidebar.widthPx = Number(config?.layout?.sidebar?.defaultWidthPx) || state.ui.sidebar.widthPx;
  state.ui.sidebar.sections = sidebarSectionState(config);
  state.ui.panels = panelState(config);
  return state;
}

function sidebarSectionState(config) {
  const sections = {};
  for (const section of config?.leftSidebar?.sections || []) {
    sections[section.id] = { collapsed: Boolean(section.defaultCollapsed) };
  }
  return sections;
}

function panelState(config) {
  const panels = {};
  for (const panel of config?.panels?.panels || []) {
    panels[panel.id] = { collapsed: Boolean(panel.defaultCollapsed) };
  }
  return panels;
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

export function setTheme(state, theme) {
  if (!theme) return state.ui.theme;
  state.ui.theme = theme;
  return state.ui.theme;
}

export function setFontScale(state, fontScale) {
  if (!fontScale) return state.ui.fontScale;
  state.ui.fontScale = fontScale;
  return state.ui.fontScale;
}

export function toggleSidebarCollapsed(state) {
  state.ui.sidebar.collapsed = !state.ui.sidebar.collapsed;
  return state.ui.sidebar.collapsed;
}

export function toggleSidebarSection(state, sectionId) {
  state.ui.sidebar.sections[sectionId] ||= { collapsed: false };
  state.ui.sidebar.sections[sectionId].collapsed = !state.ui.sidebar.sections[sectionId].collapsed;
  return state.ui.sidebar.sections[sectionId].collapsed;
}

export function setPanelCollapsed(state, panelId, collapsed) {
  state.ui.panels[panelId] ||= { collapsed: false };
  state.ui.panels[panelId].collapsed = Boolean(collapsed);
  return state.ui.panels[panelId].collapsed;
}

export function collapseAllPanels(state) {
  for (const panelId of Object.keys(state.ui.panels)) {
    state.ui.panels[panelId].collapsed = true;
  }
  return state.ui.panels;
}

export function expandImportantPanels(state) {
  const important = state.config?.panels?.importantOpen || [];
  for (const panelId of important) {
    setPanelCollapsed(state, panelId, false);
  }
  return state.ui.panels;
}

export function resetUiLayout(state) {
  if (!state.config) return state.ui;
  state.ui.sidebar.collapsed = false;
  state.ui.sidebar.widthPx = Number(state.config?.layout?.sidebar?.defaultWidthPx) || state.ui.sidebar.widthPx;
  state.ui.sidebar.sections = sidebarSectionState(state.config);
  state.ui.panels = panelState(state.config);
  return state.ui;
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
  return toggleSidebarSection(state, key);
}

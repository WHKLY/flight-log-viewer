import { loadThemeByName, loadUiConfig } from "./config/loader.mjs";
import { applyLayout, applyTheme, applyTypography } from "./config/theme.mjs";
import { loadViewerData } from "./data/loader.mjs";
import { currentTaskSourceById } from "./data/mission.mjs";
import {
  attachConfig,
  attachData,
  collapseAllPanels,
  createInitialState,
  expandImportantPanels,
  resetUiLayout,
  setFontScale,
  setPanelCollapsed,
  setPlotTimeref,
  setTheme,
  setTrackHighlightedTask,
  setTrackMarkerTime,
  setTrackOption,
  toggleSidebarCollapsed,
  toggleSidebarSection,
  toggleTrackOption,
  updateSelection,
} from "./state.mjs";
import {
  renderApp,
  renderLoadError,
  renderSidebar,
  setDatasetMessage,
} from "./ui/render.mjs";

const state = createInitialState();

function applyUiState() {
  const theme = state.config?.themes?.[state.ui.theme];
  applyTheme(theme);
  applyTypography(state.config?.typography, state.ui.fontScale);
  applyLayout(state.config?.layout);
}

async function setUiTheme(themeName) {
  setTheme(state, themeName);
  state.config.themes[themeName] = await loadThemeByName(themeName);
  applyTheme(state.config.themes[themeName]);
  renderApp(state);
}

async function boot() {
  try {
    setDatasetMessage("Loading schema...");
    attachData(state, await loadViewerData());
    renderApp(state);
  } catch (error) {
    renderLoadError(error);
  }
}

async function initialize() {
  try {
    attachConfig(state, await loadUiConfig());
    applyUiState();
    renderSidebar(state);
    await boot();
  } catch (error) {
    renderLoadError(error);
  }
}

function openPanel(panelId) {
  setPanelCollapsed(state, panelId, false);
  renderApp(state);
}

function finite(value) {
  return Number.isFinite(Number(value));
}

function taskEvents() {
  const source = currentTaskSourceById(state.data, state.selection.currentSource);
  return Array.isArray(source?.events) ? source.events.filter((event) => finite(event.time_s)) : [];
}

function jumpTask(direction) {
  const events = taskEvents();
  if (!events.length) return;
  const current = Number(state.track.markerTime);
  const next = direction > 0
    ? events.find((event) => Number(event.time_s) > current + 0.001) || events[events.length - 1]
    : [...events].reverse().find((event) => Number(event.time_s) < current - 0.001) || events[0];
  setTrackMarkerTime(state, next.time_s);
  setTrackHighlightedTask(state, { sourceId: next.source_id, seq: next.seq });
}

function jumpMode(direction) {
  const modes = (state.data?.modes?.segments || []).filter((segment) => finite(segment.start_s));
  if (!modes.length) return;
  const current = Number(state.track.markerTime);
  const next = direction > 0
    ? modes.find((segment) => Number(segment.start_s) > current + 0.001) || modes[modes.length - 1]
    : [...modes].reverse().find((segment) => Number(segment.start_s) < current - 0.001) || modes[0];
  setTrackMarkerTime(state, next.start_s);
}

function selectTask(target) {
  setTrackHighlightedTask(state, {
    sourceId: target.dataset.sourceId || state.selection.routeSource,
    seq: target.dataset.taskSeq,
  });
  if (finite(target.dataset.timeS)) {
    setTrackMarkerTime(state, target.dataset.timeS);
  }
}

function handleAction(action, target) {
  switch (action) {
    case "reload":
      boot();
      break;
    case "toggle-sidebar":
      toggleSidebarCollapsed(state);
      renderSidebar(state);
      break;
    case "toggle-sidebar-section":
      toggleSidebarSection(state, target.dataset.sectionId);
      renderSidebar(state);
      break;
    case "set-font-scale":
      setFontScale(state, target.dataset.value);
      applyTypography(state.config?.typography, state.ui.fontScale);
      renderApp(state);
      break;
    case "reset-layout":
      resetUiLayout(state);
      applyUiState();
      renderApp(state);
      break;
    case "collapse-all-panels":
      collapseAllPanels(state);
      renderApp(state);
      break;
    case "expand-important-panels":
      expandImportantPanels(state);
      renderApp(state);
      break;
    case "toggle-panel-collapse":
      setPanelCollapsed(state, target.dataset.panelId, !state.ui.panels?.[target.dataset.panelId]?.collapsed);
      renderApp(state);
      break;
    case "set-route-display-mode":
      setTrackOption(state, "routeDisplayMode", target.dataset.value);
      renderApp(state);
      break;
    case "set-track-display-mode":
      setTrackOption(state, "displayMode", target.dataset.value);
      renderApp(state);
      break;
    case "set-track-path-scope":
      setTrackOption(state, "pathScope", target.dataset.value);
      renderApp(state);
      break;
    case "set-track-speed":
      setTrackOption(state, "playbackSpeed", Number(target.dataset.value));
      renderApp(state);
      break;
    case "toggle-track-option":
      toggleTrackOption(state, target.dataset.trackOption);
      renderApp(state);
      break;
    case "select-task":
      selectTask(target);
      renderApp(state);
      break;
    case "send-plot-timeref":
      setPlotTimeref(state, state.track.markerTime);
      renderApp(state);
      break;
    case "track-play":
      toggleTrackOption(state, "playing");
      renderApp(state);
      break;
    case "prev-task":
      jumpTask(-1);
      renderApp(state);
      break;
    case "next-task":
      jumpTask(1);
      renderApp(state);
      break;
    case "prev-mode":
      jumpMode(-1);
      renderApp(state);
      break;
    case "next-mode":
      jumpMode(1);
      renderApp(state);
      break;
    case "show-track":
      openPanel("track-mission");
      break;
    case "show-hud":
      openPanel("track-mission");
      setTrackOption(state, "showHud", true);
      renderApp(state);
      break;
    case "open-inspector":
      openPanel("external-sources");
      break;
    case "clear-inspect":
      state.time.inspect = null;
      renderApp(state);
      break;
    default:
      console.info(`UI action not implemented yet: ${action}`);
  }
}

function bindEvents() {
  document.addEventListener("click", async (event) => {
    if (!(event.target instanceof Element)) return;
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const action = target.dataset.action;
    if (action === "set-theme") {
      await setUiTheme(target.dataset.value);
      return;
    }
    if (target.matches('input[type="checkbox"][data-action="toggle-panel"]')) return;
    handleAction(action, target);
  });

  document.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    if (target.id === "track-marker-time") {
      setTrackMarkerTime(state, target.value);
      renderApp(state);
    }
  });

  document.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement || target instanceof HTMLInputElement)) return;
    if (target.id === "route-source" || target.id === "track-route-source") {
      updateSelection(state, "routeSource", target.value);
      renderApp(state);
    } else if (target.id === "current-source" || target.id === "track-current-source") {
      updateSelection(state, "currentSource", target.value);
      renderApp(state);
    } else if (target.id === "parameter-source") {
      updateSelection(state, "parameterSource", target.value);
      renderApp(state);
    } else if (target.dataset.action === "toggle-panel") {
      setPanelCollapsed(state, target.dataset.panelId, !target.checked);
      renderApp(state);
    }
  });
}

bindEvents();
initialize();

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
  resetTrackView2d,
  resetUiLayout,
  setFontScale,
  setPanelCollapsed,
  setPlotTimeref,
  setTheme,
  setTrackHighlightedTask,
  setTrackMarkerTime,
  setTrackOption,
  setTrackView2d,
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
const activePlotPointers = new Map();
let plotGesture = null;

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

function parseViewBox(value) {
  const [x, y, width, height] = String(value || "").split(/\s+/).map(Number);
  if ([x, y, width, height].every(Number.isFinite) && width > 1 && height > 1) {
    return { x, y, width, height };
  }
  return { x: 0, y: 0, width: 1000, height: 680 };
}

function plotViewBox(svg) {
  return state.track.view2d || parseViewBox(svg?.dataset?.defaultViewbox) || parseViewBox(svg?.getAttribute("viewBox"));
}

function setLivePlotViewBox(svg, viewBox) {
  setTrackView2d(state, viewBox);
  svg.setAttribute("viewBox", `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`);
}

function clampZoom(defaultView, next) {
  const minWidth = defaultView.width / 40;
  const maxWidth = defaultView.width * 5;
  const width = Math.min(Math.max(next.width, minWidth), maxWidth);
  const ratio = width / next.width;
  return {
    x: next.x + ((next.width - width) / 2),
    y: next.y + ((next.height - next.height * ratio) / 2),
    width,
    height: next.height * ratio,
  };
}

function svgPoint(svg, event) {
  const rect = svg.getBoundingClientRect();
  const view = plotViewBox(svg);
  return {
    x: view.x + ((event.clientX - rect.left) / rect.width) * view.width,
    y: view.y + ((event.clientY - rect.top) / rect.height) * view.height,
  };
}

function zoomPlot(svg, clientX, clientY, factor) {
  const rect = svg.getBoundingClientRect();
  const view = plotViewBox(svg);
  const defaultView = parseViewBox(svg.dataset.defaultViewbox);
  const focalX = view.x + ((clientX - rect.left) / rect.width) * view.width;
  const focalY = view.y + ((clientY - rect.top) / rect.height) * view.height;
  const next = {
    x: focalX - (focalX - view.x) * factor,
    y: focalY - (focalY - view.y) * factor,
    width: view.width * factor,
    height: view.height * factor,
  };
  setLivePlotViewBox(svg, clampZoom(defaultView, next));
}

function distance(a, b) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function midpoint(a, b) {
  return { clientX: (a.clientX + b.clientX) / 2, clientY: (a.clientY + b.clientY) / 2 };
}

function handlePlotPointerDown(event) {
  const svg = event.target.closest?.('[data-track-plot="2d"]');
  if (!svg) return;
  activePlotPointers.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
  svg.setPointerCapture?.(event.pointerId);
  if (activePlotPointers.size === 2) {
    const [a, b] = [...activePlotPointers.values()];
    plotGesture = {
      svg,
      mode: "pinch",
      distance: distance(a, b),
      viewBox: plotViewBox(svg),
    };
  } else {
    plotGesture = {
      svg,
      mode: "pan",
      pointerId: event.pointerId,
      start: { clientX: event.clientX, clientY: event.clientY },
      last: { clientX: event.clientX, clientY: event.clientY },
      moved: false,
    };
  }
}

function handlePlotPointerMove(event) {
  if (!plotGesture || !activePlotPointers.has(event.pointerId)) return;
  const svg = plotGesture.svg;
  activePlotPointers.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });

  if (plotGesture.mode === "pinch" && activePlotPointers.size >= 2) {
    const [a, b] = [...activePlotPointers.values()];
    const nextDistance = Math.max(distance(a, b), 1);
    const factor = plotGesture.distance / nextDistance;
    const mid = midpoint(a, b);
    zoomPlot(svg, mid.clientX, mid.clientY, factor);
    plotGesture.distance = nextDistance;
    return;
  }

  if (plotGesture.mode !== "pan" || plotGesture.pointerId !== event.pointerId) return;
  const rect = svg.getBoundingClientRect();
  const view = plotViewBox(svg);
  const dx = (plotGesture.last.clientX - event.clientX) * (view.width / rect.width);
  const dy = (plotGesture.last.clientY - event.clientY) * (view.height / rect.height);
  if (Math.abs(event.clientX - plotGesture.start.clientX) + Math.abs(event.clientY - plotGesture.start.clientY) > 4) {
    plotGesture.moved = true;
  }
  setLivePlotViewBox(svg, { ...view, x: view.x + dx, y: view.y + dy });
  plotGesture.last = { clientX: event.clientX, clientY: event.clientY };
}

function handlePlotPointerEnd(event) {
  activePlotPointers.delete(event.pointerId);
  if (activePlotPointers.size === 0) plotGesture = null;
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
      resetTrackView2d(state);
      renderApp(state);
      break;
    case "set-track-speed":
      setTrackOption(state, "playbackSpeed", Number(target.dataset.value));
      renderApp(state);
      break;
    case "toggle-track-option":
      toggleTrackOption(state, target.dataset.trackOption);
      resetTrackView2d(state);
      renderApp(state);
      break;
    case "select-task":
      selectTask(target);
      renderApp(state);
      break;
    case "select-track-time":
      if (finite(target.dataset.timeS)) {
        setTrackMarkerTime(state, target.dataset.timeS);
        renderApp(state);
      }
      break;
    case "send-plot-timeref":
      setPlotTimeref(state, state.track.markerTime);
      renderApp(state);
      break;
    case "track-fit":
    case "track-fit-window":
    case "track-fit-route":
      resetTrackView2d(state);
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
      resetTrackView2d(state);
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

  document.addEventListener("wheel", (event) => {
    const svg = event.target.closest?.('[data-track-plot="2d"]');
    if (!svg) return;
    event.preventDefault();
    zoomPlot(svg, event.clientX, event.clientY, event.deltaY > 0 ? 1.16 : 0.86);
  }, { passive: false });

  document.addEventListener("pointerdown", handlePlotPointerDown);
  document.addEventListener("pointermove", handlePlotPointerMove);
  document.addEventListener("pointerup", handlePlotPointerEnd);
  document.addEventListener("pointercancel", handlePlotPointerEnd);
}

bindEvents();
initialize();

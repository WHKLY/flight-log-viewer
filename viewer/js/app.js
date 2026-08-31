import { loadThemeByName, loadUiConfig } from "./config/loader.mjs";
import { applyLayout, applyTheme, applyTypography } from "./config/theme.mjs";
import { loadViewerData } from "./data/loader.mjs";
import {
  attachConfig,
  attachData,
  collapseAllPanels,
  createInitialState,
  expandImportantPanels,
  resetUiLayout,
  setFontScale,
  setPanelCollapsed,
  setTheme,
  toggleSidebarCollapsed,
  toggleSidebarSection,
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
    case "show-track":
      openPanel("track-mission");
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

  document.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement || target instanceof HTMLInputElement)) return;
    if (target.id === "route-source") {
      updateSelection(state, "routeSource", target.value);
      renderApp(state);
    } else if (target.id === "current-source") {
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

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
  setTheme,
  toggleSidebarCollapsed,
  toggleSidebarSection,
  updateSelection,
} from "./state.mjs";
import {
  applyWorkspacePanelVisibility,
  renderApp,
  renderLoadError,
  renderParameters,
  renderSelectors,
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
  renderSidebar(state);
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
  state.ui.panels[panelId] ||= {};
  state.ui.panels[panelId].collapsed = false;
  renderSidebar(state);
  applyWorkspacePanelVisibility(state);
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
      renderSidebar(state);
      break;
    case "reset-layout":
      resetUiLayout(state);
      applyUiState();
      renderSidebar(state);
      applyWorkspacePanelVisibility(state);
      break;
    case "collapse-all-panels":
      collapseAllPanels(state);
      renderSidebar(state);
      applyWorkspacePanelVisibility(state);
      break;
    case "expand-important-panels":
      expandImportantPanels(state);
      renderSidebar(state);
      applyWorkspacePanelVisibility(state);
      break;
    case "show-track":
      openPanel("mission-sources");
      break;
    case "open-inspector":
      openPanel("overview");
      break;
    case "clear-inspect":
      state.time.inspect = null;
      renderSidebar(state);
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
      renderSelectors(state);
      renderSidebar(state);
    } else if (target.id === "current-source") {
      updateSelection(state, "currentSource", target.value);
      renderSelectors(state);
      renderSidebar(state);
    } else if (target.id === "parameter-source") {
      updateSelection(state, "parameterSource", target.value);
      renderSelectors(state);
      renderParameters(state);
      renderSidebar(state);
    } else if (target.dataset.action === "toggle-panel") {
      state.ui.panels[target.dataset.panelId] ||= {};
      state.ui.panels[target.dataset.panelId].collapsed = !target.checked;
      renderSidebar(state);
      applyWorkspacePanelVisibility(state);
    }
  });
}

bindEvents();
initialize();

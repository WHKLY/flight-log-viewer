import { loadViewerData } from "./data/loader.mjs";
import { attachData, createInitialState, updateSelection } from "./state.mjs";
import {
  renderApp,
  renderLoadError,
  renderParameters,
  renderSelectors,
  setDatasetMessage,
} from "./ui/render.mjs";

const state = createInitialState();

function $(selector) {
  return document.querySelector(selector);
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

function bindEvents() {
  $("#reload-button").addEventListener("click", boot);

  $("#route-source").addEventListener("change", (event) => {
    updateSelection(state, "routeSource", event.target.value);
    renderSelectors(state);
  });

  $("#current-source").addEventListener("change", (event) => {
    updateSelection(state, "currentSource", event.target.value);
    renderSelectors(state);
  });

  $("#parameter-source").addEventListener("change", (event) => {
    updateSelection(state, "parameterSource", event.target.value);
    renderSelectors(state);
    renderParameters(state);
  });
}

bindEvents();
boot();

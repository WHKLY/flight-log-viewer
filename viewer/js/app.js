import { loadViewerData } from "./data/loader.mjs";
import {
  buildInitialSelection,
  selectionReadout,
  sourceRegistryList,
} from "./data/sources.mjs";
import { missionSourceOptions, missionSources } from "./data/mission.mjs";
import { parameterModes, parameterSample, selectedParameterSet } from "./data/parameters.mjs";
import { signalList, signalSummary } from "./data/signals.mjs";

const state = {
  data: null,
  routeSource: "",
  currentSource: "",
  parameterSource: "merged",
};

function $(selector) {
  return document.querySelector(selector);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

function fmt(value, digits = 2) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : "missing";
}

function optionHtml(options, selected) {
  if (!options.length) return '<option value="">missing</option>';
  return options
    .map((option) => `<option value="${escapeHtml(option.id)}" ${option.id === selected ? "selected" : ""} ${option.disabled ? "disabled" : ""}>${escapeHtml(option.label || option.id)}</option>`)
    .join("");
}

function initializeSelections() {
  const next = buildInitialSelection(state.data, {
    routeSource: state.routeSource,
    currentSource: state.currentSource,
    parameterSource: state.parameterSource,
  });
  state.routeSource = next.routeSource;
  state.currentSource = next.currentSource;
  state.parameterSource = next.parameterSource;
}

function renderMetric(label, value, tagClass = "") {
  return `<div class="metric"><span class="meta">${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>${tagClass ? `<span class="tag ${tagClass}">${escapeHtml(tagClass)}</span>` : ""}</div>`;
}

function renderStatus() {
  const dataset = state.data.dataset;
  const firmware = dataset.firmware || {};
  const profile = dataset.compatibility_profile || {};
  const counts = dataset.counts || {};
  const signals = signalSummary(state.data);
  $("#status-grid").innerHTML = [
    renderMetric("Firmware", firmware.version ? `${firmware.vehicle} ${firmware.version}` : "unknown", firmware.confidence === "high" ? "good" : "warn"),
    renderMetric("Profile", profile.id || "missing", profile.confidence === "source-matched" ? "good" : "warn"),
    renderMetric("DataFlash records", counts.dataflash_records ?? 0),
    renderMetric("Signals", `${signals.numeric} numeric / ${signals.total} total`),
  ].join("");
}

function renderWarnings() {
  const warnings = state.data.dataset.warnings || [];
  if (!warnings.length) return;
  $("#status-grid").insertAdjacentHTML(
    "beforeend",
    renderMetric("Warnings", warnings.length, warnings.some((warning) => warning.severity === "error") ? "bad" : "warn"),
  );
}

function renderDatasetSummary() {
  const dataset = state.data.dataset;
  const range = dataset.dataset?.time_range || {};
  const selected = dataset.selected_files || {};
  $("#dataset-summary").innerHTML = `
    <div><strong>${escapeHtml(dataset.dataset?.label || "missing")}</strong></div>
    <div class="meta">time ${fmt(range.start_s)}s .. ${fmt(range.end_s)}s</div>
    <div class="meta">BIN ${escapeHtml(selected.bin || "none")}</div>
    <div class="meta">TLOG ${escapeHtml(selected.tlog || "none")}</div>
    <div class="meta">PARAM ${escapeHtml(selected.param || "none")}</div>
    <div class="meta">WP ${escapeHtml(selected.waypoints || "none")}</div>
  `;
}

function renderSelectors() {
  const options = missionSourceOptions(state.data);
  $("#route-source").innerHTML = optionHtml(options, state.routeSource);
  $("#current-source").innerHTML = optionHtml(options, state.currentSource);
  $("#parameter-source").innerHTML = optionHtml(parameterModes(state.data), state.parameterSource);
  $("#selection-readout").textContent = selectionReadout(state);
}

function renderSources() {
  const sources = sourceRegistryList(state.data);
  $("#source-count").textContent = String(sources.length);
  $("#source-list").innerHTML = sources
    .map((source) => `
      <article class="card">
        <h3>${escapeHtml(source.id)}</h3>
        <div class="meta">${escapeHtml(source.kind || "unknown")}</div>
        <div class="meta">${escapeHtml(source.file || "derived")}</div>
        <span class="tag ${source.available ? "good" : "warn"}">${source.available ? "available" : "missing"}</span>
      </article>
    `)
    .join("");
}

function renderMission() {
  const sources = missionSources(state.data);
  $("#mission-count").textContent = String(sources.length);
  $("#mission-list").innerHTML = sources
    .map((source) => {
      const quality = source.quality || {};
      return `
        <article class="card">
          <h3>${escapeHtml(source.label || source.id)}</h3>
          <div class="meta">${escapeHtml(source.id)}</div>
          <div class="meta">items ${quality.item_count ?? source.items?.length ?? 0} | located ${quality.located_count ?? 0}</div>
          <div class="meta">events ${quality.event_count ?? source.current_events?.length ?? 0}</div>
          <span class="tag ${quality.item_count ? "good" : "warn"}">${escapeHtml(source.trust || source.kind || "source")}</span>
        </article>
      `;
    })
    .join("");
}

function renderModes() {
  const rows = state.data.modes.segments || [];
  $("#mode-list").innerHTML = rows.length
    ? rows
      .map((segment) => `
        <div class="row">
          <strong>${escapeHtml(segment.name)}</strong>
          <span class="meta">${fmt(segment.start_s)}s .. ${fmt(segment.end_s)}s</span>
          <span class="tag ${segment.known ? "good" : "warn"}">${escapeHtml(segment.mode_num)}</span>
        </div>
      `)
      .join("")
    : '<div class="muted">No mode segments.</div>';
}

function renderParameters() {
  const parameters = state.data.parameters;
  const counts = parameters.counts || {};
  const set = selectedParameterSet(state.data, state.parameterSource);
  const sample = parameterSample(state.data, state.parameterSource, 18);
  $("#parameter-summary").innerHTML = `
    <div class="card">
      <h3>${escapeHtml(set.label || state.parameterSource)}</h3>
      <div class="meta">merged ${counts.merged ?? 0}</div>
      <div class="meta">param file ${counts.param_file ?? 0}</div>
      <div class="meta">DataFlash latest ${counts.dataflash_latest ?? 0}</div>
      <div class="meta">DataFlash timeline ${counts.dataflash_records ?? 0}</div>
    </div>
    <div class="scroll-list">
      ${sample.map(([key, value]) => `<div class="row"><strong>${escapeHtml(key)}</strong><span class="meta">${escapeHtml(value)}</span><span class="tag">param</span></div>`).join("") || '<div class="muted">No parameters.</div>'}
    </div>
  `;
}

function renderSignals() {
  const signals = signalList(state.data);
  $("#signal-count").textContent = String(signals.length);
  $("#signal-list").innerHTML = signals.slice(0, 300)
    .map((signal) => `
      <div class="row">
        <strong>${escapeHtml(signal.id)}</strong>
        <span class="meta">${escapeHtml(signal.source_id || "missing")}</span>
        <span class="tag ${signal.numeric ? "good" : ""}">${signal.numeric ? "numeric" : "text"}</span>
      </div>
    `)
    .join("");
}

function render() {
  initializeSelections();
  renderStatus();
  renderWarnings();
  renderDatasetSummary();
  renderSelectors();
  renderSources();
  renderMission();
  renderModes();
  renderParameters();
  renderSignals();
}

async function boot() {
  try {
    $("#dataset-summary").textContent = "Loading schema...";
    state.data = await loadViewerData();
    render();
  } catch (error) {
    document.body.innerHTML = `<main class="app-shell"><section class="panel error"><h1>Failed to load data</h1><p>${escapeHtml(error.message)}</p><p>Run <code>./scripts/start_viewer.sh</code> from the project root.</p></section></main>`;
  }
}

$("#reload-button").addEventListener("click", boot);
$("#route-source").addEventListener("change", (event) => {
  state.routeSource = event.target.value;
  renderSelectors();
});
$("#current-source").addEventListener("change", (event) => {
  state.currentSource = event.target.value;
  renderSelectors();
});
$("#parameter-source").addEventListener("change", (event) => {
  state.parameterSource = event.target.value;
  renderSelectors();
  renderParameters();
});

boot();

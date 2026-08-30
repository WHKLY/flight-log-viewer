const DATA_ROOT = "../public-data";

const state = {
  data: null,
  routeSource: "",
  currentSource: "",
  parameterSource: "merged",
};

const files = {
  dataset: "dataset.json",
  sources: "sources.json",
  signals: "signals.json",
  modes: "domains/modes.json",
  mission: "domains/mission.json",
  parameters: "domains/parameters.json",
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

async function loadJson(path) {
  const response = await fetch(`${DATA_ROOT}/${path}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`);
  }
  return response.json();
}

async function loadAll() {
  const entries = await Promise.all(Object.entries(files).map(async ([key, path]) => [key, await loadJson(path)]));
  return Object.fromEntries(entries);
}

function fmt(value, digits = 2) {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(digits) : "missing";
}

function sourceOptions(sources, selected) {
  if (!sources.length) return '<option value="">missing</option>';
  return sources
    .map((source) => `<option value="${escapeHtml(source.id)}" ${source.id === selected ? "selected" : ""}>${escapeHtml(source.label || source.id)}</option>`)
    .join("");
}

function parameterOptions(parameters) {
  return (parameters.selection_modes || [])
    .map((mode) => `<option value="${escapeHtml(mode)}" ${mode === state.parameterSource ? "selected" : ""} ${parameters.available?.[mode] ? "" : "disabled"}>${escapeHtml(mode)}</option>`)
    .join("");
}

function sourceRegistryList(sourcesPayload) {
  return Object.values(sourcesPayload.sources || {});
}

function missionSources() {
  return state.data?.mission?.sources || [];
}

function defaultSourceId(sources) {
  return sources.find((source) => source.quality?.item_count > 0 || source.items?.length > 0)?.id || sources[0]?.id || "";
}

function initializeSelections() {
  const sources = missionSources();
  state.routeSource = state.routeSource || defaultSourceId(sources);
  state.currentSource = state.currentSource || defaultSourceId(sources);
  const modes = state.data.parameters.selection_modes || [];
  if (!modes.includes(state.parameterSource) || !state.data.parameters.available?.[state.parameterSource]) {
    state.parameterSource = modes.find((mode) => state.data.parameters.available?.[mode]) || "merged";
  }
}

function renderMetric(label, value, tagClass = "") {
  return `<div class="metric"><span class="meta">${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>${tagClass ? `<span class="tag ${tagClass}">${escapeHtml(tagClass)}</span>` : ""}</div>`;
}

function renderStatus() {
  const dataset = state.data.dataset;
  const firmware = dataset.firmware || {};
  const profile = dataset.compatibility_profile || {};
  const counts = dataset.counts || {};
  $("#status-grid").innerHTML = [
    renderMetric("Firmware", firmware.version ? `${firmware.vehicle} ${firmware.version}` : "unknown", firmware.confidence === "high" ? "good" : "warn"),
    renderMetric("Profile", profile.id || "missing", profile.confidence === "source-matched" ? "good" : "warn"),
    renderMetric("DataFlash records", counts.dataflash_records ?? 0),
    renderMetric("Signals", `${counts.numeric_signals ?? 0} numeric / ${counts.signals ?? 0} total`),
  ].join("");
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
  const mission = missionSources();
  $("#route-source").innerHTML = sourceOptions(mission, state.routeSource);
  $("#current-source").innerHTML = sourceOptions(mission, state.currentSource);
  $("#parameter-source").innerHTML = parameterOptions(state.data.parameters);
  $("#selection-readout").textContent = `route=${state.routeSource || "missing"} | current=${state.currentSource || "missing"} | params=${state.parameterSource}`;
}

function renderSources() {
  const sources = sourceRegistryList(state.data.sources);
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
  const sources = missionSources();
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
  const set = parameters.sets?.[state.parameterSource] || parameters.sets?.merged || {};
  const sample = Object.entries(set.control_params || set.params || {}).slice(0, 18);
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
  const signals = Object.values(state.data.signals.signals || {});
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

function renderWarnings() {
  const warnings = state.data.dataset.warnings || [];
  if (!warnings.length) return;
  $("#status-grid").insertAdjacentHTML(
    "beforeend",
    renderMetric("Warnings", warnings.length, warnings.some((warning) => warning.severity === "error") ? "bad" : "warn"),
  );
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
    state.data = await loadAll();
    render();
  } catch (error) {
    document.body.innerHTML = `<main class="app-shell"><section class="panel error"><h1>Failed to load data</h1><p>${escapeHtml(error.message)}</p><p>Run <code>bash scripts/start_viewer.sh</code> from the project root.</p></section></main>`;
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


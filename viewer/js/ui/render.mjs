import { currentTaskSourceOptions, missionSourceOptions, missionSources } from "../data/mission.mjs";
import { parameterModes, parameterSample, selectedParameterSet } from "../data/parameters.mjs";
import { selectionReadout, sourceRegistryList } from "../data/sources.mjs";
import { signalList, signalSummary } from "../data/signals.mjs";

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

function renderMetric(label, value, tagClass = "") {
  return `<div class="metric"><span class="meta">${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>${tagClass ? `<span class="tag ${tagClass}">${escapeHtml(tagClass)}</span>` : ""}</div>`;
}

function renderButton(action, label, extra = "") {
  return `<button type="button" data-action="${escapeHtml(action)}" ${extra}>${escapeHtml(label)}</button>`;
}

function renderSegmented(name, options, selected) {
  return `
    <div class="segmented" role="group" aria-label="${escapeHtml(name)}">
      ${options.map((option) => `<button type="button" class="${option.id === selected ? "active" : ""}" data-action="${escapeHtml(name)}" data-value="${escapeHtml(option.id)}">${escapeHtml(option.label)}</button>`).join("")}
    </div>
  `;
}

export function setDatasetMessage(message) {
  const node = $("#dataset-summary");
  if (node) node.textContent = message;
}

export function renderLoadError(error) {
  document.body.innerHTML = `<main class="app-shell"><section class="panel error"><h1>Failed to load data</h1><p>${escapeHtml(error.message)}</p><p>Run <code>./scripts/start_viewer.sh</code> from the project root.</p></section></main>`;
}

function sidebarSectionCollapsed(state, sectionId) {
  return Boolean(state.ui.sidebar.sections?.[sectionId]?.collapsed);
}

function renderSidebarSection(state, section) {
  const collapsed = sidebarSectionCollapsed(state, section.id);
  return `
    <section class="sidebar-section ${collapsed ? "collapsed" : ""}" data-sidebar-section="${escapeHtml(section.id)}">
      <button type="button" class="sidebar-section-head" data-action="toggle-sidebar-section" data-section-id="${escapeHtml(section.id)}">
        <span>${escapeHtml(section.label || section.id)}</span>
        <span class="chevron">${collapsed ? "+" : "-"}</span>
      </button>
      <div class="sidebar-section-body">
        ${(section.items || []).map((item) => renderSidebarItem(state, item)).join("")}
      </div>
    </section>
  `;
}

function renderSidebarItem(state, item) {
  const dataset = state.data?.dataset || {};
  const counts = dataset.counts || {};
  const profile = dataset.compatibility_profile || {};
  const profileSelection = profile.selection || {};
  const firmware = dataset.firmware || {};
  const range = dataset.dataset?.time_range || {};
  const selected = dataset.selected_files || {};
  const warnings = dataset.warnings || [];

  switch (item) {
    case "reload":
      return `<div class="sidebar-item">${renderButton("reload", "Reload Data")}</div>`;
    case "theme":
      return `<div class="sidebar-item"><label>Theme</label>${renderSegmented("set-theme", [{ id: "light", label: "Light" }, { id: "dark", label: "Dark" }], state.ui.theme)}</div>`;
    case "font-scale":
      return `<div class="sidebar-item"><label>Font</label>${renderSegmented("set-font-scale", [{ id: "small", label: "Small" }, { id: "normal", label: "Normal" }, { id: "large", label: "Large" }], state.ui.fontScale)}</div>`;
    case "reset-layout":
      return `<div class="sidebar-item">${renderButton("reset-layout", "Reset Layout")}</div>`;
    case "dataset-label":
      return `<div id="dataset-summary" class="sidebar-readout"><strong>${escapeHtml(dataset.dataset?.label || "Loading dataset...")}</strong></div>`;
    case "firmware":
      return `<div class="sidebar-readout"><span>Firmware</span><strong>${escapeHtml(firmware.version ? `${firmware.vehicle} ${firmware.version}` : "unknown")}</strong><small>${escapeHtml(firmware.git_hash || "no git hash")}</small></div>`;
    case "profile":
      return `<div class="sidebar-readout"><span>Profile</span><strong>${escapeHtml(profile.id || "missing")}</strong><small>${escapeHtml(profileSelection.mode || "unknown")}</small></div>`;
    case "time-range":
      return `<div class="sidebar-readout"><span>Time Range</span><strong>${fmt(range.start_s)}s .. ${fmt(range.end_s)}s</strong></div>`;
    case "file-list":
      return `
        <div class="sidebar-file-list">
          <div><span>BIN</span><strong>${escapeHtml(selected.bin || "none")}</strong></div>
          <div><span>TLOG</span><strong>${escapeHtml(selected.tlog || "none")}</strong></div>
          <div><span>PARAM</span><strong>${escapeHtml(selected.param || "none")}</strong></div>
          <div><span>WP</span><strong>${escapeHtml(selected.waypoints || "none")}</strong></div>
        </div>
      `;
    case "counts":
      return `<div class="sidebar-kpi-grid">${renderSmallKpi("Signals", counts.signals ?? 0)}${renderSmallKpi("Semantic", `${counts.available_semantic_roles ?? 0}/${counts.semantic_roles ?? 0}`)}${renderSmallKpi("Tasks", counts.current_task_events ?? 0)}${renderSmallKpi("Params", counts.parameters ?? 0)}</div>`;
    case "route-source":
      return renderSelect("Mission route", "route-source", missionSourceOptions(state.data), state.selection.routeSource);
    case "current-task-source":
      return renderSelect("Current task", "current-source", currentTaskSourceOptions(state.data), state.selection.currentSource);
    case "parameter-source":
      return renderSelect("Parameters", "parameter-source", parameterModes(state.data), state.selection.parameterSource);
    case "selection-readout":
      return `<p id="selection-readout" class="note">${escapeHtml(selectionReadout(state.selection))}</p>`;
    case "profile-confidence":
      return `<div class="sidebar-readout"><span>Confidence</span><strong>${escapeHtml(profileSelection.confidence || "unknown")}</strong><small>${escapeHtml(profileSelection.reason || "")}</small></div>`;
    case "profile-capabilities":
      return `<div class="tag-list">${Object.entries(profile.capabilities || {}).map(([key, value]) => `<span class="tag ${value ? "good" : "warn"}">${escapeHtml(key)}</span>`).join("") || '<span class="muted">No capabilities.</span>'}</div>`;
    case "profile-command":
      return `<code class="code-block">python3 scripts/flv_build.py --profile ${escapeHtml(profile.id || "<profile-id>")}</code>`;
    case "inspect-time":
      return `<div class="sidebar-readout"><span>Inspect Time</span><strong>${state.time.inspect === null ? "none" : `${fmt(state.time.inspect)}s`}</strong></div>`;
    case "global-window":
      return `<div class="sidebar-readout"><span>Global Window</span><strong>${fmt(state.time.window.start)}s .. ${fmt(state.time.window.end)}s</strong></div>`;
    case "jump-mode":
      return `<div class="button-row">${renderButton("prev-mode", "Prev Mode")}${renderButton("next-mode", "Next Mode")}</div>`;
    case "jump-task":
      return `<div class="button-row">${renderButton("prev-task", "Prev Task")}${renderButton("next-task", "Next Task")}</div>`;
    case "collapse-all":
      return `<div class="sidebar-item">${renderButton("collapse-all-panels", "Collapse All Panels")}</div>`;
    case "expand-important":
      return `<div class="sidebar-item">${renderButton("expand-important-panels", "Expand Important")}</div>`;
    case "panel-list":
      return `<div class="panel-toggle-list">${(state.config?.panels?.panels || []).map((panel) => `<label><input type="checkbox" data-action="toggle-panel" data-panel-id="${escapeHtml(panel.id)}" ${state.ui.panels?.[panel.id]?.collapsed ? "" : "checked"}> ${escapeHtml(panel.label || panel.id)}</label>`).join("")}</div>`;
    case "focus-auto":
      return `<div class="sidebar-item">${renderButton("focus-auto", "Focus AUTO")}</div>`;
    case "show-track":
      return `<div class="sidebar-item">${renderButton("show-track", "Show Track")}</div>`;
    case "show-hud":
      return `<div class="sidebar-item">${renderButton("show-hud", "Show HUD")}</div>`;
    case "open-inspector":
      return `<div class="sidebar-item">${renderButton("open-inspector", "Open Inspector")}</div>`;
    case "clear-inspect":
      return `<div class="sidebar-item">${renderButton("clear-inspect", "Clear Inspect")}</div>`;
    case "compatibility-warnings":
      return `<div class="warning-list">${warnings.map((warning) => `<div class="warning-item ${escapeHtml(warning.severity || "info")}"><strong>${escapeHtml(warning.code)}</strong><span>${escapeHtml(warning.message)}</span></div>`).join("") || '<div class="muted">No warnings.</div>'}</div>`;
    case "missing-data":
      return `<div class="sidebar-readout"><span>Missing Data</span><strong>${warnings.filter((warning) => String(warning.code || "").includes("missing")).length}</strong></div>`;
    default:
      return `<div class="muted">Unknown sidebar item: ${escapeHtml(item)}</div>`;
  }
}

function renderSmallKpi(label, value) {
  return `<div class="small-kpi"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function renderSelect(label, id, options, selected) {
  return `
    <label class="field">
      <span>${escapeHtml(label)}</span>
      <select id="${escapeHtml(id)}">${optionHtml(options, selected)}</select>
    </label>
  `;
}

export function renderSidebar(state) {
  const sidebar = $("#left-sidebar");
  if (!sidebar) return;
  const sections = state.config?.leftSidebar?.sections || [];
  sidebar.classList.toggle("is-collapsed", Boolean(state.ui.sidebar.collapsed));
  sidebar.innerHTML = `
    <div class="sidebar-brand">
      <div>
        <p class="eyebrow">Flight Log Viewer</p>
        <h1>Data Console</h1>
      </div>
      <button type="button" class="icon-button" data-action="toggle-sidebar" aria-label="Toggle sidebar">${state.ui.sidebar.collapsed ? ">" : "<"}</button>
    </div>
    <p class="lede">Configurable analysis workstation. Edit <code>ui/</code> to tune style and layout.</p>
    <div class="sidebar-sections">
      ${sections.map((section) => renderSidebarSection(state, section)).join("")}
    </div>
  `;
}

function renderStatus(state) {
  const dataset = state.data.dataset;
  const firmware = dataset.firmware || {};
  const profile = dataset.compatibility_profile || {};
  const profileSelection = profile.selection || {};
  const counts = dataset.counts || {};
  const signals = signalSummary(state.data);
  $("#status-grid").innerHTML = [
    renderMetric("Firmware", firmware.version ? `${firmware.vehicle} ${firmware.version}` : "unknown", firmware.confidence === "high" ? "good" : "warn"),
    renderMetric("Profile", profile.id || "missing", profileSelection.confidence === "source-matched" || profileSelection.confidence === "manual" ? "good" : "warn"),
    renderMetric("Current tasks", counts.current_task_events ?? 0),
    renderMetric("Signals", `${signals.numeric} numeric / ${signals.total} total`),
  ].join("");
}

function renderWarnings(state) {
  const warnings = state.data.dataset.warnings || [];
  if (!warnings.length) return;
  $("#status-grid").insertAdjacentHTML(
    "beforeend",
    renderMetric("Warnings", warnings.length, warnings.some((warning) => warning.severity === "error") ? "bad" : "warn"),
  );
}

export function renderSelectors(state) {
  const route = $("#route-source");
  const current = $("#current-source");
  const parameter = $("#parameter-source");
  const readout = $("#selection-readout");
  if (route) route.innerHTML = optionHtml(missionSourceOptions(state.data), state.selection.routeSource);
  if (current) current.innerHTML = optionHtml(currentTaskSourceOptions(state.data), state.selection.currentSource);
  if (parameter) parameter.innerHTML = optionHtml(parameterModes(state.data), state.selection.parameterSource);
  if (readout) readout.textContent = selectionReadout(state.selection);
}

function renderSources(state) {
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

function renderMission(state) {
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

function renderModes(state) {
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

export function renderParameters(state) {
  const parameters = state.data.parameters;
  const counts = parameters.counts || {};
  const set = selectedParameterSet(state.data, state.selection.parameterSource);
  const sample = parameterSample(state.data, state.selection.parameterSource, 18);
  $("#parameter-summary").innerHTML = `
    <div class="card">
      <h3>${escapeHtml(set.label || state.selection.parameterSource)}</h3>
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

function renderSignals(state) {
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

export function renderApp(state) {
  renderSidebar(state);
  renderStatus(state);
  renderWarnings(state);
  renderSources(state);
  renderMission(state);
  renderModes(state);
  renderParameters(state);
  renderSignals(state);
}

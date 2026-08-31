import {
  currentTaskEventAt,
  currentTaskSourceById,
  currentTaskSourceOptions,
  missionSourceOptions,
  routeItemsAt,
} from "../data/mission.mjs";
import { parameterModes, parameterSample, selectedParameterSet } from "../data/parameters.mjs";
import { missionSourceById, missionSources, selectionReadout, sourceRegistryList } from "../data/sources.mjs";
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

function finite(value) {
  return Number.isFinite(Number(value));
}

function optionHtml(options, selected) {
  if (!options.length) return '<option value="">missing</option>';
  return options
    .map((option) => `<option value="${escapeHtml(option.id)}" ${option.id === selected ? "selected" : ""} ${option.disabled ? "disabled" : ""}>${escapeHtml(option.label || option.id)}</option>`)
    .join("");
}

function renderButton(action, label, extra = "") {
  return `<button type="button" data-action="${escapeHtml(action)}" ${extra}>${escapeHtml(label)}</button>`;
}

function renderSegmented(action, options, selected) {
  return `
    <div class="segmented" role="group" aria-label="${escapeHtml(action)}">
      ${options.map((option) => `<button type="button" class="${option.id === selected ? "active" : ""}" data-action="${escapeHtml(action)}" data-value="${escapeHtml(option.id)}">${escapeHtml(option.label)}</button>`).join("")}
    </div>
  `;
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

function renderMetric(label, value, tagClass = "") {
  return `<div class="metric"><span class="meta">${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>${tagClass ? `<span class="tag ${tagClass}">${escapeHtml(tagClass)}</span>` : ""}</div>`;
}

function renderFileList(selected = {}) {
  return `
    <div class="file-list">
      <div><span>BIN</span><strong>${escapeHtml(selected.bin || "none")}</strong></div>
      <div><span>TLOG</span><strong>${escapeHtml(selected.tlog || "none")}</strong></div>
      <div><span>PARAM</span><strong>${escapeHtml(selected.param || "none")}</strong></div>
      <div><span>WP</span><strong>${escapeHtml(selected.waypoints || "none")}</strong></div>
    </div>
  `;
}

function panelConfigs(state) {
  return [...(state.config?.panels?.panels || [])].sort((a, b) => {
    const priorityA = Number.isFinite(Number(a.priority)) ? Number(a.priority) : 999;
    const priorityB = Number.isFinite(Number(b.priority)) ? Number(b.priority) : 999;
    return priorityA - priorityB || String(a.id).localeCompare(String(b.id));
  });
}

function sidebarSectionCollapsed(state, sectionId) {
  return Boolean(state.ui.sidebar.sections?.[sectionId]?.collapsed);
}

function modeAt(data, time) {
  const segments = data?.modes?.segments || [];
  if (!segments.length) return null;
  const number = Number(time);
  if (!Number.isFinite(number)) return segments[segments.length - 1];
  return segments.find((segment) => number >= Number(segment.start_s) && number <= Number(segment.end_s))
    || [...segments].reverse().find((segment) => Number(segment.start_s) <= number)
    || segments[0];
}

function trackContext(state) {
  const time = finite(state.track.markerTime) ? Number(state.track.markerTime) : state.time.fullRange.start;
  const routeSource = missionSourceById(state.data, state.selection.routeSource);
  const taskSource = currentTaskSourceById(state.data, state.selection.currentSource);
  const currentTask = currentTaskEventAt(taskSource, time);
  const routeItems = routeItemsAt(routeSource, time);
  const currentMode = modeAt(state.data, time);
  return { time, routeSource, taskSource, currentTask, routeItems, currentMode };
}

function taskLabel(task) {
  if (!task) return "No current task";
  const command = task.command_name || (task.command === null || task.command === undefined ? "MISSION_CURRENT" : `CMD_${task.command}`);
  return `#${task.seq ?? "?"} ${command}`;
}

function taskLocation(task) {
  if (!task || !finite(task.lat) || !finite(task.lon)) return "no position";
  return `${fmt(task.lat, 7)}, ${fmt(task.lon, 7)} alt ${fmt(task.alt, 1)}m`;
}

function qualityTags(context) {
  const tags = [];
  if (context.currentMode?.name) tags.push(context.currentMode.name);
  if (context.routeSource?.kind) tags.push(context.routeSource.kind);
  if (context.taskSource?.kind) tags.push(context.taskSource.kind);
  if (!context.currentTask) tags.push("NO CURRENT TASK");
  if (!context.routeItems.length) tags.push("NO ROUTE");
  return tags;
}

export function setDatasetMessage(message) {
  const node = $("#dataset-summary");
  if (node) node.textContent = message;
}

export function renderLoadError(error) {
  document.body.innerHTML = `<main class="app-shell"><section class="panel error"><h1>Failed to load data</h1><p>${escapeHtml(error.message)}</p><p>Run <code>./scripts/start_viewer.sh</code> from the project root.</p></section></main>`;
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
      return `<div class="sidebar-item"><span class="control-label">Theme</span>${renderSegmented("set-theme", [{ id: "light", label: "Light" }, { id: "dark", label: "Dark" }], state.ui.theme)}</div>`;
    case "font-scale":
      return `<div class="sidebar-item"><span class="control-label">Font</span>${renderSegmented("set-font-scale", [{ id: "small", label: "Small" }, { id: "normal", label: "Normal" }, { id: "large", label: "Large" }], state.ui.fontScale)}</div>`;
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
      return renderFileList(selected);
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
      return `<div class="panel-toggle-list">${panelConfigs(state).map((panel) => `<label><input type="checkbox" data-action="toggle-panel" data-panel-id="${escapeHtml(panel.id)}" ${state.ui.panels?.[panel.id]?.collapsed ? "" : "checked"}> <span>${escapeHtml(panel.label || panel.id)}</span></label>`).join("")}</div>`;
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

export function renderSidebar(state) {
  const sidebar = $("#left-sidebar");
  const shell = $(".app-shell");
  if (!sidebar) return;
  const sections = state.config?.leftSidebar?.sections || [];
  sidebar.classList.toggle("is-collapsed", Boolean(state.ui.sidebar.collapsed));
  shell?.classList.toggle("is-sidebar-collapsed", Boolean(state.ui.sidebar.collapsed));
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

function renderOverviewPanel(state) {
  const dataset = state.data?.dataset || {};
  const firmware = dataset.firmware || {};
  const profile = dataset.compatibility_profile || {};
  const profileSelection = profile.selection || {};
  const counts = dataset.counts || {};
  const range = dataset.dataset?.time_range || {};
  const selected = dataset.selected_files || {};
  const warnings = dataset.warnings || [];
  const signals = signalSummary(state.data);
  const currentSources = [
    ["Route", state.selection.routeSource || "missing"],
    ["Current task", state.selection.currentSource || "missing"],
    ["Parameters", state.selection.parameterSource || "missing"],
  ];

  return `
    <div class="status-grid">
      ${renderMetric("Firmware", firmware.version ? `${firmware.vehicle} ${firmware.version}` : "unknown", firmware.confidence === "high" ? "good" : "warn")}
      ${renderMetric("Profile", profile.id || "missing", profileSelection.confidence === "source-matched" || profileSelection.confidence === "manual" ? "good" : "warn")}
      ${renderMetric("Current tasks", counts.current_task_events ?? 0)}
      ${renderMetric("Signals", `${signals.numeric} numeric / ${signals.total} total`)}
      ${warnings.length ? renderMetric("Warnings", warnings.length, warnings.some((warning) => warning.severity === "error") ? "bad" : "warn") : ""}
    </div>
    <div class="overview-grid">
      <article class="overview-card">
        <h3>Dataset</h3>
        <div class="row-lite"><span>Label</span><strong>${escapeHtml(dataset.dataset?.label || "missing")}</strong></div>
        <div class="row-lite"><span>Time</span><strong>${fmt(range.start_s)}s .. ${fmt(range.end_s)}s</strong></div>
        <div class="row-lite"><span>Git</span><strong>${escapeHtml(firmware.git_hash || "missing")}</strong></div>
      </article>
      <article class="overview-card">
        <h3>Selected Files</h3>
        ${renderFileList(selected)}
      </article>
      <article class="overview-card">
        <h3>Active Sources</h3>
        ${currentSources.map(([label, value]) => `<div class="row-lite"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}
        <p class="note">${escapeHtml(selectionReadout(state.selection))}</p>
      </article>
      <article class="overview-card">
        <h3>Warnings</h3>
        <div class="warning-list">${warnings.map((warning) => `<div class="warning-item ${escapeHtml(warning.severity || "info")}"><strong>${escapeHtml(warning.code)}</strong><span>${escapeHtml(warning.message)}</span></div>`).join("") || '<div class="muted">No warnings.</div>'}</div>
      </article>
    </div>
  `;
}

function renderSourcesPanel(state) {
  const sources = sourceRegistryList(state.data);
  return `
    <div class="section-head">
      <h3>Registered Sources</h3>
      <span class="badge">${escapeHtml(sources.length)}</span>
    </div>
    <div class="card-grid">
      ${sources.map((source) => `
        <article class="card">
          <h3>${escapeHtml(source.id)}</h3>
          <div class="meta">${escapeHtml(source.kind || "unknown")}</div>
          <div class="meta">${escapeHtml(source.file || "derived")}</div>
          <span class="tag ${source.available ? "good" : "warn"}">${source.available ? "available" : "missing"}</span>
        </article>
      `).join("") || '<div class="muted">No source registry entries.</div>'}
    </div>
  `;
}

function renderMissionPanel(state) {
  const sources = missionSources(state.data);
  return `
    <div class="section-head">
      <h3>Mission Sources</h3>
      <span class="badge">${escapeHtml(sources.length)}</span>
    </div>
    <div class="card-grid">
      ${sources.map((source) => {
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
      }).join("") || '<div class="muted">No mission sources.</div>'}
    </div>
  `;
}

function renderModesPanel(state) {
  const rows = state.data?.modes?.segments || [];
  return rows.length
    ? `<div class="scroll-list">${rows.map((segment) => `
        <div class="row">
          <strong>${escapeHtml(segment.name)}</strong>
          <span class="meta">${fmt(segment.start_s)}s .. ${fmt(segment.end_s)}s</span>
          <span class="tag ${segment.known ? "good" : "warn"}">${escapeHtml(segment.mode_num)}</span>
        </div>
      `).join("")}</div>`
    : '<div class="muted">No mode segments.</div>';
}

export function renderParametersContent(state) {
  const parameters = state.data?.parameters || {};
  const counts = parameters.counts || {};
  const set = selectedParameterSet(state.data, state.selection.parameterSource);
  const sample = parameterSample(state.data, state.selection.parameterSource, 18);
  return `
    <div class="stack">
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
    </div>
  `;
}

function renderSignalsPanel(state) {
  const signals = signalList(state.data);
  return `
    <div class="section-head">
      <h3>Signal Catalog</h3>
      <span class="badge">${escapeHtml(signals.length)}</span>
    </div>
    <div class="scroll-list compact">
      ${signals.slice(0, 300).map((signal) => `
        <div class="row">
          <strong>${escapeHtml(signal.id)}</strong>
          <span class="meta">${escapeHtml(signal.source_id || "missing")}</span>
          <span class="tag ${signal.numeric ? "good" : ""}">${signal.numeric ? "numeric" : "text"}</span>
        </div>
      `).join("") || '<div class="muted">No signals.</div>'}
    </div>
  `;
}

function renderExternalSourcesPanel(state) {
  return `
    ${renderOverviewPanel(state)}
    <section class="subpanel">
      ${renderSourcesPanel(state)}
    </section>
    <section class="subpanel">
      ${renderSignalsPanel(state)}
    </section>
  `;
}

function renderTrackSummary(context) {
  return `
    <div class="track-summary-grid">
      ${renderMetric("Selected Time", `${fmt(context.time)}s`, "good")}
      ${renderMetric("Flight Mode", context.currentMode?.name || "missing", context.currentMode?.name === "AUTO" ? "good" : "warn")}
      ${renderMetric("Current Task", taskLabel(context.currentTask), context.currentTask ? "good" : "warn")}
      ${renderMetric("Route Items", context.routeItems.length)}
    </div>
    <div class="tag-list track-quality-tags">
      ${qualityTags(context).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}
    </div>
  `;
}

function renderTrackControls(state) {
  return `
    <div class="source-choice-grid">
      ${renderSelect("Mission route source", "track-route-source", missionSourceOptions(state.data), state.selection.routeSource)}
      ${renderSelect("Current task source", "track-current-source", currentTaskSourceOptions(state.data), state.selection.currentSource)}
      <div class="field">
        <span>Route display</span>
        ${renderSegmented("set-route-display-mode", [
          { id: "selected", label: "Selected" },
          { id: "compare", label: "Compare" },
          { id: "external", label: "External" },
          { id: "onboard", label: "Onboard" },
        ], state.track.routeDisplayMode)}
      </div>
      <div class="field">
        <span>Viewer</span>
        ${renderSegmented("set-track-display-mode", [
          { id: "split", label: "Split" },
          { id: "2d", label: "2D" },
          { id: "3d", label: "3D" },
          { id: "hud", label: "HUD" },
        ], state.track.displayMode)}
      </div>
    </div>
    <div class="button-row track-toggle-row">
      ${renderButton("toggle-track-option", state.track.showTaskList ? "Hide Tasks" : "Show Tasks", 'data-track-option="showTaskList"')}
      ${renderButton("toggle-track-option", state.track.showTrack ? "Hide Track" : "Show Track", 'data-track-option="showTrack"')}
      ${renderButton("toggle-track-option", state.track.showWaypoints ? "Hide Waypoints" : "Show Waypoints", 'data-track-option="showWaypoints"')}
      ${renderButton("toggle-track-option", state.track.showHud ? "Hide HUD" : "Show HUD", 'data-track-option="showHud"')}
      ${renderButton("toggle-track-option", state.track.showTargets ? "Hide Targets" : "Show Targets", 'data-track-option="showTargets"')}
    </div>
  `;
}

function renderTaskList(state, context) {
  const currentSeq = context.currentTask?.seq;
  const highlighted = state.track.highlightedTask;
  return `
    <div class="task-list ${state.track.showTaskList ? "" : "is-hidden"}">
      ${context.routeItems.map((item) => {
        const active = item.seq === currentSeq || (highlighted?.sourceId === item.source_id && Number(highlighted?.seq) === Number(item.seq));
        return `
          <button type="button" class="task-row ${active ? "active" : ""}" data-action="select-task" data-source-id="${escapeHtml(item.source_id || context.routeSource?.id || "")}" data-task-seq="${escapeHtml(item.seq)}" data-time-s="${escapeHtml(item.time_s ?? "")}">
            <span class="task-id">#${escapeHtml(item.seq ?? "?")}</span>
            <strong>${escapeHtml(item.command_name || `CMD_${item.command ?? "?"}`)}</strong>
            <span class="meta">${escapeHtml(taskLocation(item))}</span>
            <span class="tag ${active ? "good" : ""}">${active ? "active" : "route"}</span>
          </button>
        `;
      }).join("") || '<div class="muted">No route items for selected source/time.</div>'}
    </div>
  `;
}

function renderTrackViewer(state, context) {
  return `
    <div class="track-viewer track-viewer-${escapeHtml(state.track.displayMode)}">
      <section class="viewer-pane viewer-pane-primary">
        <div class="viewer-toolbar">
          ${renderSegmented("set-track-path-scope", [
            { id: "window", label: "Window Path" },
            { id: "full", label: "Full Path" },
          ], state.track.pathScope)}
          <div class="button-row">
            ${renderButton("track-fit", "Fit Track")}
            ${renderButton("track-fit-window", "Fit Window")}
            ${renderButton("track-fit-route", "Fit Route")}
          </div>
        </div>
        <div class="viewer-placeholder">
          <strong>${state.track.displayMode === "3d" ? "3D Track View" : "2D Track View"}</strong>
          <span>Renderer placeholder. Path scope: ${escapeHtml(state.track.pathScope)}. Track=${state.track.showTrack ? "on" : "off"}, Waypoints=${state.track.showWaypoints ? "on" : "off"}.</span>
          <span>Current marker: ${fmt(context.time)}s / ${taskLabel(context.currentTask)}.</span>
        </div>
      </section>
      <aside class="hud-pane ${state.track.showHud ? "" : "is-hidden"}">
        <div class="hud-placeholder">
          <strong>HUD</strong>
          <span>Mode ${escapeHtml(context.currentMode?.name || "missing")}</span>
          <span>${escapeHtml(taskLabel(context.currentTask))}</span>
          <span>Targets ${state.track.showTargets ? "visible" : "hidden"}</span>
        </div>
      </aside>
    </div>
  `;
}

function renderTrackTimeline(state, context) {
  const full = state.time.fullRange;
  const min = fmt(full.start, 3);
  const max = fmt(full.end, 3);
  return `
    <section class="track-timeline subpanel">
      <div class="section-head">
        <h3>Track Timeline</h3>
        <span class="badge">${fmt(context.time)}s</span>
      </div>
      <label class="timeline-control">
        <span>Selected aircraft/HUD time</span>
        <input id="track-marker-time" type="range" min="${escapeHtml(min)}" max="${escapeHtml(max)}" step="0.05" value="${escapeHtml(fmt(context.time, 3))}">
      </label>
      <div class="mode-strip">
        ${(state.data?.modes?.segments || []).map((segment) => {
          const start = Number(segment.start_s);
          const end = Number(segment.end_s);
          const left = ((start - full.start) / (full.end - full.start)) * 100;
          const width = Math.max(((end - start) / (full.end - full.start)) * 100, 0.4);
          return `<span class="mode-chip" style="left:${escapeHtml(left)}%;width:${escapeHtml(width)}%" title="${escapeHtml(segment.name)} ${fmt(start)}s..${fmt(end)}s">${escapeHtml(segment.name)}</span>`;
        }).join("")}
      </div>
      <div class="button-row">
        ${renderButton("track-play", state.track.playing ? "Pause" : "Play")}
        ${renderSegmented("set-track-speed", [
          { id: "0.5", label: "0.5x" },
          { id: "1", label: "1x" },
          { id: "2", label: "2x" },
          { id: "5", label: "5x" },
        ], String(state.track.playbackSpeed))}
        ${renderButton("prev-task", "Prev Task")}
        ${renderButton("next-task", "Next Task")}
        ${renderButton("prev-mode", "Prev Mode")}
        ${renderButton("next-mode", "Next Mode")}
      </div>
    </section>
  `;
}

function renderTrackMissionPanel(state) {
  const context = trackContext(state);
  return `
    <section class="track-header subpanel">
      ${renderTrackSummary(context)}
    </section>
    <section class="track-controls subpanel">
      ${renderTrackControls(state)}
    </section>
    <section class="track-main-grid">
      <div class="subpanel">
        <div class="section-head">
          <h3>Mission Tasks</h3>
          <span class="badge">${escapeHtml(context.routeItems.length)}</span>
        </div>
        ${renderTaskList(state, context)}
      </div>
      <div class="subpanel">
        <div class="section-head">
          <h3>Current Task Detail</h3>
          <span class="badge">${escapeHtml(context.taskSource?.label || context.taskSource?.id || "missing")}</span>
        </div>
        <div class="current-task-card">
          <strong>${escapeHtml(taskLabel(context.currentTask))}</strong>
          <span>${escapeHtml(taskLocation(context.currentTask))}</span>
          <span>time ${fmt(context.currentTask?.time_s)}s | mode ${escapeHtml(context.currentMode?.name || "missing")}</span>
        </div>
      </div>
    </section>
    ${renderTrackViewer(state, context)}
    ${renderTrackTimeline(state, context)}
    <section class="subpanel">
      ${renderMissionPanel(state)}
    </section>
    <section class="subpanel">
      <div class="section-head">
        <h3>Flight Mode Segments</h3>
        <span class="badge">${escapeHtml(state.data?.modes?.segments?.length || 0)}</span>
      </div>
      ${renderModesPanel(state)}
    </section>
  `;
}

function renderPanelBody(state, panel) {
  switch (panel.kind) {
    case "external-sources":
      return renderExternalSourcesPanel(state);
    case "track-mission":
      return renderTrackMissionPanel(state);
    case "overview":
      return renderOverviewPanel(state);
    case "legacy-source-registry":
      return renderSourcesPanel(state);
    case "legacy-mission-sources":
      return renderMissionPanel(state);
    case "legacy-mode-segments":
      return renderModesPanel(state);
    case "legacy-parameters":
      return renderParametersContent(state);
    case "legacy-signal-catalog":
      return renderSignalsPanel(state);
    default:
      return `<div class="muted">Panel kind is not implemented: ${escapeHtml(panel.kind || "missing")}</div>`;
  }
}

function renderPanelShell(state, panel) {
  const panelState = state.ui.panels?.[panel.id] || {};
  const collapsed = Boolean(panelState.collapsed);
  const tags = panel.tags || [];
  return `
    <section class="workspace-panel-shell ${collapsed ? "is-collapsed" : ""}" data-panel-id="${escapeHtml(panel.id)}">
      <header class="workspace-panel-head">
        <div class="workspace-panel-title">
          <div class="title-row">
            <h2>${escapeHtml(panel.label || panel.id)}</h2>
            <div class="tag-list">${tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
          </div>
          <p class="panel-description">${escapeHtml(panel.description || "")}</p>
        </div>
        <div class="workspace-panel-actions">
          ${renderButton("toggle-panel-collapse", collapsed ? "Open" : "Close", `data-panel-id="${escapeHtml(panel.id)}"`)}
          ${renderButton("focus-panel", "Focus", `data-panel-id="${escapeHtml(panel.id)}"`)}
          ${renderButton("reset-panel", "Reset", `data-panel-id="${escapeHtml(panel.id)}"`)}
          ${renderButton("panel-settings", "Settings", `data-panel-id="${escapeHtml(panel.id)}"`)}
        </div>
      </header>
      <div class="workspace-panel-body" data-panel-body="${escapeHtml(panel.id)}">
        ${collapsed ? "" : renderPanelBody(state, panel)}
      </div>
    </section>
  `;
}

export function renderWorkspace(state) {
  const root = $("#workspace-panels");
  if (!root || !state.data) return;
  root.innerHTML = panelConfigs(state).map((panel) => renderPanelShell(state, panel)).join("");
}

export function applyWorkspacePanelVisibility(state) {
  for (const panel of document.querySelectorAll(".workspace-panel-shell[data-panel-id]")) {
    const panelId = panel.dataset.panelId;
    const collapsed = Boolean(state.ui.panels?.[panelId]?.collapsed);
    panel.classList.toggle("is-collapsed", collapsed);
  }
}

export function renderSelectors(state) {
  const route = $("#route-source");
  const current = $("#current-source");
  const parameter = $("#parameter-source");
  if (route) route.innerHTML = optionHtml(missionSourceOptions(state.data), state.selection.routeSource);
  if (current) current.innerHTML = optionHtml(currentTaskSourceOptions(state.data), state.selection.currentSource);
  if (parameter) parameter.innerHTML = optionHtml(parameterModes(state.data), state.selection.parameterSource);
  for (const readout of document.querySelectorAll("#selection-readout")) {
    readout.textContent = selectionReadout(state.selection);
  }
}

export function renderParameters(state) {
  const body = $('[data-panel-body="parameters"]');
  if (body) body.innerHTML = renderParametersContent(state);
}

export function renderApp(state) {
  renderSidebar(state);
  renderWorkspace(state);
}

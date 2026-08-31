export const DEFAULT_UI_ROOT = "../ui";

export const DEFAULT_CONFIG = {
  app: {
    defaultTheme: "dark",
    defaultFontScale: "normal",
    availableThemes: ["light", "dark"],
    features: {
      profileFrontendSwitch: false,
      customPlots: true,
      hud: true,
      inspector: true,
    },
  },
  layout: {
    page: { maxWidth: "none", minWorkspaceWidthPx: 720 },
    sidebar: {
      defaultWidthPx: 320,
      minWidthPx: 240,
      maxWidthPx: 380,
      collapsedWidthPx: 72,
      resizable: true,
    },
    workspace: {
      gapPx: 12,
      panelRadiusPx: 14,
      defaultPanelHeightPx: 360,
      largePanelHeightPx: 620,
    },
    breakpoints: { tabletPortraitPx: 900, phonePx: 640 },
  },
  typography: {
    fontFamily: "Atkinson Hyperlegible, Noto Sans SC, sans-serif",
    monoFamily: "JetBrains Mono, ui-monospace, monospace",
    scales: { small: 0.92, normal: 1, large: 1.12 },
  },
  interaction: {
    touch: { minTargetPx: 44, enablePinchZoom: true, enableDragPan: true },
    charts: { wheelZoom: true, dragPan: true, axisDrag: true, showZeroAxisDefault: true, showModeLinesDefault: true },
    persistence: { rememberTheme: true, rememberSidebarWidth: true, rememberPanelCollapse: true },
  },
  panels: {
    defaultOpen: [],
    importantOpen: ["overview", "mission-sources"],
    panels: [
      { id: "overview", label: "Overview Status", description: "Dataset, firmware, profile, source and warning summary.", kind: "overview", priority: 10, defaultCollapsed: true, tags: ["schema", "status"] },
      { id: "source-registry", label: "Source Registry", description: "All available and derived data sources.", kind: "legacy-source-registry", priority: 50, defaultCollapsed: true, tags: ["sources"] },
      { id: "mission-sources", label: "Mission Sources", description: "Route and current-task source candidates.", kind: "legacy-mission-sources", priority: 40, defaultCollapsed: true, tags: ["mission", "manual-first"] },
      { id: "mode-segments", label: "Mode Segments", description: "Flight mode timeline segments.", kind: "legacy-mode-segments", priority: 60, defaultCollapsed: true, tags: ["modes"] },
      { id: "parameters", label: "Parameters", description: "Parameter source summary and sample values.", kind: "legacy-parameters", priority: 70, defaultCollapsed: true, tags: ["params"] },
      { id: "signal-catalog", label: "Signal Catalog", description: "Decoded signal catalog and numeric field list.", kind: "legacy-signal-catalog", priority: 80, defaultCollapsed: true, tags: ["signals"] },
    ],
  },
  leftSidebar: {
    sections: [
      { id: "app-controls", label: "App", defaultCollapsed: false, items: ["reload", "theme", "font-scale", "reset-layout"] },
      { id: "dataset", label: "Dataset", defaultCollapsed: false, items: ["dataset-label", "firmware", "profile", "time-range", "file-list", "counts"] },
      { id: "sources", label: "Sources", defaultCollapsed: false, items: ["route-source", "current-task-source", "parameter-source", "selection-readout"] },
      { id: "profile", label: "Profile", defaultCollapsed: true, items: ["profile-confidence", "profile-capabilities", "profile-command"] },
      { id: "time", label: "Time", defaultCollapsed: true, items: ["inspect-time", "global-window", "jump-mode", "jump-task"] },
      { id: "panels", label: "Panels", defaultCollapsed: true, items: ["collapse-all", "expand-important", "panel-list"] },
      { id: "quick-actions", label: "Quick Actions", defaultCollapsed: true, items: ["focus-auto", "show-track", "show-hud", "open-inspector", "clear-inspect"] },
      { id: "warnings", label: "Warnings", defaultCollapsed: true, items: ["compatibility-warnings", "missing-data"] },
    ],
  },
};

export const DEFAULT_THEMES = {
  dark: {
    name: "dark",
    background: { page: "#071018", field: "#0b1b27", glowA: "rgba(19, 170, 196, 0.18)", glowB: "rgba(75, 111, 154, 0.16)" },
    surface: { panel: "rgba(12, 28, 40, 0.92)", panelStrong: "rgba(16, 39, 55, 0.96)", card: "rgba(23, 51, 69, 0.74)", rail: "rgba(7, 18, 28, 0.96)", railHeader: "rgba(16, 45, 64, 0.82)" },
    text: { strong: "#ecf8ff", normal: "#c9d9e5", muted: "#88a2b3", inverse: "#061019" },
    border: { subtle: "rgba(154, 205, 224, 0.16)", strong: "rgba(154, 205, 224, 0.34)", focus: "rgba(83, 214, 238, 0.72)" },
    primary: { base: "#36b8d4", strong: "#65d9ef", soft: "rgba(54, 184, 212, 0.16)" },
    secondary: { base: "#5f7892", soft: "rgba(95, 120, 146, 0.18)" },
    dynamic: { base: "#f2aa3f", strong: "#ffc86b", soft: "rgba(242, 170, 63, 0.18)" },
    warning: { base: "#f07d35", soft: "rgba(240, 125, 53, 0.18)" },
    error: { base: "#ef5350", soft: "rgba(239, 83, 80, 0.18)" },
    success: { base: "#35c98f", soft: "rgba(53, 201, 143, 0.16)" },
    mission: { current: "#f2aa3f", demand: "#b86dff", finalDemand: "#56a8ff" },
    hud: { frame: "rgba(101, 217, 239, 0.72)", horizonSky: "#194e72", horizonGround: "#604b32", marker: "#ffc86b" },
    chart: { grid: "rgba(154, 205, 224, 0.13)", axis: "rgba(201, 217, 229, 0.74)", zero: "rgba(236, 248, 255, 0.5)", modeBand: "rgba(54, 184, 212, 0.08)", modeLine: "rgba(242, 170, 63, 0.5)" },
  },
};

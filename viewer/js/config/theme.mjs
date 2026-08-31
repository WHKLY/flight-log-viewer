function toKebab(value) {
  return String(value).replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

function flattenTokens(value, prefix = []) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [[prefix.join("-"), value]];
  }
  return Object.entries(value).flatMap(([key, child]) => flattenTokens(child, [...prefix, toKebab(key)]));
}

export function applyTheme(theme, root = document.documentElement) {
  if (!theme) return;
  root.dataset.theme = theme.name || "custom";
  for (const [name, value] of flattenTokens(theme)) {
    if (name === "name" || value === undefined || value === null || typeof value === "object") continue;
    root.style.setProperty(`--ui-${name}`, String(value));
  }
}

export function applyTypography(typography, fontScale, root = document.documentElement) {
  const scale = typography?.scales?.[fontScale] ?? typography?.scales?.normal ?? 1;
  root.style.setProperty("--ui-font-family", typography?.fontFamily || "sans-serif");
  root.style.setProperty("--ui-mono-family", typography?.monoFamily || "monospace");
  root.style.setProperty("--ui-font-scale", String(scale));
}

export function applyLayout(layout, root = document.documentElement) {
  const sidebar = layout?.sidebar || {};
  const workspace = layout?.workspace || {};
  root.style.setProperty("--sidebar-width", `${sidebar.defaultWidthPx ?? 320}px`);
  root.style.setProperty("--sidebar-min-width", `${sidebar.minWidthPx ?? 240}px`);
  root.style.setProperty("--sidebar-max-width", `${sidebar.maxWidthPx ?? 380}px`);
  root.style.setProperty("--sidebar-collapsed-width", `${sidebar.collapsedWidthPx ?? 56}px`);
  root.style.setProperty("--workspace-gap", `${workspace.gapPx ?? 12}px`);
  root.style.setProperty("--panel-radius", `${workspace.panelRadiusPx ?? 14}px`);
}

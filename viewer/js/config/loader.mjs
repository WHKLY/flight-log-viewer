import { DEFAULT_CONFIG, DEFAULT_THEMES, DEFAULT_UI_ROOT } from "./defaults.mjs";

const CONFIG_FILES = {
  app: "config/app.json",
  layout: "config/layout.json",
  leftSidebar: "config/left-sidebar.json",
  panels: "config/panels.json",
  typography: "config/typography.json",
  interaction: "config/interaction.json",
};

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function mergeConfig(base, override) {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return override ?? base;
  }
  const merged = { ...base };
  for (const [key, value] of Object.entries(override)) {
    merged[key] = mergeConfig(base[key], value);
  }
  return merged;
}

async function loadOptionalJson(uiRoot, path, fallback) {
  try {
    const response = await fetch(`${uiRoot}/${path}`, { cache: "no-store" });
    if (!response.ok) return fallback;
    return await response.json();
  } catch (error) {
    console.warn(`Using UI fallback for ${path}: ${error.message}`);
    return fallback;
  }
}

async function loadTheme(uiRoot, themeName) {
  const fallback = DEFAULT_THEMES[themeName] || DEFAULT_THEMES.dark;
  return loadOptionalJson(uiRoot, `themes/${themeName}.json`, fallback);
}

export async function loadUiConfig(uiRoot = DEFAULT_UI_ROOT) {
  const loaded = {};
  for (const [key, path] of Object.entries(CONFIG_FILES)) {
    loaded[key] = await loadOptionalJson(uiRoot, path, DEFAULT_CONFIG[key]);
  }
  const config = mergeConfig(DEFAULT_CONFIG, loaded);
  const themeName = config.app.defaultTheme || "dark";
  config.themes = {
    [themeName]: await loadTheme(uiRoot, themeName),
  };
  return config;
}

export async function loadThemeByName(themeName, uiRoot = DEFAULT_UI_ROOT) {
  return loadTheme(uiRoot, themeName || "dark");
}

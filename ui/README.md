# UI Configuration

The `ui/` directory contains human-editable configuration for the browser interface.

Runtime code lives in `viewer/`. Visual style, dimensions, sidebar sections and interaction defaults should be changed here first.

## Main Files

- `config/app.json`: global defaults and feature flags.
- `config/layout.json`: page, sidebar and workspace dimensions.
- `config/left-sidebar.json`: left control area sections and item order.
- `config/panels.json`: right workspace panel order and default collapse state.
- `config/typography.json`: font families and scale presets.
- `config/interaction.json`: touch, chart and persistence defaults.
- `themes/light.json`: light theme tokens.
- `themes/dark.json`: dark theme tokens.

## Editing Rule

Prefer editing config before changing JavaScript or CSS:

- Colors: edit `themes/*.json`.
- Sidebar width: edit `config/layout.json`.
- Sidebar section order: edit `config/left-sidebar.json`.
- Default open panels: edit `config/panels.json`.
- Font scale values: edit `config/typography.json`.

If a config file is missing or invalid, the viewer should fall back to built-in defaults.

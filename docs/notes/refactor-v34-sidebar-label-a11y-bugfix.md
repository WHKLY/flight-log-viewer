# Refactor V34 - Sidebar Label Accessibility Bugfix

Date: 2026-08-31

## Problem

Browser accessibility tooling reported:

```text
No label associated with a form field
```

The warning came from static `<label>Theme</label>` and `<label>Font</label>` text in the sidebar. They were not associated with an input.

## Fix

Replace those labels with:

```html
<span class="control-label">
```

and reuse the normal muted label styling for `.control-label`.

## Validation

- `node --check viewer/js/ui/render.mjs`
- `node --check viewer/js/app.js`
- `git diff --check`

# Refactor V27 - UI Render Layer

Date: 2026-08-31

## Goal

Split the browser entry point into a small application controller plus a dedicated render layer.

This keeps the current minimal schema viewer behavior unchanged while reducing coupling before real UI work starts.

## Current Problem

`viewer/js/app.js` currently owns too many responsibilities:

- loading the dataset schema
- holding mutable app state
- formatting values for display
- escaping HTML
- rendering every panel
- binding DOM events
- handling load errors

This makes later UI changes risky because small layout changes require editing the same file that controls boot and state mutation.

## Route

Create `viewer/js/ui/render.mjs` for DOM rendering helpers and panel rendering.

Keep `viewer/js/app.js` responsible for:

- creating state
- loading data
- attaching data to state
- binding events
- calling render functions

Do not redesign the UI in this step. Visual/layout requirements should be clarified with the user before the next full UI pass.

## Expected Boundary After This Step

- `data/`: schema loading and source-specific read helpers
- `state.mjs`: app selection and derived state defaults
- `ui/render.mjs`: DOM write layer and HTML formatting
- `app.js`: browser app orchestration only

## Rollback

Revert the commit for this step to restore the single-file frontend entry.

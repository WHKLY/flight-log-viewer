# Refactor V36 - Workspace Panel Shell

Date: 2026-08-31

## Goal

Build the right-side workspace panel system before implementing Track, HUD, Plot and Inspector.

## Scope

Implement:

- config-driven workspace panel order
- unified panel shell
- panel header
- status tags
- collapse/expand control
- focus placeholder
- reset placeholder
- settings placeholder
- first real `Overview` content panel

Keep existing source, mission, mode, parameter and signal views as legacy data panels inside the new shell.

## Why

The left sidebar already controls panel visibility state. The right side must now become a real panel system so future feature panels do not each invent their own header, collapse behavior and layout rules.

## Design

`ui/config/panels.json` should define:

- panel id
- label
- description
- default collapsed state
- kind
- priority
- status tags

Right workspace render code should create panel shells from config.

## Boundary

Do not implement:

- Track rendering
- 2D/3D views
- HUD redesign
- chart interactions
- formula inspector
- localStorage persistence

## Rollback

Revert this commit to return to the previous static workspace sections controlled only by `data-panel-id`.

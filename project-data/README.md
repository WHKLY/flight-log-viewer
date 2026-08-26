# Project Data

This directory stores project-local reviewer decisions that should survive generated `public-data/` rebuilds.

`mission-overrides.json` is intentionally ignored by git. Use it to override mission source/current sequence by time range when automatic source choice is unreliable, for example after ground-station tlog link loss.

Start from `mission-overrides.example.json` if the local override file is missing.

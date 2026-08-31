# Refactor V29 - UI Backend Domains

Date: 2026-08-31

## Goal

Add two backend-generated domains needed before serious frontend UI work:

- semantic signal availability
- current mission task timeline

Do not add frontend profile selection in this step. Profile selection remains build-time only.

## Problem

The frontend currently needs to inspect low-level structures to answer common UI questions:

- Which raw signal should represent `attitude.roll`?
- Is a semantic role available in this log?
- Which mission task is active at a given time?
- Which mission source should be used for route display versus current task display?

This would push too much source-specific logic into UI code.

## Route

Generate:

- `public-data/domains/semantic_signals.json`
- `public-data/domains/current_tasks.json`

`semantic_signals.json` should be derived from:

- selected compatibility profile `signal_roles`
- decoded DataFlash field catalog
- `signals.json`

It should expose one object per semantic role:

- role id
- candidate raw signals
- available candidate signals
- preferred available signal
- missing candidates
- status

`current_tasks.json` should be derived from normalized mission sources:

- one timeline per mission/current-task source
- each event normalized to `{time_s, seq, command, command_name, source_id, status}`
- source quality/counts for UI selection
- manual-first selection policy

## Boundary

- Backend owns source-specific interpretation and availability checks.
- Frontend owns presentation and user selection.
- Current task timeline is an extracted event stream, not yet a fully inferred mission state machine.

## Rollback

Revert the commit for this step to remove the two new domains and return to direct frontend use of `mission` and `signals`.

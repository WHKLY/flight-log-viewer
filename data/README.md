# Local Data

Raw flight data is kept under `data/raw/` and ignored by git.

Current local dataset:

```text
data/raw/qq-2026-08-17/
```

Typical contents:

- ArduPilot DataFlash `.BIN` logs.
- Mission Planner `.tlog` / `.rlog` telemetry logs.
- Mission Planner/QGC `.waypoints` mission files.
- Aircraft `.param` parameter files.
- Local source-review PDFs or copied field documents.

Data policy:

- Do not commit raw logs by default.
- Do not commit private copied documents by default.
- Generated files under `public-data/` can be rebuilt and are ignored by git.
- If a public sample dataset is ever needed, create a separate reviewed sample package with explicit approval.

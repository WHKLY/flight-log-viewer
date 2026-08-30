"""Parameter source normalization."""

from __future__ import annotations

from typing import Any

from flv.common import is_control_param


def stringify_param_value(value: Any) -> str:
    if isinstance(value, float):
        return f"{value:.9g}"
    return str(value)


def parse_dataflash_params(rows: list[dict[str, Any]], source_id: str) -> tuple[dict[str, str], list[dict[str, Any]]]:
    params: dict[str, str] = {}
    timeline: list[dict[str, Any]] = []
    for row in rows:
        name = str(row.get("Name", "")).strip()
        if not name or "Value" not in row:
            continue
        value = stringify_param_value(row["Value"])
        params[name] = value
        timeline.append(
            {
                "time_s": row.get("time_s"),
                "name": name,
                "value": value,
                "default": stringify_param_value(row["Default"]) if "Default" in row else None,
                "source_id": source_id,
                "source_record": f"PARM.{name}",
                "status": "direct",
            }
        )
    timeline.sort(key=lambda item: (float(item["time_s"]) if isinstance(item.get("time_s"), int | float) else -1.0, str(item.get("name", ""))))
    return params, timeline


def control_subset(params: dict[str, str]) -> dict[str, str]:
    return {key: params[key] for key in sorted(params) if is_control_param(key)}


def build_parameter_domain(file_params: dict[str, str], dataflash_rows: list[dict[str, Any]], source_ids: dict[str, str | None]) -> dict[str, Any]:
    bin_params, timeline = parse_dataflash_params(dataflash_rows, source_ids.get("dataflash_params") or "dataflash_params")
    merged = {**bin_params, **file_params}
    sets = {
        "merged": {
            "label": "Merged: .param over DataFlash",
            "source_id": "parameter_merged",
            "params": merged,
            "control_params": control_subset(merged),
        },
        "param_file": {
            "label": ".param file",
            "source_id": source_ids.get("param_file"),
            "params": file_params,
            "control_params": control_subset(file_params),
        },
        "dataflash_latest": {
            "label": "DataFlash PARM latest",
            "source_id": source_ids.get("dataflash_params"),
            "params": bin_params,
            "control_params": control_subset(bin_params),
        },
    }
    return {
        "selection_modes": ["merged", "param_file", "dataflash_latest", "dataflash_time"],
        "available": {
            "merged": bool(merged),
            "param_file": bool(file_params),
            "dataflash_latest": bool(bin_params),
            "dataflash_time": bool(timeline),
        },
        "precedence": ".param values override DataFlash PARM values only in merged mode",
        "sets": sets,
        "timeline": timeline,
        "counts": {
            "merged": len(merged),
            "param_file": len(file_params),
            "dataflash_latest": len(bin_params),
            "dataflash_records": len(timeline),
            "control_parameters": len(control_subset(merged)),
        },
    }


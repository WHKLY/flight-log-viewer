# Flight Log Viewer

离线 ArduPilot 固定翼日志交互式查看器项目。

首版目标：

- 读取 `.param` 参数文件并提取固定翼控制相关参数。
- 读取 Mission Planner/QGC `.waypoints` 航点文件。
- 生成项目数据摘要 `public-data/dataset-summary.json`。
- 后续接入 `pymavlink` 读取 DataFlash `.BIN` 和 Mission Planner `.tlog`。
- 前端按控制层级展示：Mission/Mode、L1、TECS、姿态/角速度、执行输出。

## Local Layout

```text
data/raw/                       local raw logs, ignored by git
docs/notes/                     project notes
docs/source-review/             ArduPlane control model notes
public-data/                    generated viewer data, ignored by git
scripts/                        local tooling
src/flight_log_viewer/          Python package
viewer/                         static HTML viewer
```

## First Commands

```bash
cd ~/work/projects/python/flight-log-viewer
python3 scripts/summarize_dataset.py
python3 scripts/inspect_logs.py
python3 scripts/extract_dataflash_series.py
```

Then open `viewer/index.html` with a local server later, or inspect:

```bash
cat public-data/dataset-summary.json
cat public-data/log-inspection.json
ls -lh public-data/series
```


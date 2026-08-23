# 平板项目设想：ArduPilot 固定翼日志交互式查看器

日期：2026-08-23

## 目标

在 Termux 平板工作站上做一个以 HTML/Web 前端为主的离线数据查看器，用于读取 ArduPilot 固定翼相关文件：

- DataFlash 日志：`.BIN` / `.log`
- Mission Planner telemetry log：`.tlog`
- 航点文件：Mission Planner/QGC WPL `.waypoints`
- 参数文件：`.param`
- 固定翼控制文档与 ArduPilot 源码

最终界面应支持航迹绘图、时间序列曲线、参数浏览、关键控制参数影响解释，以及三维飞行轨迹和飞机姿态回放。

## 当前样例数据

源目录：

`/data/data/com.termux/files/home/storage/downloads/QQ`

已看到的关键文件：

- `00000073.BIN`
- `2026-08-17 09-43-00.tlog`
- `2026-08-17 09-43-00.rlog`
- `0815_wholetest_reverse.waypoints`
- `0817_0.param`
- `ArduPilot_Plane_4.7_固定翼控制系统总览_PID_TECS_L1_参数与调参指南.pdf`
- `ArduPilot_Plane_4.7_导航航迹制导与任务规划参数源码公式总览.pdf`
- `ArduPilot_Plane_4.7_稳定控制参数与源码公式.pdf`
- `ArduPilot_Plane_4.7_飞行模式控制执行IO与驾驶员飞控权限总览.pdf`

注意：

- `.rlog` 是 Mission Planner 的扩展调试日志，优先级低于 `.tlog` 和 `.BIN`。
- 目录里有带 `(1)` 的重复文件，正式入库前应去重。
- 共享存储目录适合导入，不适合长期开发和编译；建议整理到 Termux 私有工作区。

建议整理位置：

`~/work/datasets/flight-log-viewer/raw/qq-2026-08-17/`

建议项目位置：

`~/work/projects/python/flight-log-viewer`

## 推荐技术路线

优先采用“Python 解析/预处理 + HTML 前端交互查看”的结构。

理由：

- Python 生态里 `pymavlink` 对 ArduPilot DataFlash 和 MAVLink `.tlog` 更成熟，适合先把复杂二进制日志转成稳定的 JSON/Parquet/SQLite。
- HTML 前端适合交互式曲线、地图、三维场景，且平板浏览器即可使用。
- 纯浏览器解析 `.BIN` 和 `.tlog` 可以做，但调试成本更高，尤其在 Termux 平板上不应一开始就把解析、计算、渲染全部压到前端。

初始架构：

- `ingest/`：读取 `.BIN`、`.tlog`、`.waypoints`、`.param`
- `analysis/`：生成派生量，如航迹、姿态、控制误差、模式段、事件标记
- `public-data/`：输出前端可直接加载的 JSON/SQLite/Arrow 数据
- `viewer/`：HTML/JS 交互界面
- `docs/`：记录源码依据、参数解释、控制链路

## GitHub 开源库调研结论

优先参考：

- ArduPilot UAVLogViewer：Web 日志查看器，支持 ArduPilot DataFlash 和 MAVLink telemetry log，并包含 3D flight replay 思路。
- ArduPilot pymavlink：Python 端事实标准，`DFReader.py` 可读 DataFlash，`mavutil` 可读 MAVLink/tlog。
- MAVProxy/MAVExplorer：基于 pymavlink 的日志分析工具，可作为字段命名、交互方式和命令式分析的参考。
- Williangalvani/JsDataflashParser：从 UAVLogViewer 抽出的 JavaScript DataFlash parser，可评估是否能复用到浏览器端。
- DroneKit-LA：C++ 日志静态分析器，适合参考“诊断规则/告警输出”的设计，但不适合作为首版核心依赖。

前端库候选：

- 图表：Plotly.js 或 Apache ECharts。首版建议 Plotly.js，因为缩放、悬停、多曲线叠加、时间轴同步上手快。
- 地图：Leaflet。若只做 2D 航迹和航点叠加，Leaflet 足够轻。
- 3D：Three.js。用局部 ENU 坐标把经纬高转换为米制坐标，加载简单固定翼 glTF/OBJ 模型，按日志 roll/pitch/yaw 更新姿态。
- 数据量较大时：SQLite WASM、DuckDB WASM 或 Apache Arrow 可后续评估；首版先用分段 JSON，避免过早复杂化。

## 固定翼控制层级理解

看板不应只展示曲线，而应围绕 ArduPlane 控制链路组织：

1. 任务/模式层

AUTO 模式从 mission 当前导航命令进入不同控制分支。普通 AUTO 调用 `calc_nav_roll()`、`calc_nav_pitch()`、`calc_throttle()`；起飞和降落有特殊分支。源码入口包括：

- `ArduPlane/mode_auto.cpp`
- `ArduPlane/commands_logic.cpp`
- `ArduPlane/navigation.cpp`

2. 横向制导层

L1 控制把航点路径误差、目标航向、地速等转换为横向加速度需求，再转换为 `nav_roll_cd`。关键参数包括：

- `NAVL1_PERIOD`
- `NAVL1_DAMPING`
- `NAVL1_XTRACK_I`
- `NAVL1_LIM_BANK`

看板应该显示：

- 航迹 vs 航点线段
- cross-track error
- bearing error
- target bearing
- demanded roll vs actual roll
- `NAVL1_PERIOD/DAMPING` 对转弯响应和超调的解释

3. 纵向能量控制层

TECS 管高度、速度、油门、俯仰分配。它不是单纯高度 PID，而是把高度误差和空速误差通过能量思想分配到 pitch 与 throttle。关键参数包括：

- `TECS_TIME_CONST`
- `TECS_THR_DAMP`
- `TECS_INTEG_GAIN`
- `TECS_SPDWEIGHT`
- `TECS_PTCH_DAMP`
- `TECS_RLL2THR`
- `TECS_CLMB_MAX`
- `TECS_SINK_MIN`
- `TECS_SINK_MAX`
- `TECS_PITCH_MAX`
- `TECS_PITCH_MIN`

看板应该显示：

- target altitude vs altitude
- target airspeed vs airspeed/groundspeed
- demanded pitch vs actual pitch
- demanded throttle vs throttle output
- roll angle 与 TECS roll-to-throttle compensation 的关联
- `TECS_SPDWEIGHT` 对“优先保高度还是保速度”的可视化说明

4. 姿态控制层

姿态层把上层给出的 `nav_roll_cd`、`nav_pitch_cd` 转成舵面输出。`Attitude.cpp` 中固定翼主线是：

- 先计算 `speed_scaler`
- `stabilize_roll()` 调用 roll controller
- `stabilize_pitch()` 调用 pitch controller
- `stabilize_yaw()` 做协调转弯/地面转向/偏航阻尼

关键参数包括：

- `RLL2SRV_TCONST`
- `RLL2SRV_RMAX`
- `RLL2SRV_RATE_P/I/D/FF`
- `RLL2SRV_RATE_FLTT/FLTE/FLTD`
- `PTCH2SRV_TCONST`
- `PTCH2SRV_RMAX_UP`
- `PTCH2SRV_RMAX_DN`
- `PTCH2SRV_RLL`
- `PTCH2SRV_RATE_P/I/D/FF`
- `YAW2SRV_DAMP`
- `YAW2SRV_INT`
- `YAW2SRV_RLL`
- `YAW2SRV_SLIP`

看板应该显示：

- demanded roll/pitch/yaw or rate vs actual
- rate target vs gyro rate
- PID 输出分量，如果日志字段存在
- servo output
- airspeed/speed_scaler 对控制量的影响

5. 执行输出层

最终输出到 `SRV_Channel`，包括 aileron、elevator、rudder、throttle、steering。看板需要把输出和控制误差同步显示，避免只看姿态不看执行量。

## 首版功能边界

建议首版只做本地离线查看：

- 导入一个 flight package：`.BIN`、`.tlog`、`.waypoints`、`.param`
- 解析 `.param` 和 `.waypoints`
- 用 `.BIN` 作为主数据源，`.tlog` 作为补充或对照
- 生成 2D 航迹、航点、模式段、基础曲线
- 生成 3D 轨迹和姿态回放原型
- 生成固定翼参数面板：按 L1、TECS、Roll/Pitch/Yaw、Airspeed、Servo 分类

不建议首版做：

- 实时连接飞控
- 完整替代 Mission Planner
- 在线地图强依赖
- 所有日志字段自动解释
- 参数自动调参建议

## 平板 Git 和环境配置操作建议

建议先执行：

```bash
cd ~/work
mkdir -p datasets/flight-log-viewer/raw/qq-2026-08-17
cp -a ~/storage/downloads/QQ/* ~/work/datasets/flight-log-viewer/raw/qq-2026-08-17/
cd ~/work/projects/python
mkdir flight-log-viewer
cd flight-log-viewer
git init
python3 -m venv ~/work/venvs/flight-log-viewer
source ~/work/venvs/flight-log-viewer/bin/activate
python -m pip install --upgrade pip
python -m pip install pymavlink pandas numpy
```

如果要做 HTML 前端，后续再补：

```bash
pkg install nodejs-lts
```

如果坚持无 Node 首版，也可以先用 Python 生成静态 HTML，并用 CDN 或 vendored JS 文件加载 Plotly/Leaflet/Three.js。

## 下一步

正式开始前建议先做一个“数据解码 spike”：

- 读取 `00000073.BIN`，列出所有 message types 和字段
- 读取 `.tlog`，列出 MAVLink message types
- 读取 `.param`，提取固定翼核心参数
- 读取 `.waypoints`，转换为航点表和 GeoJSON
- 输出一个 `dataset-summary.json`

只有确认日志里实际有哪些字段后，再确定前端面板布局。

## 参考链接

- ArduPilot UAVLogViewer: https://github.com/ardupilot/uavlogviewer
- ArduPilot UAVLogViewer docs: https://ardupilot.org/dev/docs/common-uavlogviewer.html
- pymavlink DFReader: https://github.com/ArduPilot/pymavlink/blob/master/DFReader.py
- Mission Planner telemetry logs: https://ardupilot.ardupilot.org/planner/docs/mission-planner-telemetry-logs.html
- ArduPilot log analysis docs: https://github.com/ArduPilot/ardupilot_wiki/blob/master/common/source/docs/common-downloading-and-analyzing-data-logs-in-mission-planner.rst
- MAVExplorer docs: https://ardupilot.org/dev/docs/using-mavexplorer-for-log-analysis.html
- JsDataflashParser: https://github.com/Williangalvani/JsDataflashParser
- DroneKit-LA: https://github.com/dronekit/dronekit-la

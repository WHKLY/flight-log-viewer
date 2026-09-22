(() => {
  "use strict";

  function missionNumber(value) {
    return value === null || value === undefined || value === "" || !Number.isFinite(Number(value)) ? null : Number(value);
  }

  function previousRow(rows, time) {
    if (!Array.isArray(rows) || !rows.length || missionNumber(time) === null) return null;
    let candidate = null;
    for (const row of rows) {
      const rowTime = missionNumber(row?.time_s);
      if (rowTime === null) continue;
      if (rowTime <= time) candidate = row;
      else break;
    }
    return candidate;
  }

  function createModel(options = {}) {
    const sources = Array.isArray(options.missionData?.sources) ? options.missionData.sources : [];
    const currentTaskSources = Array.isArray(options.currentTaskData?.sources) ? options.currentTaskData.sources : [];
    const localOverrideRules = Array.isArray(options.localOverrideRules) ? options.localOverrideRules : [];
    const fileOverrideRules = Array.isArray(options.overrideData?.rules) ? options.overrideData.rules : [];
    const sourceMode = options.sourceMode || "auto";
    const formatNumber = typeof options.formatNumber === "function" ? options.formatNumber : (value) => String(value);
    const commandName = typeof options.commandName === "function" ? options.commandName : (command) => `MAV_CMD_${command ?? "?"}`;
    const validGeo = typeof options.validGeo === "function"
      ? options.validGeo
      : (lat, lon) => Number.isFinite(Number(lat)) && Number.isFinite(Number(lon));

    function sourceKind(source) {
      return String(source?.kind || source?.quality?.kind || "");
    }

    function sourceMatchesId(source, sourceId) {
      if (!source || !sourceId) return false;
      const id = String(source.id || "");
      const wanted = String(sourceId);
      if (id === wanted) return true;
      const kind = sourceKind(source);
      if (wanted === "onboard_cmd") return id.startsWith("onboard_cmd") || kind === "dataflash_cmd" || kind === "logged_route";
      if (wanted === "external_wp") return id.startsWith("external_wp") || kind === "external_waypoints";
      if (wanted === "tlog_mission") return id.startsWith("tlog_mission") || kind === "tlog_mission";
      return false;
    }

    function sourceById(sourceId) {
      return sources.find((source) => sourceMatchesId(source, sourceId)) || null;
    }

    function sourceVersions(source) {
      if (Array.isArray(source?.versions)) return source.versions;
      if (Array.isArray(source?.route_versions)) return source.route_versions;
      return [];
    }

    function sourceItems(source) {
      if (Array.isArray(source?.items) && source.items.length) return source.items;
      const versions = sourceVersions(source);
      for (let index = versions.length - 1; index >= 0; index -= 1) {
        if (Array.isArray(versions[index]?.items) && versions[index].items.length) return versions[index].items;
      }
      return [];
    }

    function versionAt(source, time) {
      const versions = sourceVersions(source);
      if (!versions.length || missionNumber(time) === null) return null;
      let selected = null;
      for (const version of versions) {
        const start = missionNumber(version.start_s) ?? -Infinity;
        const end = missionNumber(version.end_s) ?? Infinity;
        if (time >= start && time < end) selected = version;
        if (start > time) break;
      }
      return selected || versions.find((version) => Array.isArray(version.items) && version.items.length) || null;
    }

    function itemsAt(source, time) {
      const version = versionAt(source, time);
      return Array.isArray(version?.items) && version.items.length ? version.items : sourceItems(source);
    }

    function itemBySeq(source, seq, time) {
      if (!source || missionNumber(seq) === null) return null;
      return itemsAt(source, time).find((item) => Number(item.seq) === Number(seq)) || null;
    }

    function routeKey(source, version, index = 0) {
      const sourceId = source?.id || "summary";
      if (!version) return `${sourceId}:static`;
      const start = missionNumber(version.start_s) !== null ? formatNumber(Number(version.start_s)) : "static";
      const end = missionNumber(version.end_s) !== null ? formatNumber(Number(version.end_s)) : "end";
      const count = Array.isArray(version.items) ? version.items.length : 0;
      return `${sourceId}:v${index}:${start}:${end}:${count}`;
    }

    function routeEntries(source) {
      if (!source) return [];
      const versions = sourceVersions(source);
      if (versions.length) {
        return versions.map((version, index) => ({
          source,
          version,
          index,
          key: routeKey(source, version, index),
          items: Array.isArray(version.items) ? version.items : [],
        }));
      }
      const items = sourceItems(source);
      return items.length ? [{ source, version: null, index: 0, key: routeKey(source, null, 0), items }] : [];
    }

    function routeEntryAt(source, time) {
      const entries = routeEntries(source);
      if (!entries.length) return null;
      const version = versionAt(source, time);
      if (version) return entries.find((entry) => entry.version === version) || entries[0];
      return entries[0];
    }

    function routeLabel(entry) {
      if (!entry) return "route missing";
      const count = Array.isArray(entry.items) ? entry.items.length : 0;
      if (!entry.version) return `static route (${count})`;
      const start = missionNumber(entry.version.start_s) !== null ? `${formatNumber(Number(entry.version.start_s))}s` : "static";
      const end = missionNumber(entry.version.end_s) !== null ? `${formatNumber(Number(entry.version.end_s))}s` : "end";
      return `V${entry.index + 1} ${start}..${end} (${count})`;
    }

    function taskSourceForMission(source) {
      if (!source) return null;
      return currentTaskSources.find((taskSource) => sourceMatchesId(taskSource, source.id)) || null;
    }

    function sourceEvents(source) {
      if (Array.isArray(source?.current_events) && source.current_events.length) return source.current_events;
      const taskSource = taskSourceForMission(source);
      if (Array.isArray(taskSource?.events) && taskSource.events.length) return taskSource.events;
      if (Array.isArray(source?.events) && source.events.length) return source.events;
      return [];
    }

    function sourceHasItems(source) {
      return sourceItems(source).length > 0;
    }

    function isTlogSource(source) {
      const id = String(source?.id || "");
      return id === "tlog_mission" || id.startsWith("tlog_mission") || sourceKind(source) === "tlog_mission";
    }

    function isOnboardSource(source) {
      const id = String(source?.id || "");
      const kind = sourceKind(source);
      return id === "onboard_cmd" || id.startsWith("onboard_cmd") || kind === "dataflash_cmd" || kind === "logged_route";
    }

    function isExternalSource(source) {
      const id = String(source?.id || "");
      return id === "external_wp" || id.startsWith("external_wp") || sourceKind(source) === "external_waypoints";
    }

    function tlogRouteComplete(source) {
      if (!source || !isTlogSource(source) || !sourceHasItems(source)) return false;
      if (!sourceEvents(source).length) return false;
      return source.quality?.route_complete !== false;
    }

    function autoSource() {
      const completeTlog = sources.find((source) => tlogRouteComplete(source));
      const onboard = sources.find((source) => isOnboardSource(source) && sourceHasItems(source));
      const external = sources.find((source) => isExternalSource(source) && sourceHasItems(source));
      const partialTlog = sources.find((source) => isTlogSource(source) && sourceHasItems(source));
      return completeTlog || onboard || external || partialTlog || null;
    }

    function overrideRules() {
      return [...fileOverrideRules, ...localOverrideRules]
        .filter((rule) => Number.isFinite(Number(rule.start_s)) && Number.isFinite(Number(rule.end_s)) && Number(rule.end_s) >= Number(rule.start_s));
    }

    function overrideAt(time) {
      if (missionNumber(time) === null) return null;
      const matches = overrideRules().filter((rule) => time >= Number(rule.start_s) && time <= Number(rule.end_s));
      return matches.length ? matches[matches.length - 1] : null;
    }

    function selectedSource(time) {
      const rule = overrideAt(time);
      if (rule?.source_id) return sourceById(rule.source_id) || autoSource();
      if (sourceMode !== "auto") return sourceById(sourceMode) || autoSource();
      return autoSource();
    }

    function timedRouteItems(source, time) {
      const version = versionAt(source, time);
      const items = Array.isArray(version?.items) ? version.items : [];
      return items.filter((item) => missionNumber(item.time_s) !== null);
    }

    function previousEvent(source, time) {
      const explicitEvents = sourceEvents(source).filter((event) => missionNumber(event.time_s) !== null);
      const events = explicitEvents.length ? explicitEvents : timedRouteItems(source, time);
      return previousRow([...events].sort((a, b) => Number(a.time_s) - Number(b.time_s)), time);
    }

    function infoAt(time, mode) {
      const rule = overrideAt(time);
      const source = selectedSource(time);
      const sourceId = source?.id || "missing";
      const sourceLabel = source?.label || "missing";
      const activeRoute = routeEntryAt(source, time);
      const route = activeRoute ? routeLabel(activeRoute) : "route missing";
      if (!mode || mode.name !== "AUTO") return { status: "missing", label: "not AUTO", detail: "mission inactive", source: sourceLabel, source_id: sourceId, route };
      if (!source) return { status: "missing", label: "no mission source", detail: "missing", source: "missing", source_id: "missing", route };

      let seq = missionNumber(rule?.seq);
      let event = null;
      if (seq === null) {
        event = previousEvent(source, time);
        if (event) seq = missionNumber(event.seq);
      }
      const item = seq === null ? null : itemBySeq(source, seq, time);
      const used = item || event;
      if (!used) {
        return {
          status: sourceHasItems(source) ? "derived" : "missing",
          label: `${sourceLabel}: seq unknown`,
          detail: rule ? `manual source override ${Number(rule.start_s).toFixed(1)}s..${Number(rule.end_s).toFixed(1)}s` : "no timed current item",
          source: sourceLabel,
          source_id: sourceId,
          route,
          seq: null,
        };
      }

      const command = used.command ?? used.CId;
      const commandLabel = used.command_name || commandName(command);
      const lat = used.lat ?? used.Lat;
      const lon = used.lon ?? used.Lng;
      const alt = used.alt ?? used.Alt;
      const age = event?.time_s !== undefined && missionNumber(event.time_s) !== null ? Math.max(0, time - Number(event.time_s)) : null;
      const target = validGeo(Number(lat), Number(lon)) ? `${formatNumber(lat)}, ${formatNumber(lon)}, ${formatNumber(alt)}m` : `alt ${formatNumber(alt)}`;
      const suffix = rule ? "manual override" : sourceMode !== "auto" ? "selected source" : "auto source";
      return {
        status: rule ? "direct" : event ? "direct" : "derived",
        label: `${commandLabel} #${missionNumber(seq) !== null ? Number(seq) : "?"}`,
        detail: `${target}${age !== null ? ` | age ${formatNumber(age)}s` : ""}`,
        planned: `${sourceLabel} | ${suffix}`,
        params: Array.isArray(used.params) ? used.params.map((value, index) => `P${index + 1}=${formatNumber(value)}`).join(" ") : "",
        source: sourceLabel,
        source_id: sourceId,
        route,
        seq,
        override: rule || null,
      };
    }

    return Object.freeze({
      sources,
      source: Object.freeze({ items: sourceItems, hasItems: sourceHasItems }),
      route: Object.freeze({ versionAt, itemsAt, itemBySeq, entries: routeEntries, at: routeEntryAt, label: routeLabel }),
      selection: Object.freeze({ auto: autoSource, rules: overrideRules, overrideAt, sourceAt: selectedSource }),
      taskAt: infoAt,
      currentSeqAt: (time, mode) => missionNumber(infoAt(time, mode).seq),
    });
  }

  const api = Object.freeze({ createModel, missionNumber, previousRow });
  const root = typeof window !== "undefined" ? window : globalThis;
  root.MissionPlayback = api;
  if (typeof globalThis !== "undefined") globalThis.MissionPlayback = api;
})();

import { missionSourceById, missionSources } from "./sources.mjs";

function finite(value) {
  return Number.isFinite(Number(value));
}

export function routeVersionAt(source, time) {
  const versions = Array.isArray(source?.route_versions) ? source.route_versions : [];
  if (!versions.length) return null;
  if (!finite(time)) return versions[versions.length - 1];
  return versions.find((version) => {
    const start = finite(version.start_s) ? Number(version.start_s) : -Infinity;
    const end = finite(version.end_s) ? Number(version.end_s) : Infinity;
    return Number(time) >= start && Number(time) <= end;
  }) || versions[versions.length - 1];
}

export function routeItemsAt(source, time) {
  const version = routeVersionAt(source, time);
  if (Array.isArray(version?.items) && version.items.length) return version.items;
  return Array.isArray(source?.items) ? source.items : [];
}

export function currentEventAt(source, time) {
  const events = Array.isArray(source?.current_events) ? source.current_events : [];
  if (!events.length) return null;
  if (!finite(time)) return events[events.length - 1];
  let selected = null;
  for (const event of events) {
    if (!finite(event.time_s)) continue;
    if (Number(event.time_s) <= Number(time)) selected = event;
    else break;
  }
  return selected;
}

export function missionSummary(data, sourceId, time) {
  const source = missionSourceById(data, sourceId);
  const routeItems = routeItemsAt(source, time);
  const current = currentEventAt(source, time);
  return {
    source,
    routeItems,
    current,
    currentSeq: current?.seq ?? null,
    status: source ? "direct" : "missing",
  };
}

export function missionSourceOptions(data) {
  return missionSources(data).map((source) => ({
    id: source.id,
    label: source.label || source.id,
    disabled: false,
  }));
}


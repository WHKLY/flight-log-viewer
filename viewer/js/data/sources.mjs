export function sourceRegistryList(data) {
  return Object.values(data?.sources?.sources || {});
}

export function sourceById(data, sourceId) {
  if (!sourceId) return null;
  return data?.sources?.sources?.[sourceId] || null;
}

export function missionSources(data) {
  return Array.isArray(data?.mission?.sources) ? data.mission.sources : [];
}

export function missionSourceById(data, sourceId) {
  return missionSources(data).find((source) => source.id === sourceId) || null;
}

export function firstUsefulMissionSource(data) {
  const sources = missionSources(data);
  return sources.find((source) => source.quality?.item_count > 0 || source.items?.length > 0) || sources[0] || null;
}

export function defaultMissionSourceId(data) {
  return firstUsefulMissionSource(data)?.id || "";
}

export function sourceLabel(source) {
  return source?.label || source?.id || "missing";
}

export function buildInitialSelection(data, previous = {}) {
  const defaultMission = defaultMissionSourceId(data);
  const parameterModes = data?.parameters?.selection_modes || [];
  const parameterAvailable = data?.parameters?.available || {};
  const previousParameter = previous.parameterSource || "merged";
  const parameterSource = parameterModes.includes(previousParameter) && parameterAvailable[previousParameter]
    ? previousParameter
    : parameterModes.find((mode) => parameterAvailable[mode]) || "merged";
  return {
    routeSource: previous.routeSource || defaultMission,
    currentSource: previous.currentSource || defaultMission,
    parameterSource,
  };
}

export function selectionReadout(selection) {
  return `route=${selection.routeSource || "missing"} | current=${selection.currentSource || "missing"} | params=${selection.parameterSource || "missing"}`;
}


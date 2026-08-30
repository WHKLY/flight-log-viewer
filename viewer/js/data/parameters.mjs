function finite(value) {
  return Number.isFinite(Number(value));
}

export function parameterModes(data) {
  const parameters = data?.parameters || {};
  return (parameters.selection_modes || []).map((mode) => ({
    id: mode,
    label: mode,
    disabled: !parameters.available?.[mode],
  }));
}

export function selectedParameterSet(data, mode) {
  const parameters = data?.parameters || {};
  const effective = mode === "dataflash_time" ? "dataflash_latest" : mode;
  return parameters.sets?.[effective] || parameters.sets?.merged || { params: {}, control_params: {} };
}

export function dataflashParameterAt(data, name, time) {
  const timeline = data?.parameters?.timeline || [];
  if (!name || !timeline.length) return null;
  let selected = null;
  for (const item of timeline) {
    if (item.name !== name) continue;
    if (!finite(time) || !finite(item.time_s) || Number(item.time_s) <= Number(time)) {
      selected = item;
      if (finite(time) && finite(item.time_s) && Number(item.time_s) > Number(time)) break;
    }
  }
  return selected;
}

export function resolveParameter(data, name, mode = "merged", time = null) {
  if (mode === "dataflash_time") {
    const timed = dataflashParameterAt(data, name, time);
    return timed ? { ...timed, status: "direct" } : { name, value: null, status: "missing", source_id: null };
  }
  const set = selectedParameterSet(data, mode);
  if (Object.prototype.hasOwnProperty.call(set.params || {}, name)) {
    return {
      name,
      value: set.params[name],
      source_id: set.source_id || null,
      status: "direct",
    };
  }
  return { name, value: null, source_id: set.source_id || null, status: "missing" };
}

export function parameterSample(data, mode, limit = 18) {
  const set = selectedParameterSet(data, mode);
  return Object.entries(set.control_params || set.params || {}).slice(0, limit);
}


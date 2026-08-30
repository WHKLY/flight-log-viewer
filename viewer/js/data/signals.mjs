export function signalList(data) {
  return Object.values(data?.signals?.signals || {});
}

export function numericSignals(data) {
  return signalList(data).filter((signal) => signal.numeric);
}

export function signalById(data, signalId) {
  return data?.signals?.signals?.[signalId] || null;
}

export function signalsForMessage(data, message) {
  return signalList(data).filter((signal) => signal.message === message);
}

export function signalSummary(data) {
  const all = signalList(data);
  const numeric = all.filter((signal) => signal.numeric);
  return {
    total: all.length,
    numeric: numeric.length,
    text: all.length - numeric.length,
  };
}


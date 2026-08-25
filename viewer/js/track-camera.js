(() => {
  "use strict";

  const DEFAULT_PITCH = -0.55;
  const LOCKED_MIN_PITCH = -1.45;
  const LOCKED_MAX_PITCH = -0.08;

  function finite(value) {
    return Number.isFinite(Number(value));
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function constrainPitch(pitch, overheadLock) {
    const value = finite(pitch) ? Number(pitch) : DEFAULT_PITCH;
    return overheadLock ? clamp(value, LOCKED_MIN_PITCH, LOCKED_MAX_PITCH) : value;
  }

  function snapLockedPitch(pitch) {
    return Math.min(constrainPitch(pitch, true), DEFAULT_PITCH);
  }

  function normalizeAngle(angle) {
    if (!finite(angle)) return 0;
    let value = ((Number(angle) + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (value < -Math.PI) value += Math.PI * 2;
    return value;
  }

  function viewModeLabel(mode) {
    if (mode === "fixed-los") return "fixed LOS follow";
    if (mode === "aircraft-relative") return "aircraft-relative follow";
    if (mode === "track-vector") return "track-vector follow";
    return "free view";
  }

  function yawFromAttitude(row) {
    const yaw = Number(row?.Yaw);
    return finite(yaw) ? (yaw * Math.PI) / 180 : null;
  }

  function trackCourseAt(points, markerTime) {
    if (!Array.isArray(points) || points.length < 2 || !finite(markerTime)) return null;
    let nearestIndex = 0;
    let nearestDistance = Infinity;
    points.forEach((point, index) => {
      const distance = Math.abs(Number(point.time_s) - Number(markerTime));
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    const prev = points[Math.max(0, nearestIndex - 1)];
    const next = points[Math.min(points.length - 1, nearestIndex + 1)];
    if (!prev || !next || prev === next) return null;
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    if (Math.hypot(dx, dy) < 1e-6) return null;
    return Math.atan2(dx, dy);
  }

  window.TrackCamera = {
    DEFAULT_PITCH,
    LOCKED_MIN_PITCH,
    LOCKED_MAX_PITCH,
    constrainPitch,
    snapLockedPitch,
    normalizeAngle,
    viewModeLabel,
    yawFromAttitude,
    trackCourseAt,
  };
})();

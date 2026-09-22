(() => {
  "use strict";

  function finite(value) {
    return value !== null && value !== "" && typeof value !== "boolean" && Number.isFinite(Number(value));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function create(options = {}) {
    const getBounds = typeof options.getBounds === "function"
      ? options.getBounds
      : () => ({ start: 0, end: 1 });
    const getFallbackTime = typeof options.getFallbackTime === "function"
      ? options.getFallbackTime
      : (bounds) => bounds.end;
    const onTime = typeof options.onTime === "function" ? options.onTime : () => {};
    const onState = typeof options.onState === "function" ? options.onState : () => {};
    const root = typeof window !== "undefined" ? window : globalThis;

    let selectedTime = null;
    let playing = false;
    let speed = 1;
    let lastFrameMs = null;
    let frameHandle = null;

    function bounds() {
      const value = getBounds() || {};
      const start = finite(value.start) ? Number(value.start) : 0;
      const requestedEnd = finite(value.end) ? Number(value.end) : start + 1;
      return { start, end: Math.max(start, requestedEnd) };
    }

    function time() {
      const range = bounds();
      const fallback = finite(getFallbackTime(range)) ? Number(getFallbackTime(range)) : range.start;
      return clamp(finite(selectedTime) ? Number(selectedTime) : fallback, range.start, range.end);
    }

    function snapshot() {
      return Object.freeze({ time: time(), playing, speed, bounds: bounds() });
    }

    function notifyState(reason) {
      onState(snapshot(), reason);
    }

    function setTime(value, reason = "set-time") {
      const range = bounds();
      const next = finite(value) ? Number(value) : time();
      selectedTime = clamp(next, range.start, range.end);
      const valueSnapshot = snapshot();
      onTime(valueSnapshot, reason);
      notifyState(reason);
      return valueSnapshot.time;
    }

    function requestNextFrame() {
      if (typeof root.requestAnimationFrame !== "function") return null;
      return root.requestAnimationFrame(tick);
    }

    function cancelScheduledFrame() {
      if (frameHandle !== null && typeof root.cancelAnimationFrame === "function") {
        root.cancelAnimationFrame(frameHandle);
      }
      frameHandle = null;
    }

    function pause(reason = "pause") {
      playing = false;
      lastFrameMs = null;
      cancelScheduledFrame();
      notifyState(reason);
    }

    function tick(nowMs) {
      if (!playing) return;
      const range = bounds();
      if (lastFrameMs === null) {
        lastFrameMs = Number(nowMs);
        frameHandle = requestNextFrame();
        return;
      }
      const last = lastFrameMs;
      const elapsed = Math.max(0, (Number(nowMs) - Number(last)) / 1000) * speed;
      lastFrameMs = Number(nowMs);
      const next = time() + elapsed;
      if (next >= range.end) {
        selectedTime = range.end;
        playing = false;
        lastFrameMs = null;
        frameHandle = null;
        onTime(snapshot(), "ended");
        notifyState("ended");
        return;
      }
      selectedTime = next;
      onTime(snapshot(), "frame");
      frameHandle = requestNextFrame();
    }

    function play() {
      const range = bounds();
      if (time() >= range.end) selectedTime = range.start;
      if (playing) return;
      playing = true;
      lastFrameMs = null;
      cancelScheduledFrame();
      frameHandle = requestNextFrame();
      notifyState("play");
    }

    function toggle() {
      if (playing) pause();
      else play();
    }

    function setSpeed(value) {
      const next = Number(value);
      if (!Number.isFinite(next) || next <= 0) return speed;
      speed = next;
      notifyState("speed");
      return speed;
    }

    function reset(value = null) {
      pause("reset");
      selectedTime = finite(value) ? Number(value) : null;
      notifyState("reset");
    }

    return Object.freeze({ bounds, time, snapshot, setTime, play, pause, toggle, setSpeed, tick, reset });
  }

  const api = Object.freeze({ create });
  const root = typeof window !== "undefined" ? window : globalThis;
  root.PlaybackController = api;
  if (typeof globalThis !== "undefined") globalThis.PlaybackController = api;
})();

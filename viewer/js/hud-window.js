(() => {
  "use strict";

  const channelName = "flight-log-viewer-hud";
  const channel = typeof BroadcastChannel === "function" ? new BroadcastChannel(channelName) : null;
  const canvas = document.querySelector("#hud-canvas");
  const toggle = document.querySelector("#hud-playback-toggle");
  const status = document.querySelector("#hud-status");

  function send(message) {
    if (channel) channel.postMessage(message);
    else if (window.opener && !window.opener.closed) window.opener.postMessage(message, window.location.origin);
  }

  function render(snapshot) {
    if (!snapshot) return;
    window.TrackHud?.draw(canvas, snapshot.values || {});
    const playback = snapshot.playback || {};
    toggle.textContent = playback.playing ? "Pause" : "Play";
    toggle.classList.toggle("active", !!playback.playing);
    const time = Number(playback.time);
    status.textContent = Number.isFinite(time) ? `${time.toFixed(3)}s · ${playback.speed || 1}x` : "时间未知";
  }

  function receive(data) {
    if (data?.type === "hud-snapshot") render(data.snapshot);
  }

  channel?.addEventListener("message", (event) => receive(event.data));
  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin) return;
    receive(event.data);
  });
  window.addEventListener("resize", () => send({ type: "hud-request" }));
  toggle.addEventListener("click", () => send({ type: "playback-command", command: "toggle" }));
  send({ type: "hud-request" });
})();

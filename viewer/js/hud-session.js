(() => {
  "use strict";

  function create(options = {}) {
    const root = typeof window !== "undefined" ? window : globalThis;
    const channelName = options.channelName || "flight-log-viewer-hud";
    const onCommand = typeof options.onCommand === "function" ? options.onCommand : () => {};
    const channel = typeof root.BroadcastChannel === "function" ? new root.BroadcastChannel(channelName) : null;
    let popup = null;
    let lastSnapshot = null;

    function send(message) {
      if (channel) {
        channel.postMessage(message);
      } else if (popup && !popup.closed && typeof popup.postMessage === "function") {
        popup.postMessage(message, root.location?.origin || "*");
      }
    }

    function publish(snapshot) {
      lastSnapshot = snapshot;
      send({ type: "hud-snapshot", snapshot });
    }

    function receive(data) {
      if (!data || typeof data !== "object") return;
      if (data.type === "hud-request") {
        if (lastSnapshot) send({ type: "hud-snapshot", snapshot: lastSnapshot });
      } else if (data.type === "playback-command") {
        onCommand(data.command, data.value);
      }
    }

    channel?.addEventListener("message", (event) => receive(event.data));
    if (typeof root.addEventListener === "function") {
      root.addEventListener("message", (event) => {
        if (root.location?.origin && event.origin !== root.location.origin) return;
        receive(event.data);
      });
    }

    function open(url = "hud.html") {
      if (popup && !popup.closed) {
        popup.focus();
        if (lastSnapshot) publish(lastSnapshot);
        return true;
      }
      if (typeof root.open !== "function") return false;
      popup = root.open(url, "flight-log-hud", "popup=yes,width=520,height=680,resizable=yes");
      if (!popup) return false;
      root.setTimeout?.(() => {
        if (lastSnapshot) publish(lastSnapshot);
      }, 120);
      return true;
    }

    function isOpen() {
      return !!popup && !popup.closed;
    }

    function close() {
      if (popup && !popup.closed) popup.close();
      popup = null;
    }

    return Object.freeze({ publish, open, isOpen, close });
  }

  const api = Object.freeze({ create });
  const root = typeof window !== "undefined" ? window : globalThis;
  root.HudSession = api;
  if (typeof globalThis !== "undefined") globalThis.HudSession = api;
})();

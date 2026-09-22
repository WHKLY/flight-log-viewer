import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync("viewer/js/hud-session.js", "utf8");

function loadWindow({ withChannel }) {
  const channels = [];
  const popupMessages = [];
  const popup = {
    closed: false,
    focus() {},
    close() { this.closed = true; },
    postMessage(message) { popupMessages.push(message); },
  };
  class FakeBroadcastChannel {
    constructor() {
      this.messages = [];
      this.listeners = [];
      channels.push(this);
    }
    addEventListener(_name, listener) { this.listeners.push(listener); }
    postMessage(message) { this.messages.push(message); }
  }
  const fakeWindow = {
    location: { origin: "http://127.0.0.1:8000" },
    addEventListener() {},
    open: () => popup,
    setTimeout: (callback) => callback(),
  };
  if (withChannel) fakeWindow.BroadcastChannel = FakeBroadcastChannel;
  const context = vm.createContext({ window: fakeWindow, globalThis: {} });
  vm.runInContext(source, context, { filename: "hud-session.js" });
  return { api: fakeWindow.HudSession, channels, popup, popupMessages };
}

{
  const fixture = loadWindow({ withChannel: true });
  let commands = 0;
  const session = fixture.api.create({ onCommand: () => { commands += 1; } });
  session.open("hud.html");
  session.publish({ playback: { time: 12 } });
  assert.ok(fixture.channels[0].messages.length >= 1, "BroadcastChannel receives snapshots");
  assert.equal(fixture.popupMessages.length, 0, "postMessage fallback is not duplicated when BroadcastChannel exists");
  fixture.channels[0].listeners[0]({ data: { type: "playback-command", command: "toggle" } });
  assert.equal(commands, 1, "one HUD command produces one controller command");
}

{
  const fixture = loadWindow({ withChannel: false });
  const session = fixture.api.create();
  session.open("hud.html");
  session.publish({ playback: { time: 15 } });
  assert.ok(fixture.popupMessages.length >= 1, "postMessage carries snapshots when BroadcastChannel is unavailable");
}

console.log("PASS: HUD uses one transport and retains the postMessage fallback");

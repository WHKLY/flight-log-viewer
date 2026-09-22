import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

// Execute the viewer's own functions; no duplicated route-selection algorithm.
const html = readFileSync(new URL("../viewer/index.html", import.meta.url), "utf8");
const missionPlaybackScript = readFileSync(new URL("../viewer/js/mission-playback.js", import.meta.url), "utf8");
const inline = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const context = vm.createContext({ window: {}, assert, console });
vm.runInContext(missionPlaybackScript, context);
vm.runInContext(inline.slice(0, inline.lastIndexOf("      main().catch")), context);
vm.runInContext(`
  const item = (seq, time_s, lat) => ({ seq, time_s, command: 16, lat, lon: 120, alt: 50 });
  const first = { start_s: 100, end_s: 200, items: [item(1, 110, 30), item(16, 190, 31)] };
  const second = { start_s: 200, end_s: null, items: [item(1, 201, 32), item(6, 230, 33)] };
  const source = { id: 'onboard_cmd_test', kind: 'dataflash_cmd', label: 'CMD', route_versions: [first, second] };
  missionSourceData = { sources: [source] };
  modeData = { segments: [{ name: 'AUTO', start_s: 100, end_s: 300 }] };
  state.fullRange = state.range = { start: 100, end: 300 };
  assert.equal(missionVersionAt(source, 199.999999), first);
  assert.equal(missionVersionAt(source, 200), second);
  assert.equal(missionVersionAt(source, 299), second);
  assert.equal(currentNavigationSeq(199), 16);
  assert.equal(currentNavigationSeq(201), 1);
  assert.equal(currentNavigationSeq(240), 6);
  assert.match(missionRouteLabel(missionRouteEntryAt(source, 240)), /end/);
  assert.equal(missionItemBySeq(source, 1, 199).lat, 30);
  assert.equal(missionItemBySeq(source, 1, 201).lat, 32);
  delete second.end_s;
  assert.equal(missionVersionAt(source, 240), second);
  second.end_s = null;
  assert.equal(missionVersionAt({ versions: [first, second] }, 240), second);
  const staticVersion = { start_s: null, end_s: null, items: [item(1, null, 30)] };
  assert.equal(missionVersionAt({ versions: [staticVersion] }, 0), staticVersion);
  assert.equal(missionItemBySeq(source, null, 240), null);
  assert.equal(currentNavigationSeq(200), null);
  state.localMissionOverrideRules = [{ start_s: 200, end_s: 300, source_id: source.id, seq: null }];
  assert.equal(currentNavigationSeq(240), 6, 'source-only override must not force seq zero');
  state.localMissionOverrideRules = [];
  const entries = missionRouteEntries(source);
  state.missionRouteViewMode = 'all';
  assert.equal(activeMissionWaypointRows(240).length, 4);
  state.highlightedWaypointIndex = 1;
  state.highlightedWaypointRouteKey = entries[1].key;
  assert.equal(activeMissionWaypointRows(240).filter(waypointHighlightMatches).length, 1);
  state.missionRouteVisibility[entries[1].key] = 'hide';
  assert.equal(activeMissionWaypointRows(240).length, 2);
  state.missionRouteViewMode = 'current';
  assert.equal(activeMissionWaypointRows(240).length, 0);
  state.missionRouteVisibility = {};

  // ArduPilot 4.7 logs CMD as one route snapshot, while MISE carries runtime progress.
  // Explicit events must win over the snapshot item timestamps or seq 14 stays selected.
  const v47Items = [
    item(1, 593.014949, 30),
    item(10, 593.015044, 31),
    { ...item(14, 593.015074, 32), command: 21 },
  ];
  const v47Source = {
    id: 'onboard_cmd',
    kind: 'logged_route',
    label: 'DataFlash CMD accepted mission',
    items: v47Items,
    versions: [{ start_s: 593.014949, end_s: null, items: v47Items }],
    events: [
      { time_s: 650.933923, seq: 1, command: 22 },
      { time_s: 684.394731, seq: 10, command: 16 },
      { time_s: 711.994863, seq: 14, command: 21 },
    ],
  };
  missionSourceData = { sources: [v47Source] };
  modeData = { segments: [{ name: 'AUTO', start_s: 640, end_s: 730 }] };
  assert.equal(currentNavigationSeq(651.933975), 1);
  assert.equal(currentNavigationSeq(684.8839545), 10);
  assert.equal(currentNavigationSeq(717.833934), 14);
  assert.equal(missionInfoAt(684.8839545).label, 'NAV_WAYPOINT #10');

  // Keep accepting the old source.events shape used for CMD-derived progress.
  v47Source.events = [
    { time_s: 650, seq: 1, command: 22 },
    { time_s: 680, seq: 10, command: 16 },
  ];
  assert.equal(currentNavigationSeq(681), 10);

  missionSourceData = { sources: [source] };
  modeData = { segments: [{ name: 'AUTO', start_s: 100, end_s: 300 }] };

  // Exercise the actual playback step and chart-route synchronization.
  let refreshes = 0;
  const config2d = { type: 'track' }, config3d = { type: 'track3d' };
  renderInspector = () => {};
  updateTrackControls = () => {};
  renderAllCharts = () => { refreshes++; syncTrackMissionRoute(config2d); syncTrackMissionRoute(config3d); };
  globalThis.requestAnimationFrame = () => 1;
  globalThis.cancelAnimationFrame = () => {};
  state.trackMarkerTime = 199.9;
  state.trackPlaybackSpeed = 1;
  state.missionRouteViewMode = 'all';
  startTrackPlayback();
  state.trackPlaybackLastMs = 1000;
  trackPlaybackStep(1200);
  assert.equal(state.missionRouteViewMode, 'current');
  assert.equal(missionRouteEntryAt(source, trackMarkerTime()).index, 1);
  assert.equal(config2d.activeRouteKey, entries[1].key);
  assert.equal(config3d.activeRouteKey, entries[1].key);
  assert.ok(config2d.waypointRows.every(row => row._routeActive && row._routeKey === entries[1].key));
  assert.equal(refreshes, 1, 'one render per playback frame');
  assert.equal(state.inspectorTime, state.trackMarkerTime);
  setTrackMarkerTime(199);
  assert.equal(config2d.activeRouteKey, entries[0].key);
  stopTrackPlayback();
`, context);
console.log("PASS: route versions, legacy schema, explicit event priority, current seq, route visibility, playback and reverse seek");

if (process.argv.includes("--sample")) {
  for (const [key, path] of Object.entries({
    sampleMission: "domains/mission.json", sampleTasks: "domains/current_tasks.json", sampleModes: "series/modes.json",
  })) context[key] = JSON.parse(readFileSync(new URL(`../public-data/${path}`, import.meta.url), "utf8"));
  vm.runInContext(`
    missionSourceData = sampleMission; currentTaskData = sampleTasks; modeData = sampleModes;
    const selected = selectedMissionSource(560);
    assert.equal(missionRouteEntryAt(selected, 526.282928).index, 0);
    assert.equal(missionRouteEntryAt(selected, 526.282929).index, 1);
    for (const [time, seq] of [[530, 1], [560, 6], [590, 11]]) {
      assert.equal(activeMissionWaypointRows(time).length, 11);
      assert.equal(currentNavigationSeq(time), seq);
    }
  `, context);
  console.log("PASS: August 26 sample switches at 526.282929s; route 2 seq 1/6/11 at 530/560/590s");
}

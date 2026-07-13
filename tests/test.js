const { boot } = require('./harness.js');
let pass=0, fail=0; const fails=[];
const t = (name, fn) => {
  try { fn(); pass++; console.log(`  ✓ ${name}`); }
  catch(e){ fail++; fails.push([name,e.message]); console.log(`  ✗ ${name}\n      ${e.message}`); }
};
const eq = (a,b,m="") => { if(JSON.stringify(a)!==JSON.stringify(b)) throw new Error(`${m} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
const ok = (c,m) => { if(!c) throw new Error(m||"expected truthy"); };

// run app for `secs` of wall time, ticking every 250ms like the real interval
const run = (secs) => { for(let i=0;i<secs*10;i++){ __clock.advance(100); __tick(); } };

console.log("\n=== ENGINE ===");

t("default session is 3 segments summing to 60 min", () => {
  const {app} = boot();
  eq(app.segs.map(s=>s.sec), [1200,1800,600]);
  eq(app.totalSec(), 3600);
});

t("start sets endsAt to first segment", () => {
  const {app} = boot();
  app.toggle();
  ok(app.running, "should be running");
  eq(app.left, 1200, "left");
  eq(app.endsAt - Date.now(), 1200*1000, "endsAt offset");
});

t("clock advances in real time", () => {
  const {app} = boot();
  app.toggle(); run(60);
  eq(app.left, 1140, "after 60s of a 1200s segment");
});

t("segment boundary advances and beeps once", () => {
  const {app} = boot();
  app.segs = [{id:1,name:"a",sec:60},{id:2,name:"b",sec:60}];
  app.reset(); app.toggle();
  run(60);
  eq(app.active, 1, "moved to segment 2");
  eq(app.left, 60, "full second segment");
});

t("final segment completes and stops", () => {
  const {app} = boot();
  app.segs = [{id:1,name:"a",sec:60}];
  app.reset(); app.toggle();
  run(61);
  ok(app.done, "done");
  ok(!app.running, "stopped");
  eq(app.left, 0);
});

t("SUSPENDED TAB: sleeping past one boundary lands correctly", () => {
  const {app} = boot();
  app.segs = [{id:1,name:"a",sec:60},{id:2,name:"b",sec:60},{id:3,name:"c",sec:60}];
  app.reset(); app.toggle();
  run(40);                       // 20s into segment 1
  __clock.advance(45000);        // tab frozen 45s -> crosses boundary
  app.sync();
  eq(app.active, 1, "should be on segment 2");
  eq(app.left, 35, "25s consumed of segment 2");
});

t("SUSPENDED TAB: sleeping past ALL boundaries finishes, not drifts", () => {
  const {app} = boot();
  app.segs = [{id:1,name:"a",sec:60},{id:2,name:"b",sec:60},{id:3,name:"c",sec:60}];
  app.reset(); app.toggle();
  const t0 = Date.now();
  __clock.advance(200000);       // 200s > 180s total
  app.sync();
  ok(app.done, "session should be complete");
  ok(!app.running, "should have stopped");
  ok(Date.now()-t0 >= 180000, "no drift");
});

t("pause banks remaining time; resume does not lose it", () => {
  const {app} = boot();
  app.toggle(); run(100);
  const before = app.left;
  app.toggle();                  // pause
  ok(!app.running); eq(app.endsAt, null, "endsAt cleared on pause");
  __clock.advance(500000);       // half a day passes while paused
  app.toggle();                  // resume
  eq(app.left, before, "left unchanged across pause");
  ok(app.running);
});

t("skip moves on and re-anchors endsAt", () => {
  const {app} = boot();
  app.toggle(); run(10);
  app.skip();
  eq(app.active, 1);
  eq(app.left, 1800, "segment 2 is 30 min");
  eq(app.endsAt - Date.now(), 1800*1000, "endsAt re-anchored");
});

t("skip does nothing when not running", () => {
  const {app} = boot();
  app.skip();
  eq(app.active, 0);
});

t("reset clears everything", () => {
  const {app} = boot();
  app.toggle(); run(200); app.skip(); app.reset();
  eq(app.active,0); eq(app.left,1200); ok(!app.running); ok(!app.done);
  eq(app.endsAt, null);
  eq(__timers(), 0, "interval cleared");
});

t("toggle on a done session RESTARTS it (Run again)", () => {
  const {app} = boot();
  app.segs=[{id:1,name:"a",sec:60}]; app.reset(); app.toggle(); run(61);
  ok(app.done);
  app.toggle();
  ok(app.running, "Run again should start");
  ok(!app.done);
  eq(app.left, 60, "from the top");
});

console.log("\n=== SESSION IS DERIVED ===");

t("totalSec = sum of segments (seconds)", () => {
  const {app} = boot();
  app.segs = [{id:1,name:"a",sec:300},{id:2,name:"b",sec:420}];
  eq(app.totalSec(), 720);   // 5min + 7min
});

t("total is not persisted", () => {
  const {app, store} = boot();
  app.savePresets();
  const saved = JSON.parse(store["timgo"] || '{"segs":[]}');
  ok(!("total" in saved), "working state should not store total");
});

console.log("\n=== PRESET GUARD ===");

t("loading a preset while running opens the styled dialog", () => {
  const {app,nodes} = boot();
  app.presets = [{id:"p1",name:"X",hue:0,segs:[{name:"s",sec:300}]}];
  app.toggle(); run(120);
  app.applyPreset("p1");
  eq(nodes.csheet.hidden, false, "dialog should be open");
  ok(nodes.cmsg.textContent.includes("in progress"), nodes.cmsg.textContent);
  nodes.ccancel.click();
  eq(nodes.csheet.hidden, true);
  eq(app.segs.length, 3, "segments unchanged after declining");
  ok(app.running, "timer still running");
});

t("accepting the dialog replaces the session", () => {
  const {app,nodes} = boot();
  app.presets = [{id:"p1",name:"X",hue:0,segs:[{name:"s",sec:300}]}];
  app.toggle(); run(120);
  app.applyPreset("p1");
  nodes.cok.click();
  eq(app.segs.length, 1, "preset loaded");
  ok(!app.running, "reset stopped it");
});

t("loading at rest does NOT prompt", () => {
  const {app,nodes} = boot();
  app.presets = [{id:"p1",name:"X",hue:0,segs:[{name:"s",sec:300}]}];
  app.applyPreset("p1");
  eq(nodes.csheet.hidden, true, "no dialog when idle");
  eq(app.segs.length, 1);
});

t("dialog message reports elapsed time", () => {
  const {app,nodes} = boot();
  app.presets = [{id:"p1",name:"X",hue:0,segs:[{name:"s",sec:300}]}];
  app.toggle(); run(90);
  app.applyPreset("p1");
  ok(/01:30/.test(nodes.cmsg.textContent), `message: ${nodes.cmsg.textContent}`);
  nodes.ccancel.click();
});

console.log("\n=== NOTIFICATION SAFETY ===");

t("boots with Notification absent", () => {
  const {app} = boot({notification:false});
  ok(app.segs.length===3);
});

t("Start works with Notification absent", () => {
  const {nodes,app} = boot({notification:false});
  nodes.go.click();
  ok(app.running, "should start");
});

t("notify() throws nothing when hidden and Notification absent", () => {
  const {app} = boot({notification:false});
  document.visibilityState = "hidden";
  app.notify("x");
});

t("notify fires when hidden and permitted", () => {
  const {app} = boot({notification:true});
  document.visibilityState = "hidden";
  __notifications.length = 0;
  app.notify("Branch 2");
  eq(__notifications, ["Branch 2"]);
});

t("notify suppressed when visible", () => {
  const {app} = boot({notification:true});
  document.visibilityState = "visible";
  __notifications.length = 0;
  app.notify("Branch 2");
  eq(__notifications, []);
});

console.log("\n=== PERSISTENCE ===");

t("corrupt localStorage falls back to defaults", () => {
  const {app} = boot({storage:{ "timgo":"{{{not json", "timgo.presets":"???", "timgo.seeded":"1" }});
  eq(app.segs.length, 3);
  eq(app.presets, []);
});

t("presets array of wrong type is rejected", () => {
  const {app} = boot({storage:{ "timgo.presets": String.raw`{"not":"an array"}`, "timgo.seeded":"1" }});
  eq(app.presets, []);
});

t("old preset without fav still loads", () => {
  const {app} = boot({storage:{ "timgo.presets": String.raw`[{"id":"a","name":"Old","total":5,"segs":[{"name":"s","min":5}]}]` }});
  eq(app.presets.length, 1);
  ok(!app.presets[0].fav, "fav undefined is falsy");
});

console.log(`\n${"=".repeat(46)}\n${pass} passed, ${fail} failed`);
if(fail) { console.log("\nFAILURES:"); fails.forEach(([n,m])=>console.log(` • ${n}\n   ${m}`)); process.exit(1); }

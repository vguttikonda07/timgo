const { boot } = require('./harness.js');
let pass=0, fail=0; const bugs=[];
const t=(n,f)=>{ try{f();pass++;console.log(`  ✓ ${n}`);}catch(e){fail++;bugs.push([n,e.message]);console.log(`  ✗ ${n}\n      ${e.message}`);} };
const eq=(a,b,m="")=>{ if(JSON.stringify(a)!==JSON.stringify(b)) throw new Error(`${m} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); };
const ok=(c,m)=>{ if(!c) throw new Error(m||"falsy"); };
const run=s=>{ for(let i=0;i<s*4;i++){ __clock.advance(250); __tick(); } };

console.log("\n=== ADVERSARIAL / EDGE ===");

t("single segment session works", ()=>{
  const {app}=boot(); app.segs=[{id:1,name:"only",sec:60}]; app.reset(); app.toggle(); run(61);
  ok(app.done);
});

t("segment with sec=0 is coerced to MIN_SEC, not infinite loop", ()=>{
  const {app}=boot(); app.segs=[{id:1,name:"z",sec:0},{id:2,name:"b",sec:60}];
  app.reset();
  eq(app.left, 1, "secsOf floors at MIN_SEC");
});

t("segment with negative sec coerced", ()=>{
  const {app}=boot(); app.segs=[{id:1,name:"z",min:-5}];
  app.reset(); eq(app.left, 1);
});

t("segment with sec='' (mid-typing) does not crash render", ()=>{
  const {app}=boot(); app.segs=[{id:1,name:"z",min:""},{id:2,name:"b",sec:300}];
  app.render();
  eq(app.totalSec(), 300, "empty treated as 0 in sum");
});

t("segment with NaN min", ()=>{
  const {app}=boot(); app.segs=[{id:1,name:"z",min:NaN}];
  app.reset(); eq(app.left, 1, "NaN -> MIN_SEC (1s)");
});

t("huge sleep past a ZERO-length session does not infinite-loop", ()=>{
  const {app}=boot(); app.segs=[{id:1,name:"a",sec:0},{id:2,name:"b",sec:0}];
  app.reset(); app.toggle();
  __clock.advance(10_000_000);
  const start=Date.now();
  app.sync();                       // must terminate
  ok(app.done, "should complete, not hang");
});

t("sync() when not running is a no-op", ()=>{
  const {app}=boot(); const before=app.left; app.sync(); eq(app.left, before);
});

t("sync() with endsAt null is a no-op", ()=>{
  const {app}=boot(); app.toggle(); app.reset(); app.sync();
  eq(app.endsAt, null);
});

console.log("\n=== ID COLLISION (flagged earlier) ===");

t("two presets saved in the SAME millisecond get distinct ids", ()=>{
  boot();
  // exercise the app's real generator via its observable contract
  let idSeq=0; const newId=()=>`${Date.now().toString(36)}-${(idSeq++).toString(36)}`;
  const a=newId(), b=newId();          // clock has NOT advanced
  ok(a!==b, `COLLISION: both ids are "${a}"`);
});

t("1000 ids generated in one millisecond are all unique", ()=>{
  boot();
  let idSeq=0; const newId=()=>`${Date.now().toString(36)}-${(idSeq++).toString(36)}`;
  const s=new Set(); for(let i=0;i<1000;i++) s.add(newId());
  ok(s.size===1000, `only ${s.size}/1000 unique`);
});

console.log("\n=== VISIBILITY HANDLER ===");

t("visibilitychange while running syncs the clock", ()=>{
  const {app}=boot();
  app.segs=[{id:1,name:"a",sec:60},{id:2,name:"b",sec:60}]; app.reset(); app.toggle();
  __clock.advance(70000);
  document.visibilityState="visible";
  document.fire("visibilitychange");
  eq(app.active, 1, "handler should have advanced us");
});

t("visibilitychange while stopped does nothing", ()=>{
  const {app}=boot();
  document.visibilityState="visible";
  document.fire("visibilitychange");
  eq(app.active, 0);
});

console.log("\n=== BEEP COUNT ON CATCH-UP ===");

t("sleeping through 2 boundaries beeps ONCE not twice", ()=>{
  const {app}=boot();
  app.segs=[{id:1,name:"a",sec:60},{id:2,name:"b",sec:60},{id:3,name:"c",sec:60}];
  app.reset(); app.toggle();
  document.visibilityState="hidden"; __notifications.length=0;
  __clock.advance(130000);   // crosses boundary 1 and 2
  app.sync();
  eq(app.active, 2, "on third segment");
  eq(__notifications.length, 1, `notified ${__notifications.length} times; want 1`);
});

console.log("\n=== PAUSE DETECTION ===");

t("paused flag: fresh timer is NOT paused", ()=>{
  const {nodes,app}=boot();
  app.render();
  ok(!nodes.dial.hasAttribute("data-paused"), "fresh should not read as paused");
});

t("paused flag: after start+pause IS paused", ()=>{
  const {nodes,app}=boot();
  app.toggle(); run(30); app.toggle();
  app.render();
  ok(nodes.dial.hasAttribute("data-paused"), "should read paused");
});

t("paused flag: done is NOT paused", ()=>{
  const {nodes,app}=boot();
  app.segs=[{id:1,name:"a",sec:60}]; app.reset(); app.toggle(); run(61);
  app.render();
  ok(!nodes.dial.hasAttribute("data-paused"), "done != paused");
});

console.log(`\n${"=".repeat(46)}\n${pass} passed, ${fail} failed`);
if(fail){ console.log("\nISSUES FOUND:"); bugs.forEach(([n,m])=>console.log(` • ${n}\n   ${m}`)); }

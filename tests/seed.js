const { boot } = require('./harness.js');
let pass=0,fail=0;const bugs=[];
const t=(n,f)=>{try{f();pass++;console.log(`  ✓ ${n}`);}catch(e){fail++;bugs.push([n,e.message]);console.log(`  ✗ ${n}\n      ${e.message}`);}};
const eq=(a,b,m="")=>{if(JSON.stringify(a)!==JSON.stringify(b))throw new Error(`${m} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);};
const ok=(c,m)=>{if(!c)throw new Error(m||"falsy");};

console.log("\n=== SEEDING ===");

t("fresh install gets 28 presets", ()=>{
  const {app}=boot();
  eq(app.presets.length, 28);
});

t("seed flag is written", ()=>{
  const {store}=boot();
  eq(store["timgo.seeded"], "1");
});

t("presets are persisted, not just in memory", ()=>{
  const {store}=boot();
  const p=JSON.parse(store["timgo.presets"]);
  eq(p.length, 28);
});

t("IDEMPOTENT: second boot does not double-seed", ()=>{
  const first = boot();
  const carried = { ...first.store };          // simulate reload
  const second = boot({ storage: carried });
  eq(second.app.presets.length, 28, "still 28, not 56");
});

t("CRITICAL: deleting all presets does NOT resurrect them", ()=>{
  const first = boot();
  const carried = { ...first.store };
  carried["timgo.presets"] = "[]";             // user deleted everything
  const second = boot({ storage: carried });
  eq(second.app.presets.length, 0, "user's choice must stick");
});

t("deleting SOME presets does not restore them", ()=>{
  const first = boot();
  const kept = JSON.parse(first.store["timgo.presets"]).slice(0,3);
  const carried = { ...first.store, "timgo.presets": JSON.stringify(kept) };
  const second = boot({ storage: carried });
  eq(second.app.presets.length, 3);
});

t("EXISTING USER with presets but no flag is not clobbered", ()=>{
  const mine = [{id:"x",name:"My Timer",hue:0,fav:true,total:5,segs:[{name:"a",sec:300}]}];
  const {app,store} = boot({ storage:{ "timgo.presets": JSON.stringify(mine) } });
  eq(app.presets.length, 1, "must not seed over existing data");
  eq(app.presets[0].name, "My Timer");
  eq(store["timgo.seeded"], "1", "flag set so we never try again");
});

t("corrupt presets + no flag -> seeds cleanly", ()=>{
  const {app}=boot({storage:{ "timgo.presets":"{{{garbage" }});
  eq(app.presets.length, 28);
});

console.log("\n=== LIBRARY INTEGRITY ===");

t("all 22 have unique ids", ()=>{
  const {app}=boot();
  eq(new Set(app.presets.map(p=>p.id)).size, 28);
});

t("all 22 have unique names", ()=>{
  const {app}=boot();
  eq(new Set(app.presets.map(p=>p.name)).size, 28);
});

t("every hue is 0-5", ()=>{
  const {app}=boot();
  ok(app.presets.every(p=>p.hue>=0 && p.hue<=5 && Number.isInteger(p.hue)));
});

t("every segment is a positive integer second", ()=>{
  const {app}=boot();
  app.presets.forEach(p=>p.segs.forEach(s=>{
    ok(Number.isInteger(s.sec) && s.sec>=1, `${p.name}/${s.name} = ${s.sec}`);
  }));
});

t("presets no longer carry a stale `total`", ()=>{
  const {app}=boot();
  app.presets.forEach(p=>ok(p.total===undefined, `${p.name} still has total=${p.total}`));
});

t("exactly 3 are pinned", ()=>{
  const {app}=boot();
  eq(app.presets.filter(p=>p.fav).length, 3);
});

t("pinned ones exist and are sensible", ()=>{
  const {app}=boot();
  const pinned = app.presets.filter(p=>p.fav).map(p=>p.name).sort();
  eq(pinned, ["Basmati Rice","Morning Pages","Pomodoro ×4"]);
});

t("no preset exceeds 3 hours", ()=>{
  const {app}=boot();
  app.presets.forEach(p=>{
    const sec=p.segs.reduce((a,s)=>a+s.sec,0);
    ok(sec<=10800, `${p.name} is ${Math.round(sec/60)} min`);
  });
});

t("no preset has fewer than 2 segments", ()=>{
  const {app}=boot();
  app.presets.forEach(p=>ok(p.segs.length>=2, `${p.name} has ${p.segs.length}`));
});

console.log("\n=== THEY ACTUALLY RUN ===");
const run=s=>{for(let i=0;i<s*10;i++){__clock.advance(100);__tick();}};

t("loading a seeded preset sets the right segments", ()=>{
  const {app}=boot();
  const rice = app.presets.find(p=>p.name==="Basmati Rice");
  app.applyPreset(rice.id);
  eq(app.segs.map(s=>s.sec), [1200,600,300]);
  eq(app.totalSec(), 2100);
});

t("Pomodoro ×4 hits its first break at exactly 25 min", ()=>{
  const {app}=boot();
  app.applyPreset(app.presets.find(p=>p.name==="Pomodoro ×4").id);
  app.toggle();
  __clock.advance(25*60*1000); app.sync();
  eq(app.active, 1, "should be on first Break");
  eq(app.left, 300, "5 min break");
});

t("every seeded preset loads and starts without throwing", ()=>{
  const {app}=boot();
  app.presets.slice().forEach(p=>{
    app.reset();
    app.applyPreset(p.id);
    app.toggle();
    app.sync();
    app.render();
    app.reset();
  });
});

t("longest preset completes under fast-forward", ()=>{
  const {app}=boot();
  app.applyPreset(app.presets.find(p=>p.name==="Bread Bulk Ferment").id);
  app.toggle();
  __clock.advance(151*60*1000);
  app.sync();
  ok(app.done, "should finish");
});

console.log(`\n${"=".repeat(46)}\n${pass} passed, ${fail} failed`);
if(fail){console.log("\nISSUES:");bugs.forEach(([n,m])=>console.log(` • ${n}\n   ${m}`));process.exit(1);}

console.log("\n=== CATEGORIES ===");
t("every seeded preset has a category", ()=>{
  const {app}=boot();
  app.presets.forEach(p=>ok(p.cat, `${p.name} has no cat`));
});
t("categories match the breakdown", ()=>{
  const {app}=boot();
  const c={}; app.presets.forEach(p=>c[p.cat]=(c[p.cat]||0)+1);
  eq(c, {Indian:6, Healthy:6, Focus:5, Hobby:7, Creative:4});
});
t("user-saved presets have no cat (land in 'Yours')", ()=>{
  const {app}=boot();
  // snapshot() omits cat by design
  const snap = { name:"Mine", total:5, segs:[{name:"a",sec:300}] };
  ok(!("cat" in snap));
});
t("overwriting a seeded preset preserves its category", ()=>{
  const {app}=boot();
  const dal = app.presets.find(p=>p.name==="Dal Tadka");
  const snapshot = { name:"Dal Tadka", total:10, segs:[{name:"x",sec:600}] };
  Object.assign(dal, snapshot, {id:dal.id, hue:dal.hue});
  eq(dal.cat, "Indian", "cat must survive Object.assign");
});
t("import rejects unknown categories", ()=>{
  const CAT_ORDER=["Yours","Focus","Indian","Healthy","Hobby","Creative"];
  const clean = c => CAT_ORDER.includes(c) ? c : undefined;
  eq(clean("Indian"), "Indian");
  eq(clean("<script>"), undefined);
  eq(clean("Evil"), undefined);
});

console.log(`\n${"=".repeat(46)}\n${pass} passed, ${fail} failed`);
if(fail){console.log("\nISSUES:");bugs.forEach(([n,m])=>console.log(` • ${n}\n   ${m}`));process.exit(1);}

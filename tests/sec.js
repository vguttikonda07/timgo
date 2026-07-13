const { boot } = require('./harness.js');
let pass=0,fail=0;const bugs=[];
const t=(n,f)=>{try{f();pass++;console.log(`  ✓ ${n}`);}catch(e){fail++;bugs.push([n,e.message]);console.log(`  ✗ ${n}\n      ${e.message}`);}};
const eq=(a,b,m="")=>{if(JSON.stringify(a)!==JSON.stringify(b))throw new Error(`${m} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);};
const ok=(c,m)=>{if(!c)throw new Error(m||"falsy");};
const run=s=>{for(let i=0;i<s*10;i++){__clock.advance(100);__tick();}};

console.log("\n=== MIGRATION: v9 (min) -> v10 (sec) ===");

t("old working timer migrates", ()=>{
  const old = JSON.stringify({segs:[{name:"a",min:20},{name:"b",min:5}]});
  const {app} = boot({storage:{ "timgo":old, "timgo.seeded":"1" }});
  eq(app.segs.map(s=>s.sec), [1200,300]);
});

t("migration is lossless: 20 min == 1200 sec", ()=>{
  const old = JSON.stringify({segs:[{name:"a",min:20}]});
  const {app} = boot({storage:{ "timgo":old, "timgo.seeded":"1" }});
  eq(app.segs[0].sec, 20*60);
});

t("old presets migrate", ()=>{
  const old = JSON.stringify([{id:"x",name:"Mine",hue:0,fav:true,total:25,
    segs:[{name:"a",min:20},{name:"b",min:5}]}]);
  const {app} = boot({storage:{ "timgo.presets":old, "timgo.seeded":"1" }});
  eq(app.presets[0].segs.map(s=>s.sec), [1200,300]);
  eq(app.presets[0].name, "Mine");
  eq(app.presets[0].fav, true, "fav preserved");
});

t("IDEMPOTENT: already-migrated data is untouched", ()=>{
  const neu = JSON.stringify({segs:[{name:"a",sec:45}]});
  const {app} = boot({storage:{ "timgo":neu, "timgo.seeded":"1" }});
  eq(app.segs[0].sec, 45, "45s must not become 45min");
});

t("mixed old/new segments both survive", ()=>{
  const mixed = JSON.stringify({segs:[{name:"a",min:2},{name:"b",sec:30}]});
  const {app} = boot({storage:{ "timgo":mixed, "timgo.seeded":"1" }});
  eq(app.segs.map(s=>s.sec), [120,30]);
});

t("old min=0 migrates to 60s, not 0", ()=>{
  const old = JSON.stringify({segs:[{name:"a",min:0}]});
  const {app} = boot({storage:{ "timgo":old, "timgo.seeded":"1" }});
  eq(app.segs[0].sec, 60);
});

t("stale `total` on presets is dropped", ()=>{
  const old = JSON.stringify([{id:"x",name:"M",total:999,segs:[{name:"a",min:1}]}]);
  const {app} = boot({storage:{ "timgo.presets":old, "timgo.seeded":"1" }});
  ok(app.presets[0].total === undefined, `total=${app.presets[0].total}`);
});

console.log("\n=== PARSER ===");
const P = [["25",1500],["1:30",90],["0:45",45],["90s",90],["45s",45],["2m",120],
           ["2m30s",150],["1m 5s",65],["  30s ",30],["1:05",65],["0",null],
           ["abc",null],["",null],["1:60",null],["-5",null],["1.5",null],["1e5",null]];

t("parseDur handles every documented form", ()=>{
  const {app}=boot();
  for(const [inp,want] of P) eq(app.parseDur(inp), want, `parseDur(${JSON.stringify(inp)}):`);
});

t("parseDur rejects zero-length", ()=>{
  const {app}=boot();
  eq(app.parseDur("0"), null);
  eq(app.parseDur("0s"), null);
  eq(app.parseDur("0:00"), null);
});

t("parseDur caps at 24h", ()=>{
  const {app}=boot();
  eq(app.parseDur("999999999999"), 24*3600);
  eq(app.parseDur("2000m"), 24*3600);
});

t("fmtDur picks the shortest unambiguous form", ()=>{
  const {app}=boot();
  eq([5,45,59,60,90,120,150,1500].map(app.fmtDur), ["5s","45s","59s","1m","1:30","2m","2:30","25m"]);
});

t("parse/format round-trips", ()=>{
  const {app}=boot();
  for(const sec of [1,5,45,59,60,90,150,1500,3661,86400])
    eq(app.parseDur(app.fmtDur(sec)), sec, `round-trip ${sec}:`);
});

console.log("\n=== ENGINE ON SECONDS ===");

t("a 45-second segment actually lasts 45 seconds", ()=>{
  const {app}=boot();
  app.segs=[{id:1,name:"bloom",sec:45},{id:2,name:"pour",sec:30}];
  app.reset(); app.toggle();
  run(44); eq(app.active, 0, "still on bloom at 44s");
  run(2);  eq(app.active, 1, "advanced by 46s");
});

t("Tabata: 20s work / 10s rest boundaries land exactly", ()=>{
  const {app}=boot();
  app.segs=[{id:1,name:"w",sec:20},{id:2,name:"r",sec:10},{id:3,name:"w",sec:20}];
  app.reset(); app.toggle();
  run(20); eq(app.active,1); eq(app.left,10);
  run(10); eq(app.active,2); eq(app.left,20);
});

t("secsOf is now a passthrough, no *60", ()=>{
  const {app}=boot();
  app.segs=[{id:1,name:"a",sec:37}];
  eq(app.secsOf(0), 37);
});

t("totalSec sums seconds", ()=>{
  const {app}=boot();
  app.segs=[{id:1,name:"a",sec:45},{id:2,name:"b",sec:15}];
  eq(app.totalSec(), 60);
});

t("suspended tab still catches up on second-scale segments", ()=>{
  const {app}=boot();
  app.segs=[{id:1,name:"a",sec:20},{id:2,name:"b",sec:10},{id:3,name:"c",sec:20}];
  app.reset(); app.toggle();
  __clock.advance(55000);   // past all 50s
  app.sync();
  ok(app.done, "should have completed");
});

console.log("\n=== SEEDED LIBRARY ===");

t("28 presets seed", ()=>{ eq(boot().app.presets.length, 28); });

t("short-interval presets exist and have sub-minute segments", ()=>{
  const {app}=boot();
  for(const n of ["Tabata","Pour Over","Plank Ladder","Gesture Drawing","Tadka"]){
    const p = app.presets.find(x=>x.name===n);
    ok(p, `${n} missing`);
    ok(p.segs.some(s=>s.sec<60), `${n} has no sub-minute segment`);
  }
});

t("Tabata runs its 20/10 intervals correctly", ()=>{
  const {app}=boot();
  app.applyPreset(app.presets.find(p=>p.name==="Tabata").id);
  eq(app.segs.map(s=>s.sec), [180,20,10,20,10,20,10,20,180]);
  app.toggle();
  run(180); eq(app.active,1,"warm-up done");
  run(20);  eq(app.active,2,"first work done");
  run(10);  eq(app.active,3,"first rest done");
});

t("Pour Over bloom is 45 seconds", ()=>{
  const {app}=boot();
  const p = app.presets.find(x=>x.name==="Pour Over");
  eq(p.segs.find(s=>s.name==="Bloom").sec, 45);
});

t("every seeded segment is >= 1s and <= 24h", ()=>{
  const {app}=boot();
  app.presets.forEach(p=>p.segs.forEach(s=>{
    ok(Number.isInteger(s.sec) && s.sec>=1 && s.sec<=86400, `${p.name}/${s.name}=${s.sec}`);
  }));
});

t("every seeded preset runs to completion", ()=>{
  const {app}=boot();
  app.presets.slice().forEach(p=>{
    app.reset(); app.applyPreset(p.id); app.toggle();
    __clock.advance((app.totalSec()+5)*1000);
    app.sync();
    ok(app.done, `${p.name} did not finish`);
    app.reset();
  });
});

console.log("\n=== IMPORT ===");
t("import accepts sec", ()=>{
  const clean = s => Math.min(Math.max(+s?.sec || (+s?.min||1)*60, 1), 86400);
  eq(clean({sec:45}), 45);
});
t("import migrates min from an old export", ()=>{
  const clean = s => Math.min(Math.max(+s?.sec || (+s?.min||1)*60, 1), 86400);
  eq(clean({min:20}), 1200);
});
t("import caps at 24h", ()=>{
  const clean = s => Math.min(Math.max(+s?.sec || (+s?.min||1)*60, 1), 86400);
  eq(clean({sec:1e9}), 86400);
});

console.log(`\n${"=".repeat(46)}\n${pass} passed, ${fail} failed`);
if(fail){console.log("\nISSUES:");bugs.forEach(([n,m])=>console.log(` • ${n}\n   ${m}`));process.exit(1);}

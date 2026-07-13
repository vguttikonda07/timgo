const { boot } = require('./harness.js');
let pass=0,fail=0;const bugs=[];
const t=(n,f)=>{try{f();pass++;console.log(`  ✓ ${n}`);}catch(e){fail++;bugs.push([n,e.message]);console.log(`  ✗ ${n}\n      ${e.message}`);}};
const eq=(a,b,m="")=>{if(JSON.stringify(a)!==JSON.stringify(b))throw new Error(`${m} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);};
const ok=(c,m)=>{if(!c)throw new Error(m||"falsy");};

console.log("\n=== THE BUG FROM THE SCREENSHOT ===");
t("Pomodoro chip no longer says 7800 min", ()=>{
  const {app}=boot();
  const p = app.presets.find(x=>x.name==="Pomodoro ×4");
  const sec = p.segs.reduce((a,s)=>a+s.sec,0);
  eq(sec, 7800, "raw seconds");
  eq(app.fmtDur(sec), "2h 10m", "chip label");
});
t("Deep Work chip reads 1h 50m", ()=>{
  const {app}=boot();
  const p = app.presets.find(x=>x.name==="Deep Work Block");
  eq(app.fmtDur(p.segs.reduce((a,s)=>a+s.sec,0)), "1h 50m");
});
t("session remaining shows hours", ()=>{
  const {app}=boot();
  eq(app.clockOf(6600), "1:50:00");
  eq(app.clockOf(3600), "1:00:00");
});
t("short segments stay mm:ss", ()=>{
  const {app}=boot();
  eq(app.clockOf(45), "00:45");
  eq(app.clockOf(300), "05:00");
  eq(app.clockOf(3599), "59:59");
});

console.log("\n=== fmtDur ACROSS THE RANGE ===");
t("every scale reads sensibly", ()=>{
  const {app}=boot();
  eq([1,45,60,90,300,2100,3600,3660,6600,7800,86400].map(app.fmtDur),
     ["1s","45s","1m","1:30","5m","35m","1h","1h 1m","1h 50m","2h 10m","24h"]);
});

console.log("\n=== PARSER ROUND-TRIP (blur must not destroy data) ===");
t("fmtDur output always re-parses to the same value", ()=>{
  const {app}=boot();
  for(const sec of [1,5,45,59,60,90,150,300,2100,3600,3660,5400,6600,7800,86400])
    eq(app.parseDur(app.fmtDur(sec)), sec, `round-trip ${sec}:`);
});
t("hour forms parse", ()=>{
  const {app}=boot();
  eq(app.parseDur("2h"), 7200);
  eq(app.parseDur("2h 10m"), 7800);
  eq(app.parseDur("1h 1m"), 3660);
  eq(app.parseDur("1:05:30"), 3930);
});
t("old forms still parse", ()=>{
  const {app}=boot();
  eq([app.parseDur("45s"),app.parseDur("1:30"),app.parseDur("25"),app.parseDur("2m30s")],
     [45,90,1500,150]);
});
t("garbage still rejected", ()=>{
  const {app}=boot();
  for(const g of ["","abc","0","1:60","-5","1.5","h","1h1h",":::"]) eq(app.parseDur(g), null, `parseDur(${g}):`);
});

console.log("\n=== EVERY SEEDED PRESET ROUND-TRIPS ===");
t("no seeded segment is corrupted by format→parse", ()=>{
  const {app}=boot();
  app.presets.forEach(p=>p.segs.forEach(s=>{
    eq(app.parseDur(app.fmtDur(s.sec)), s.sec, `${p.name}/${s.name}:`);
  }));
});

console.log("\n=== SOUND ===");
t("default is chime", ()=>{ eq(boot().app.sound, "chime"); });
t("choice persists", ()=>{
  const {store}=boot();
  store["timgo.sound"]="gong";
  const {app}=boot({storage:store});
  eq(app.sound, "gong");
});
t("unknown stored sound falls back to chime", ()=>{
  const {app}=boot({storage:{"timgo.sound":"kazoo"}});
  eq(app.sound, "chime");
});
t("every voice has notes and an end flourish", ()=>{
  const {app}=boot();
  app.SOUND_ORDER.forEach(k=>{
    const S=app.SOUNDS[k];
    ok(S.label, `${k} has no label`);
    ok(Array.isArray(S.notes) && Array.isArray(S.end), `${k} malformed`);
    if(k!=="silent") ok(S.notes.length && S.end.length, `${k} is empty`);
  });
});
t("silent is truly silent", ()=>{
  const {app}=boot();
  eq(app.SOUNDS.silent.notes, []);
  eq(app.SOUNDS.silent.end, []);
});
t("beep never throws for any voice, either mode", ()=>{
  const {app}=boot();
  app.SOUND_ORDER.forEach(k=>{ app.sound=k; app.beep(1); app.beep(3); });
});

console.log(`\n${"=".repeat(46)}\n${pass} passed, ${fail} failed`);
if(fail){console.log("\nISSUES:");bugs.forEach(([n,m])=>console.log(` • ${n}\n   ${m}`));process.exit(1);}

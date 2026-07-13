const { boot } = require('./harness.js');
let pass=0,fail=0;const bugs=[];
const t=(n,f)=>{try{f();pass++;console.log(`  ✓ ${n}`);}catch(e){fail++;bugs.push([n,e.message]);console.log(`  ✗ ${n}\n      ${e.message}`);}};
const eq=(a,b,m="")=>{if(JSON.stringify(a)!==JSON.stringify(b))throw new Error(`${m} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);};
const ok=(c,m)=>{if(!c)throw new Error(m||"falsy");};

console.log("\n=== splitDur: which unit does a value display as? ===");
t("sub-minute -> seconds", ()=>{
  const {app}=boot();
  for(const s of [1,10,15,20,30,45,59]) eq(app.splitDur(s), {n:s,unit:"s"}, `${s}s:`);
});
t("whole minutes -> minutes, any size", ()=>{
  const {app}=boot();
  eq(app.splitDur(60),   {n:1,   unit:"m"});
  eq(app.splitDur(1500), {n:25,  unit:"m"});
  eq(app.splitDur(3600), {n:60,  unit:"m"});
  eq(app.splitDur(7800), {n:130, unit:"m"});
  eq(app.splitDur(86400),{n:1440,unit:"m"});
});
t("mixed -> free-form colon", ()=>{
  const {app}=boot();
  eq(app.splitDur(90),   {n:"1:30",   unit:"x"});
  eq(app.splitDur(3661), {n:"1:01:01",unit:"x"});
});
t("only 3 of 115 library segments need free-form", ()=>{
  const {app}=boot();
  let x=0, tot=0;
  app.presets.forEach(p=>p.segs.forEach(s=>{ tot++; if(app.splitDur(s.sec).unit==="x") x++; }));
  eq(x, 3, "free-form count");
  ok(tot>=110, `only ${tot} segments`);
});

console.log("\n=== readRow: number + unit -> seconds ===");
t("5 under [m] is 300 seconds", ()=>{
  const {app}=boot();
  app.rowUnit.set("1","m");
  eq(app.readRow("1","5"), 300);
});
t("5 under [s] is 5 seconds", ()=>{
  const {app}=boot();
  app.rowUnit.set("1","s");
  eq(app.readRow("1","5"), 5);
});
t("TOGGLE REINTERPRETS: same number, different meaning", ()=>{
  const {app}=boot();
  app.rowUnit.set("1","m"); const asMin = app.readRow("1","10");
  app.rowUnit.set("1","s"); const asSec = app.readRow("1","10");
  eq([asMin,asSec],[600,10], "10m vs 10s:");
});
t("free-form row still parses colons", ()=>{
  const {app}=boot();
  app.rowUnit.set("1","x");
  eq(app.readRow("1","1:30"), 90);
  eq(app.readRow("1","2h"), 7200);
  eq(app.readRow("1","45s"), 45);
});
t("colon typed into a NUMERIC row still parses", ()=>{
  const {app}=boot();
  app.rowUnit.set("1","m");
  eq(app.readRow("1","1:30"), 90, "escape hatch: never trap the user");
});
t("half-typed input returns null, model keeps last good value", ()=>{
  const {app}=boot();
  app.rowUnit.set("1","s");
  eq(app.readRow("1",""), null);
  eq(app.readRow("1","0"), null, "zero is not a segment");
  eq(app.readRow("1","abc"), null);
});
t("readRow clamps to MIN_SEC and MAX_SEC", ()=>{
  const {app}=boot();
  app.rowUnit.set("1","s"); eq(app.readRow("1","999999"), 86400);
  app.rowUnit.set("1","m"); eq(app.readRow("1","999999"), 86400);
});
t("unknown row id defaults to free-form, does not crash", ()=>{
  const {app}=boot();
  eq(app.readRow("nope","45s"), 45);
});

console.log("\n=== TYPING NUMBERS ONLY: the point of the change ===");
t("Tabata rest: type 10, tap [s]", ()=>{
  const {app}=boot();
  app.rowUnit.set("r","s");
  eq(app.readRow("r","10"), 10, "no letters typed");
});
t("Pomodoro focus: type 25, tap [m]", ()=>{
  const {app}=boot();
  app.rowUnit.set("f","m");
  eq(app.readRow("f","25"), 1500);
});
t("every library segment reachable by number+toggle or colon", ()=>{
  const {app}=boot();
  app.presets.forEach(p=>p.segs.forEach(s=>{
    const d = app.splitDur(s.sec);
    app.rowUnit.set("t", d.unit);
    eq(app.readRow("t", String(d.n)), s.sec, `${p.name}/${s.name}:`);
  }));
});

console.log("\n=== ROUND TRIP: display -> read -> same seconds ===");
t("exhaustive 1s..86400s through splitDur+readRow", ()=>{
  const {app}=boot();
  let bad=[];
  for(let s=1;s<=86400;s++){
    const d=app.splitDur(s);
    app.rowUnit.set("z", d.unit);
    if(app.readRow("z", String(d.n)) !== s) bad.push(s);
  }
  eq(bad.length, 0, `${bad.length} values corrupted, first: ${bad.slice(0,3)}`);
});

console.log(`\n${"=".repeat(46)}\n${pass} passed, ${fail} failed`);
if(fail){console.log("\nISSUES:");bugs.forEach(([n,m])=>console.log(` • ${n}\n   ${m}`));process.exit(1);}

const { boot } = require('./harness.js');
let pass=0,fail=0;const bugs=[];
const t=(n,f)=>{try{f();pass++;console.log(`  ✓ ${n}`);}catch(e){fail++;bugs.push([n,e.message]);console.log(`  ✗ ${n}\n      ${e.message}`);}};
const eq=(a,b,m="")=>{if(JSON.stringify(a)!==JSON.stringify(b))throw new Error(`${m} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);};
const ok=(c,m)=>{if(!c)throw new Error(m||"falsy");};
const run=s=>{for(let i=0;i<s*10;i++){__clock.advance(100);__tick();}};
const near=(a,b,m)=>{ if(Math.abs(a-b)>0.5) throw new Error(`${m||""} ${a} !~ ${b}`); };
const newOscs=fn=>{ const n=__audio.oscs.length; fn(); return __audio.oscs.slice(n); };

console.log("\n=== ARMING ===");
t("hiding mid-session schedules keepalive + every remaining boundary", ()=>{
  const {app}=boot(); app.toggle(); run(60);
  const o = newOscs(()=>__setHidden(true));
  eq(o.length, 6, "keepalive + 2 handoffs + 3-note flourish");
  ok(o.some(x=>x.freq===40), "40Hz keepalive present");
  const times = o.filter(x=>x.freq!==40).map(x=>x.startT);
  near(times[0], 1140, "first handoff");   // 20m seg minus the 60s elapsed
  near(times[1], 2940, "second handoff");
  near(times[2], 3540, "flourish note 1");
  __setHidden(false);
});
t("per-segment voices are scheduled: blip work, wood rest", ()=>{
  const {app}=boot();
  app.segs=[{id:1,name:"w",sec:40,snd:"blip"},{id:2,name:"r",sec:20,snd:"wood"},{id:3,name:"w2",sec:40,snd:"blip"}];
  app.reset(); app.toggle();
  const o = newOscs(()=>__setHidden(true)).filter(x=>x.freq!==40);
  eq(o[0].freq, 420, "entering rest -> wood");
  eq(o[1].freq, 1600, "entering work -> blip");
  __setHidden(false);
});
t("a silent segment's handoff schedules nothing", ()=>{
  const {app}=boot();
  app.segs=[{id:1,name:"a",sec:30},{id:2,name:"quiet",sec:30,snd:"silent"},{id:3,name:"c",sec:30}];
  app.reset(); app.toggle();
  const o = newOscs(()=>__setHidden(true)).filter(x=>x.freq!==40);
  // boundaries: into seg2 (silent -> skipped), into seg3 (chime 880), completion x3
  eq(o.length, 4);
  eq(o[0].freq, 880, "only the audible handoff");
  __setHidden(false);
});
t("hiding while PAUSED arms nothing", ()=>{
  const {app}=boot(); app.toggle(); run(30); app.toggle();   // paused
  const o = newOscs(()=>__setHidden(true));
  eq(o.length, 0);
  __setHidden(false);
});
t("hiding while idle arms nothing", ()=>{
  boot();
  eq(newOscs(()=>__setHidden(true)).length, 0);
  __setHidden(false);
});

console.log("\n=== RETURNING ===");
t("visible again cancels the whole schedule", ()=>{
  const {app}=boot(); app.toggle();
  const o = newOscs(()=>__setHidden(true));
  __setHidden(false);
  ok(o.every(x=>x.stops.includes(0)), "every node stop(0)'d");
});
t("boundaries crossed while hidden replay SILENTLY on return", ()=>{
  const {app}=boot(); app.toggle();
  __setHidden(true);
  app.beep._last = null;
  __clock.advance(1205*1000);          // past the first handoff, no JS ticks (throttled)
  __setHidden(false);                  // listener: sync (silent) then disarm
  eq(app.active, 1, "position healed");
  eq(app.beep._last, null, "no JS beep — the scheduler already sounded it");
});
t("throttled tick DURING hidden also stays silent (no double beep)", ()=>{
  const {app}=boot(); app.toggle();
  __setHidden(true);
  app.beep._last = null;
  __clock.advance(1205*1000);
  __tick();                            // Android fires one throttled timer
  eq(app.active, 1);
  eq(app.beep._last, null, "armed scheduler suppresses the JS beep");
  __setHidden(false);
});
t("session completing while hidden: done, suppressed, flourish was scheduled", ()=>{
  const {app}=boot();
  app.segs=[{id:1,name:"a",sec:5}]; app.reset(); app.toggle();
  const o = newOscs(()=>__setHidden(true));
  app.beep._last = null;
  __clock.advance(7000);
  __setHidden(false);
  ok(app.done, "done");
  eq(app.beep._last, null, "no late JS flourish");
  eq(o.filter(x=>x.freq!==40).length, 3, "flourish lived on the audio clock");
});
t("REGRESSION: catch-up with the app never hidden still beeps once", ()=>{
  const {app}=boot(); app.toggle();
  app.beep._last = null;
  __clock.advance(1205*1000);          // suspend WITHOUT visibilitychange (old sec.js path)
  __tick();
  eq(app.beep._last.times, 1, "unarmed catch-up must still sound");
});

console.log("\n=== LIFECYCLE ===");
t("pause after returning leaves nothing armed; resume+hide re-arms fresh", ()=>{
  const {app}=boot(); app.toggle(); run(30);
  __setHidden(true); __setHidden(false);
  app.toggle();                        // pause
  eq(newOscs(()=>__setHidden(true)).length, 0, "paused: nothing to arm");
  __setHidden(false);
  app.toggle(); run(10);               // resume
  const o = newOscs(()=>__setHidden(true)).filter(x=>x.freq!==40);
  near(o[0].startT, 1200-30-10, "rescheduled against the fresh clock");
  __setHidden(false);
});
t("+1m before hiding shifts the scheduled boundary by 60", ()=>{
  const {app}=boot(); app.toggle(); run(10);
  app.extend();
  const o = newOscs(()=>__setHidden(true)).filter(x=>x.freq!==40);
  near(o[0].startT, 1200-10+60, "extension visible on the audio clock");
  __setHidden(false);
});
t("reset stands the scheduler down", ()=>{
  const {app}=boot(); app.toggle();
  const o = newOscs(()=>__setHidden(true));
  __setHidden(false);   // normally disarms; reset must also be safe belt+braces
  app.reset();
  ok(o.every(x=>x.stops.includes(0)));
  eq(newOscs(()=>__setHidden(true)).length, 0, "idle after reset: nothing arms");
  __setHidden(false);
});

console.log(`\n${"=".repeat(46)}\n${pass} passed, ${fail} failed`);
if(fail){console.log("\nISSUES:");bugs.forEach(([n,m])=>console.log(` • ${n}\n   ${m}`));process.exit(1);}

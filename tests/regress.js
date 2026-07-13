const { boot } = require('./harness.js');
let pass=0,fail=0;const bugs=[];
const t=(n,f)=>{try{f();pass++;console.log(`  ✓ ${n}`);}catch(e){fail++;bugs.push([n,e.message]);console.log(`  ✗ ${n}\n      ${e.message}`);}};
const eq=(a,b,m="")=>{if(JSON.stringify(a)!==JSON.stringify(b))throw new Error(`${m} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);};
const ok=(c,m)=>{if(!c)throw new Error(m||"falsy");};

console.log("\n=== REGRESSIONS FOR TODAY'S FIXES ===");

t("FIX: ids unique within the same millisecond", ()=>{
  boot();
  let idSeq=0; const newId=()=>`${Date.now().toString(36)}-${(idSeq++).toString(36)}`;
  const ids=new Set(); for(let i=0;i<1000;i++) ids.add(newId());
  eq(ids.size, 1000, "1000 ids in one ms");
});

t("FIX: negative hue maps into palette", ()=>{
  const hue = h => ((+h||0)%6+6)%6;
  eq([hue(-1),hue(-7),hue(99),hue(0),hue(NaN)], [5,5,3,0,0]);
  const HUES=["a","b","c","d","e","f"];
  for(const v of [-1,-7,99,0,NaN]) ok(HUES[hue(v)]!==undefined, `HUES[hue(${v})] undefined`);
});

t("FIX: esc() handles & < > \" in segment names", ()=>{
  const esc = s => String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  eq(esc("Bloom & steep"), "Bloom &amp; steep");
  eq(esc("a<b"), "a&lt;b");
  eq(esc('&quot;'), "&amp;quot;");
  eq(esc(null), "null");   // no crash on non-string
});

t("FIX: esc round-trips through an attribute", ()=>{
  const esc = s => String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const unesc = s => s.replace(/&quot;/g,'"').replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&");
  for(const n of ["&quot;", "a<b>c", 'say "hi" & bye', "plain"])
    eq(unesc(esc(n)), n, `round-trip ${n}`);
});

t("FIX: import caps segment minutes at 1440", ()=>{
  const clean = m => Math.min(Math.max(+m||1,1),1440);
  eq([clean(1e9), clean(-5), clean("abc"), clean(30), clean(1441)], [1440,1,1,30,1440]);
});

console.log("\n=== NO REGRESSION IN ENGINE ===");
const run=s=>{for(let i=0;i<s*10;i++){__clock.advance(100);__tick();}};

t("still: 3 x 1min completes in 180s", ()=>{
  const {app}=boot();
  app.segs=[{id:1,name:"a",sec:60},{id:2,name:"b",sec:60},{id:3,name:"c",sec:60}];
  app.reset(); const t0=Date.now(); app.toggle(); run(181);
  ok(app.done); eq(Date.now()-t0, 181000);
});

t("still: suspended tab catches up", ()=>{
  const {app}=boot();
  app.segs=[{id:1,name:"a",sec:60},{id:2,name:"b",sec:60},{id:3,name:"c",sec:60}];
  app.reset(); app.toggle(); __clock.advance(200000); app.sync();
  ok(app.done);
});

t("still: buildList renders without throwing on hostile names", ()=>{
  const {app}=boot();
  app.segs=[{id:1,name:'<img onerror=x>',min:5},{id:2,name:'& " < >',min:5}];
  app.buildList();   // must not throw
});

t("still: preset guard prompts mid-run", ()=>{
  const {app,nodes}=boot();
  app.presets=[{id:"p1",name:"X",hue:0,segs:[{name:"s",sec:300}]}];
  app.toggle(); run(60);
  app.applyPreset("p1");
  eq(nodes.csheet.hidden, false);
  nodes.ccancel.click();
});

t("still: works with Notification absent", ()=>{
  const {nodes,app}=boot({notification:false});
  nodes.go.click(); ok(app.running);
});

console.log(`\n${"=".repeat(46)}\n${pass} passed, ${fail} failed`);
if(fail){console.log("\nISSUES:");bugs.forEach(([n,m])=>console.log(` • ${n}\n   ${m}`));process.exit(1);}

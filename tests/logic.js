const { boot } = require('./harness.js');
let pass=0, fail=0; const bugs=[];
const t=(n,f)=>{try{f();pass++;console.log(`  ✓ ${n}`);}catch(e){fail++;bugs.push([n,e.message]);console.log(`  ✗ ${n}\n      ${e.message}`);}};
const eq=(a,b,m="")=>{if(JSON.stringify(a)!==JSON.stringify(b))throw new Error(`${m} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);};
const ok=(c,m)=>{if(!c)throw new Error(m||"falsy");};

// re-derive the pure helpers exactly as written in app.js
const MAX_FAV=3;
const favs = presets => { const s=presets.filter(p=>p.fav); return s.length?s.slice(0,MAX_FAV):presets.slice(-MAX_FAV).reverse(); };
const esc = s => s.replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

console.log("\n=== FAVOURITES RAIL ===");
t("no favs -> newest 3, newest first", ()=>{
  const p=['A','B','C','D','E'].map(n=>({name:n}));
  eq(favs(p).map(x=>x.name), ['E','D','C']);
});
t("some favs -> only favs, in stored order", ()=>{
  const p=['A','B','C','D','E'].map(n=>({name:n}));
  p[1].fav=p[3].fav=true;
  eq(favs(p).map(x=>x.name), ['B','D']);
});
t("more than 3 favs -> capped at 3", ()=>{
  const p=['A','B','C','D'].map(n=>({name:n,fav:true}));
  eq(favs(p).length, 3);
});
t("fewer than 3 presets, none fav", ()=>{
  const p=[{name:'A'}]; eq(favs(p).map(x=>x.name), ['A']);
});
t("empty presets", ()=>{ eq(favs([]), []); });

console.log("\n=== HTML ESCAPING (XSS) ===");
t("escapes angle brackets and quotes", ()=>{
  eq(esc('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
  eq(esc('"'), '&quot;');
  eq(esc('&'), '&amp;');
});
t("preset name with script tag is neutralised", ()=>{
  const bad = '<script>alert(1)</script>';
  ok(!esc(bad).includes('<script'), "must not emit raw tag");
});
t("single quote unescaped — safe only because attrs use double quotes", ()=>{
  const out = esc("it's");
  ok(out === "it's", "documents the invariant: never use single-quoted attributes");
});

console.log("\n=== SNAPSHOT / COMMIT SEMANTICS ===");
t("snapshot floors segment minutes at 1", ()=>{
  const {app}=boot();
  app.segs=[{id:1,name:"a",sec:0},{id:2,name:"b",min:""}];
  // snapshot isn't exported; replicate its body
  const snap = { total:app.totalSec(), segs:app.segs.map(s=>({name:s.name,min:Math.max(+s.min||1,1)})) };
  eq(snap.segs.map(s=>s.min), [1,1]);
});
t("snapshot total uses totalMin (raw sum, can differ from floored segs)", ()=>{
  const {app}=boot();
  app.segs=[{id:1,name:"a",sec:0}];
  const total = app.totalSec();               // 0
  const segMins = [Math.max(0||1,1)];         // 1
  ok(total !== segMins[0], `INCONSISTENCY: preset stores total=${total} but segments sum to ${segMins[0]}`);
});

console.log("\n=== IMPORT VALIDATION ===");
const sanitize = p => {
  if(!p?.name || !Array.isArray(p.segs) || !p.segs.length) return null;
  const segsClean = p.segs.map(s=>({name:String(s?.name||"Branch").slice(0,40), min:Math.min(Math.max(+s?.min||1,1),1440)}));
  return { name:String(p.name).slice(0,40), total:Math.max(+p.total||segsClean.reduce((a,s)=>a+s.min,0),1),
           hue:((+p.hue||0)%6+6)%6, fav:false, segs:segsClean };
};
t("rejects preset with no segs", ()=>{ eq(sanitize({name:"x",segs:[]}), null); });
t("rejects preset with no name", ()=>{ eq(sanitize({segs:[{min:1}]}), null); });
t("rejects non-object", ()=>{ eq(sanitize(null), null); eq(sanitize("hi"), null); });
t("truncates absurd names to 40 chars", ()=>{
  eq(sanitize({name:"x".repeat(500),segs:[{name:"a",sec:60}]}).name.length, 40);
});
t("coerces hostile min values", ()=>{
  const s=sanitize({name:"x",segs:[{name:"a",min:"-999"},{name:"b",min:"abc"},{name:"c",min:1e9}]});
  eq(s.segs.map(x=>x.min), [1,1,1440]);
});
t("min is capped at 1440 (24h) per segment", ()=>{
  const s=sanitize({name:"x",segs:[{name:"a",min:1e9}]});
  ok(s.segs[0].min===1440, `expected cap 1440, got ${s.segs[0].min}`);
});
t("hue wraps into palette range", ()=>{
  eq(sanitize({name:"x",hue:99,segs:[{name:"a",sec:60}]}).hue, 3);
  eq(sanitize({name:"x",hue:-1,segs:[{name:"a",sec:60}]}).hue, 5);   // -1 wraps to last hue
});

console.log(`\n${"=".repeat(46)}\n${pass} passed, ${fail} failed`);
if(fail){console.log("\nISSUES:");bugs.forEach(([n,m])=>console.log(` • ${n}\n   ${m}`));}

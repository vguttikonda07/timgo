const { boot } = require('./harness.js');
let pass=0,fail=0;const bugs=[];
const t=(n,f)=>{try{f();pass++;console.log(`  ✓ ${n}`);}catch(e){fail++;bugs.push([n,e.message]);console.log(`  ✗ ${n}\n      ${e.message}`);}};
const eq=(a,b,m="")=>{if(JSON.stringify(a)!==JSON.stringify(b))throw new Error(`${m} expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);};
const ok=(c,m)=>{if(!c)throw new Error(m||"falsy");};
const run=s=>{for(let i=0;i<s*10;i++){__clock.advance(100);__tick();}};

console.log("\n=== THEMES ===");
t("default is Ember with the original hues", ()=>{
  const {app}=boot();
  eq(app.theme,"ember"); eq(app.HUES[0],"#FF5A2B");
  eq(document.documentElement.getAttribute("data-theme"),"ember");
});
t("switching to Pop swaps every hue in place", ()=>{
  const {app}=boot();
  app.applyTheme("pop");
  eq(app.HUES, ["#7C5CFF","#FF4D9D","#FF8A3D","#38BDF8","#A3E635","#FFC53D"]);
  eq(document.documentElement.getAttribute("data-theme"),"pop");
});
t("rebuilt rows paint with the new hues", ()=>{
  const {app,nodes}=boot();
  app.applyTheme("pop");
  ok(nodes.list.innerHTML.includes("#7C5CFF"), "grip colour should be violet");
  ok(!nodes.list.innerHTML.includes("#FF5A2B"), "no ember left in rows");
});
t("switching back restores Ember exactly", ()=>{
  const {app}=boot();
  app.applyTheme("pop"); app.applyTheme("ember");
  eq(app.HUES[0],"#FF5A2B"); eq(app.HUES[5],"#5B7B3A");
});
t("choice persists across boots", ()=>{
  const first=boot(); first.app.applyTheme("pop");
  // saveTheme runs from the picker handler; simulate it
  first.nodes.themesel.value="pop"; first.nodes.themesel.fire("change",{target:first.nodes.themesel});
  const carried={...first.store};
  const second=boot({storage:carried});
  eq(second.app.theme,"pop"); eq(second.app.HUES[0],"#7C5CFF");
});
t("unknown stored theme falls back to Ember", ()=>{
  const {app}=boot({storage:{"timgo.theme":"vaporwave"}});
  eq(app.theme,"ember");
});
t("picker lists both themes, current selected", ()=>{
  const {nodes}=boot({storage:{"timgo.theme":"pop"}});
  ok(nodes.themesel.innerHTML.includes(">Ember<") && nodes.themesel.innerHTML.includes(">Pop<"));
  ok(nodes.themesel.innerHTML.includes('value="pop" selected'));
});
t("theme swap mid-session leaves the clock untouched", ()=>{
  const {app}=boot();
  app.toggle(); run(90);
  const l=app.left, a=app.active;
  app.applyTheme("pop");
  eq([app.left,app.active,app.running],[l,a,true]);
});
t("preset spines and chain use live HUES after swap", ()=>{
  const {app,nodes}=boot();
  app.applyTheme("pop");
  app.drawPresets();
  ok(!nodes.chips.innerHTML.includes("#FF5A2B"));
});
t("every theme defines label, bar, and 6 hues", ()=>{
  const {app}=boot();
  for(const k of Object.keys(app.THEMES)){
    const T=app.THEMES[k];
    ok(T.label && /^#[0-9A-F]{6}$/i.test(T.bar) && T.hues.length===6, k);
  }
});

console.log(`\n${"=".repeat(46)}\n${pass} passed, ${fail} failed`);
if(fail){console.log("\nISSUES:");bugs.forEach(([n,m])=>console.log(` • ${n}\n   ${m}`));process.exit(1);}

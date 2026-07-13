const fs = require('fs');

function makeEl(id){
  const listeners={}, attrs=new Set();
  const children = [];
  const el = {
    id, textContent:"", value:"", innerHTML:"",
    hidden:["sheet","csheet","drawer","scrim","toast"].includes(id), disabled:false,
    dataset:{}, onclick:null,
    style:new Proxy({},{set:()=>true,get:()=>""}),
    classList:{add(){},remove(){},toggle(){}},
    _attrs:{}, setAttribute(k,v){ el._attrs[k]=String(v); },
    getAttribute(k){ return k in el._attrs ? el._attrs[k] : null; },
    toggleAttribute(k,on){ on?attrs.add(k):attrs.delete(k); return !!on; },
    hasAttribute:k=>attrs.has(k),
    addEventListener(ev,fn){ (listeners[ev] ||= []).push(fn); },
    fire(ev,e={}){ (listeners[ev]||[]).forEach(f=>f({preventDefault(){},stopPropagation(){},target:el,...e})); },
    _children: children,
    querySelector(sel){ return children.find(c=>c._match(sel)) || null; },
    querySelectorAll(sel){ return children.filter(c=>c._match(sel)); },
    _match(sel){
      let m;
      if((m=sel.match(/^\[data-([\w-]+)="(.+)"\]$/))){
        const k=m[1].replace(/-(\w)/g,(_,c)=>c.toUpperCase());
        return el.dataset[k]===m[2];
      }
      if((m=sel.match(/^\[data-([\w-]+)\]$/)))
        return m[1].replace(/-(\w)/g,(_,c)=>c.toUpperCase()) in el.dataset;
      if(sel===".seg") return el.className==="seg";
      return false;
    },
    _add(c){ children.push(c); return c; },
    focus(){}, select(){}, blur(){},
    click(){ el.onclick && el.onclick(); },
    closest:()=>null, insertAdjacentHTML(){}, appendChild(){}, remove(){},
  };
  return el;
}

function boot(opt={}){
  const { notification=true, storage={}, now=1000000 } = opt;
  const nodes={}, store={...storage};

  global.window = globalThis;
  global.document = {
    _l:{},
    documentElement: makeEl("html"),
    hidden:false, visibilityState:"visible",
    getElementById:id => nodes[id] ||= makeEl(id),
    addEventListener(ev,fn){ this._l[ev]=fn; },
    fire(ev){ this._l[ev] && this._l[ev](); },
    visibilityState:"visible",
    createElement:()=>makeEl("tmp"),
  };
  global.navigator = { vibrate:null };
  global.localStorage = {
    getItem:k => (k in store ? store[k] : null),
    setItem:(k,v)=>{ store[k]=String(v); },
  };

  let clock = now;
  global.__clock = { now:()=>clock, advance:ms=>{clock+=ms;} };
  const RealDate = Date;
  global.Date = class extends RealDate { static now(){ return clock; } };

  const timers=[];
  global.setInterval = fn => { timers.push(fn); return timers.length; };
  global.clearInterval = () => { timers.length=0; };
  global.setTimeout = () => 0;
  global.__tick = () => timers.slice().forEach(f=>f());
  global.__timers = () => timers.length;

  global.Blob = class {};
  global.URL = { createObjectURL:()=>"blob:x", revokeObjectURL(){} };
  global.__confirmAnswer = true;
  global.__confirmCalls = [];
  global.confirm = msg => { global.__confirmCalls.push(msg); return global.__confirmAnswer; };

  global.__notifications = [];
  if(notification){
    global.Notification = function(t,o){ global.__notifications.push(o.body); };
    global.Notification.permission = "granted";
    global.Notification.requestPermission = () => Promise.resolve("granted");
  } else { delete global.Notification; }

  global.__audio = { oscs: [] };
  window.AudioContext = function(){
    const ctx = {
      state:"running", currentTime:0, resume(){}, destination:{},
      createOscillator(){
        const o = { type:"sine", freq:null, startT:null, stops:[],
          frequency:{ setValueAtTime(v){ o.freq = v; }, exponentialRampToValueAtTime(){} },
          connect(){ return { connect(){ return {}; } }; },
          start(t){ o.startT = t ?? ctx.currentTime; global.__audio.oscs.push(o); },
          stop(t){ o.stops.push(t ?? 0); },
        };
        return o;
      },
      createGain(){ return {
        gain:{ setValueAtTime(){}, exponentialRampToValueAtTime(){} },
        connect(){ return { connect(){ return {}; } }; },
        disconnect(){},
      }; },
    };
    return ctx;
  };
  window.webkitAudioContext = window.AudioContext;
  global.addEventListener = () => {};
  global.location = { hash:(global.location && global.location.hash) || "",
    origin:"https://vguttikonda07.github.io", pathname:"/timgo/", search:"" };
  global.__hashCleared = 0;
  global.history = { replaceState(){ global.__hashCleared++; global.location.hash=""; } };

  const path = require('path');
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const src = html.split('<script>')[1].split('</script>')[0];
  eval(src + `
    ;globalThis.__app = {
      get segs(){return segs}, set segs(v){segs=v},
      get active(){return active}, get left(){return left},
      get running(){return running}, get done(){return done},
      get presets(){return presets}, set presets(v){presets=v},
      get loaded(){return loaded}, get endsAt(){return endsAt},
      toggle, skip, reset, sync, render, applyPreset, notify, parseDur, fmtDur, totalSec, clockOf,
      back, extend, moveSeg, dupSeg, repeatAll, liveResize, rewind, get started(){return started},
      askConfirm, closeConfirm, applyTheme, THEMES, HUES,
      encodePreset, decodeShared, shareUrl, receiveShared, sanitizePreset, showToast,
      get theme(){return theme},
      get sound(){return sound}, set sound(v){sound=v}, SOUNDS, SOUND_ORDER, beep, preview, tickSound,
      secsOf, drawPresets, buildList, savePresets, advance, splitDur, readRow, rowUnit,
    };
  `);
  global.__setHidden = h => {
    global.document.hidden = h;
    global.document.visibilityState = h ? "hidden" : "visible";
    const fn = global.document._l["visibilitychange"];
    if(Array.isArray(fn)) fn.forEach(f => f()); else if(fn) fn();
  };
  return { nodes, app:global.__app, store };
}
module.exports = { boot };

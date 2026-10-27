const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const html=fs.readFileSync('dist/picnic.html','utf8');
let source=html.match(/<script>([\s\S]*?)<\/script>/)[1];
source=source.replace('})();',`globalThis.gameTest={start,update,pause,finish,draw,resize,catchObject,player,get state(){return {mode,score,caught,remaining,owned:[...owned],objects}},setObjects(v){objects=v},setElapsed(v){elapsed=v}};})();`);
const noop=()=>{};
const storage=new Map();
function boot(width=760,query=''){
 const elements={},handlers={};let frame;let rect={width,height:420,left:0,top:0};
 const context=new Proxy({createLinearGradient:()=>({addColorStop:noop})},{get:(obj,key)=>obj[key]||noop,set:(obj,key,value)=>(obj[key]=value,true)});
 const el=id=>elements[id]??={value:'',textContent:'',innerHTML:'',style:{},open:false,hidden:false,classList:{add:noop,remove:noop},setAttribute:noop,focus:noop,select:noop,addEventListener:(event,fn)=>handlers[id+':'+event]=fn,getBoundingClientRect:()=>rect,getContext:()=>context,setPointerCapture:noop,showModal(){this.open=true},close(){this.open=false}};
 const scope={console,Math,URL,URLSearchParams,devicePixelRatio:1,document:{getElementById:el,querySelectorAll:()=>[],querySelector:()=>el('heading'),addEventListener:noop},location:{search:query,href:'https://example.test/'+query},history:{replaceState:noop},navigator:{clipboard:{writeText:async()=>{}}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},ResizeObserver:class{observe(){}},requestAnimationFrame:fn=>frame=fn,addEventListener:(event,fn)=>handlers[event]=fn};
 scope.window=scope;vm.createContext(scope);vm.runInContext(fs.readFileSync('dist/rewards.js','utf8'),scope);vm.runInContext(source,scope);return {g:scope.gameTest,e:elements,handlers,frame:()=>frame,resize(w,h){rect={...rect,width:w,height:h};scope.gameTest.resize()}};
}
const test=boot();const {g,e,handlers}=test;
g.start();assert.equal(g.state.mode,'playing');
// Catching a falling plushie at the basket awards points and a persistent friend.
g.setObjects([{type:'doll',id:0,x:g.player.x,y:351,r:25,speed:100,age:0}]);g.update(.02);
assert.equal(g.state.score,10);assert.equal(g.state.caught,1);assert.ok(g.state.owned.includes(0));assert.equal(g.state.objects.length,0);
g.catchObject({type:'doll',id:1,x:300,y:350});assert.equal(g.state.score,30);g.catchObject({type:'doll',id:2,x:300,y:350});assert.equal(g.state.score,60);
// Rain costs points but cannot end the picnic or push points below zero.
for(let i=0;i<6;i++)g.catchObject({type:'cloud',x:300,y:350});assert.equal(g.state.score,0);assert.equal(g.state.mode,'playing');
// A missed plushie causes no penalty.
g.setObjects([{type:'doll',id:3,x:0,y:475,r:25,speed:100,age:0}]);g.update(.02);assert.equal(g.state.score,0);assert.equal(g.state.mode,'playing');
g.pause();assert.equal(g.state.mode,'paused');g.pause();assert.equal(g.state.mode,'playing');
// Timer completion and replay reset the round while retaining the shelf.
g.setObjects([]);g.setElapsed(59.99);g.update(.02);assert.equal(g.state.mode,'over');const rewards=JSON.parse(storage.get('kitty-adventures-v1'));assert.equal(rewards.picnics,1);assert.equal(rewards.balance,16);g.finish();assert.equal(JSON.parse(storage.get('kitty-adventures-v1')).balance,16);g.start();assert.equal(g.state.score,0);assert.ok(g.state.owned.includes(0));assert.equal(g.state.remaining,60);
const restored=boot(375);assert.equal(restored.g.state.owned.length,3);restored.g.draw(100);restored.g.start();restored.handlers['game:pointerdown']({clientX:10000,pointerId:1});restored.g.update(.05);assert.ok(restored.g.player.x<=326);restored.resize(320,330);restored.g.draw(200);assert.ok(restored.g.player.x<=271);
// Gift text is rendered as text, including characters that resemble HTML.
const gift=boot(760,'?to=%3Cem%3ESweetie%3C%2Fem%3E&note=You%20are%20my%20sunshine');assert.equal(gift.e.noteTitle.textContent,'For <em>Sweetie</em>,');assert.equal(gift.e.noteBody.textContent,'You are my sunshine');
console.log('PASS: basket collision, streak scoring, cloud penalty, missed dolls, pause/resume, timer, replay, saved shelf, touch bounds, mobile drawing, gift text.');

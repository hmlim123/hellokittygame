/* Shared, browser-local progression for both games. Pure rules are testable without a renderer. */
(function(root){
'use strict';
const KEY='kitty-adventures-v1';
const SHOP=[
 {id:'sky',name:'Blueberry sky',type:'theme',cost:10,icon:'☁',description:'A powder-blue room and lavender rug.'},
 {id:'hearts',name:'Heart garland',type:'decoration',cost:20,icon:'💕',description:'A string of rosy hearts above the shelf.'},
 {id:'gold',name:'Honey afternoon',type:'theme',cost:30,icon:'☀',description:'Golden walls and a honey-colored rug.'},
 {id:'garden',name:'Little flower garden',type:'decoration',cost:40,icon:'🌷',description:'Extra blossoms around Kitty’s cozy rug.'},
 {id:'twilight',name:'Starlight lavender',type:'theme',cost:55,icon:'🌙',description:'A dreamy purple room for quiet evenings.'},
 {id:'crown',name:'Sweetheart crown',type:'accessory',cost:70,icon:'👑',description:'A tiny golden crown for your 3D Kitty.'}
];
const MILESTONES=[
 {rounds:1,bonus:5,name:'First little adventure',icon:'🌱',note:'Every lovely collection begins with one little moment. This one is yours.'},
 {rounds:3,bonus:8,name:'Picnic pal',icon:'🍓',note:'A strawberry, a giggle, and a friend beside you. The little things are the sweetest.'},
 {rounds:5,bonus:12,name:'Cozy companion',icon:'🧸',note:'There is always a soft place waiting for you here.'},
 {rounds:10,bonus:20,name:'Sunshine sweetheart',icon:'🌷',note:'You bring a little sunshine into every room you enter.'},
 {rounds:20,bonus:30,name:'Keeper of little joys',icon:'✨',note:'Look at all the happy moments you have collected. There are still more to come.'},
 {rounds:35,bonus:50,name:'Forever besties',icon:'💌',note:'A whole world of little adventures, and you are still my favorite part. ♡'}
];
const num=n=>Number.isFinite(n)?Math.max(0,Math.min(1000000,Math.floor(n))):0;
function normalize(raw={}){
 raw=raw&&typeof raw==='object'?raw:{};
 const owned=SHOP.filter(g=>Array.isArray(raw.owned)&&raw.owned.includes(g.id)).map(g=>g.id),equipped={};
 for(const type of ['theme','decoration','accessory'])equipped[type]=SHOP.some(g=>g.type===type&&g.id===raw.equipped?.[type]&&owned.includes(g.id))?raw.equipped[type]:null;
 return {balance:num(raw.balance),earned:num(raw.earned),rounds:num(raw.rounds),picnics:num(raw.picnics),hunts:num(raw.hunts),owned,equipped,milestones:MILESTONES.filter(m=>Array.isArray(raw.milestones)&&raw.milestones.includes(m.rounds)).map(m=>m.rounds),lastDay:typeof raw.lastDay==='string'?raw.lastDay:'',recent:Array.isArray(raw.recent)?raw.recent.filter(x=>typeof x==='string').slice(-100):[]};
}
function localDay(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
function award(state,{id,game,catches=0,completed=false,day=localDay()}){
 if(!id||!['picnic','hunt'].includes(game)||state.recent.includes(id))return null;
 catches=Math.min(game==='picnic'?15:8,num(catches));
 if(!catches)return null;
 state.recent.push(id);state.recent=state.recent.slice(-100);
 let amount=catches+(completed?(game==='picnic'?3:4):0),daily=0;const unlocked=[];
 if(completed){state.rounds++;state[game==='picnic'?'picnics':'hunts']++;
  if(day>state.lastDay){daily=5;amount+=daily;state.lastDay=day;}
  for(const m of MILESTONES)if(state.rounds>=m.rounds&&!state.milestones.includes(m.rounds)){state.milestones.push(m.rounds);amount+=m.bonus;unlocked.push(m);}
 }
 state.balance+=amount;state.earned+=amount;
 return {amount,daily,unlocked,completed};
}
function purchase(state,id){const item=SHOP.find(g=>g.id===id);if(!item)return 'unknown';if(state.owned.includes(id))return 'owned';if(state.balance<item.cost)return 'insufficient';state.balance-=item.cost;state.owned.push(id);state.equipped[item.type]=id;return 'purchased';}
function equip(state,id){const item=SHOP.find(g=>g.id===id);if(!item||!state.owned.includes(id))return false;state.equipped[item.type]=state.equipped[item.type]===id?null:id;return true;}
function readJSON(key){try{return JSON.parse(localStorage.getItem(key)||'{}')||{};}catch{return {};}}
function load(){return normalize(readJSON(KEY));}
function save(state){try{localStorage.setItem(KEY,JSON.stringify(state));return true;}catch{return false;}}
function record(round){const state=load(),result=award(state,round);return result?{...result,saved:save(state)}:null;}
function roundId(){return Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);}
function collection(){return [...new Set([0,...['kitty-room-3d-v1','kitty-picnic-v1'].flatMap(k=>{const a=readJSON(k).owned;return Array.isArray(a)?a.filter(n=>Number.isInteger(n)&&n>=0&&n<6):[];})])].sort();}
function resultText(result){if(!result)return 'Catch a little friend to earn bow tokens next time. ♡';return `+${result.amount} bow tokens${result.daily?' · includes your +5 first-game gift':''}${result.unlocked.length?' · New milestone: '+result.unlocked.map(m=>m.name).join(', '):''}.${result.saved===false?' Progress could not be saved in this browser.':''}`;}
root.KittyRewards={KEY,SHOP,MILESTONES,normalize,award,purchase,equip,load,save,record,roundId,collection,resultText,localDay};
})(globalThis);

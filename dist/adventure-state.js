import {normalizeState,rewardDoll} from './state.js';
function map(w,h,objects,walls=[]){const rows=Array.from({length:h},(_,z)=>Array.from({length:w},(_,x)=>x===0||z===0||x===w-1||z===h-1?'#':'.'));for(const [x,z] of walls)rows[z][x]='#';for(const o of objects){if(o.type==='H')for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)rows[o.z+dz][o.x+dx]='H';rows[o.z][o.x]=o.type;}return {rows:rows.map(r=>r.join('')),objects,w,h};}
export const MAPS={
 village:{...map(15,11,[{type:'M',x:5,z:5},{type:'F',x:8,z:5},{type:'D',x:12,z:2},{type:'o',x:4,z:3},{type:'o',x:10,z:7},{type:'H',x:2,z:2},{type:'H',x:2,z:8}]),title:'Rosemilk Village',spawn:[7,8]},
 garden:{...map(15,13,[{type:'E',x:7,z:12},{type:'G',x:7,z:5},{type:'Q',x:8,z:6},{type:'S',x:7,z:2},{type:'T',x:3,z:3},{type:'T',x:11,z:3},{type:'C',id:'rose',x:3,z:7},{type:'C',id:'honey',x:11,z:7},{type:'C',id:'sky',x:4,z:10}],Array.from({length:13},(_,i)=>[i+1,5]).concat([[5,8],[5,9],[9,8],[9,9]])),title:'Moonflower Garden',spawn:[7,10]}
};
const DIRECTIONS={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
export function walkable(state,x,z){const t=MAPS[state.map]?.rows[z]?.[x];return t==='.'||t==='D'||t==='E'||t==='G'&&state.gate;}
export function normalizeAdventure(raw={}){
 raw=raw&&typeof raw==='object'?raw:{};
 const charms=[...new Set((Array.isArray(raw.charms)?raw.charms:[]).filter(x=>['rose','honey','sky'].includes(x)))];
 const accepted=raw.accepted===true||charms.length>0,guardian=raw.guardian===true&&charms.length===3,gate=raw.gate===true&&guardian;
 const state={version:1,map:raw.map==='garden'&&accepted?'garden':'village',x:raw.x,z:raw.z,facing:Object.hasOwn(DIRECTIONS,raw.facing)?raw.facing:'down',accepted,charms,guardianStep:guardian?3:charms.length===3?Math.min(2,Math.max(0,Number.isInteger(raw.guardianStep)?raw.guardianStep:0)):0,guardian,gate,complete:raw.complete===true&&gate};
 if(!Number.isInteger(state.x)||!Number.isInteger(state.z)||!walkable(state,state.x,state.z))[state.x,state.z]=MAPS[state.map].spawn;
 return state;
}
export function questText(s){
 if(s.complete)return 'Moonflower restored! A little happy ending for Nancy.';
 if(!s.accepted)return 'Meet Momo by the fountain, or enter the upper-right pink arch to begin.';
 if(s.map==='village')return 'Enter Moonflower Garden, the dungeon through the pink arch in the upper-right.';
 if(s.charms.length<3)return `Open the three treasure chests: ${s.charms.length} / 3 moon charms.`;
 if(!s.guardian)return 'Help the cloud guardian beside the moon gate.';
 if(!s.gate)return 'Open the moon gate in the northern wall.';
 return 'Reach the moonflower shrine beyond the gate.';
}
export function enterAdventurePath(s,tile){
 if(!MAPS[s.map].objects.some(o=>o.type===tile)||!['D','E'].includes(tile))return {moved:false};
 if(tile==='D'){
  s.accepted=true;
  s.map='garden';[s.x,s.z]=MAPS.garden.spawn;
 }else{s.map='village';[s.x,s.z]=[12,3];}
 return {moved:true,changedMap:true};
}
export function moveAdventure(s,direction){
 const delta=DIRECTIONS[direction];if(!delta)return {moved:false};s.facing=direction;
 const [dx,dz]=delta,x=s.x+dx,z=s.z+dz;if(!walkable(s,x,z))return {moved:false};
 const tile=MAPS[s.map].rows[z][x];
 if(tile==='D'||tile==='E')return enterAdventurePath(s,tile);
 s.x=x;s.z=z;return {moved:true};
}
export function nearbyObject(s){
 const [dx,dz]=DIRECTIONS[s.facing];
 return MAPS[s.map].objects.find(o=>o.x===s.x+dx&&o.z===s.z+dz)||MAPS[s.map].objects.find(o=>Math.abs(o.x-s.x)+Math.abs(o.z-s.z)===1||o.type==='H'&&Math.max(Math.abs(o.x-s.x),Math.abs(o.z-s.z))===2);
}
// Give the next walkable step, including when the entrance is outside the camera.
export function villageDirections(s){
 if(s.map!=='village')return '';
 const target=MAPS.village.objects.find(o=>o.type===(s.accepted?'D':'M'));
 const name=s.accepted?'Dungeon entrance':'Momo';
 const queue=[{x:s.x,z:s.z,first:null,steps:0}],seen=new Set([`${s.x},${s.z}`]);
 for(let i=0;i<queue.length;i++){
  const p=queue[i];
  if(Math.abs(p.x-target.x)+Math.abs(p.z-target.z)===1){
   if(!p.steps)return s.accepted?'Pink arch · press Enter dungeon to go inside':'Momo is beside you · press Talk to Momo';
   return `${{up:'↑',down:'↓',left:'←',right:'→'}[p.first]} ${name} · ${p.steps} ${p.steps===1?'step':'steps'} away`;
  }
  for(const [d,[dx,dz]] of Object.entries(DIRECTIONS)){
   const x=p.x+dx,z=p.z+dz,key=`${x},${z}`;
   if(!seen.has(key)&&walkable(s,x,z)&&MAPS.village.rows[z][x]!=='D'){seen.add(key);queue.push({x,z,first:p.first||d,steps:p.steps+1});}
  }
 }
 return `${name} · follow the cream path`;
}
export function interactAdventure(s,choice){
 const o=nearbyObject(s);if(!o)return {speaker:'Kitty',text:'Let’s look around. Walk next to a friend, a chest, or a sign, then interact.'};
 if(o.type==='D'||o.type==='E'){
  return enterAdventurePath(s,o.type);
 }
 if(o.type==='M'){
  if(choice==='accept')s.accepted=true;
  return {speaker:'Momo',text:s.complete?'The garden is glowing again. You brought a little kindness to this world, Nancy. ♡':s.accepted?'Three moon charms are hidden in the garden chests. Enter the pink arch in the northeast. The cloud by the gate could use a kind friend, too.':'Nancy, the moonflower has lost its glow. Will you help me find its three moon charms?',choices:s.accepted?[]:[{id:'accept',label:'Let’s help!'}]};
 }
 if(o.type==='H')return {speaker:'A cozy little cottage',text:'A home full of little things and warm wishes. Momo is outside by the village fountain. ♡'};
 if(o.type==='T')return {speaker:'A warm little lantern',text:'Follow the path to the moonflower. A little light is enough for the next step.'};
 if(o.type==='F')return {speaker:'Village fountain',text:'A quiet wish, a tiny ripple. Your progress saves after each step and discovery.'};
 if(o.type==='o')return {speaker:'Little flowers',text:'Every adventure can begin with one small, kind step. ♡'};
 if(o.type==='C'){
  const found=s.charms.includes(o.id);if(!found)s.charms.push(o.id);
  return {speaker:'Treasure found',text:found?'This chest is already open. Your moon charm is safe in your bag.':`A ${o.id} moon charm! ${s.charms.length} of 3 are tucked safely in your bag.`,chime:!found};
 }
 if(o.type==='Q'){
  if(s.guardian)return {speaker:'Cloud guardian',text:'Thank you for listening. The moon gate is ready for your three charms. ♡'};
  if(s.charms.length<3)return {speaker:'Cloud guardian',text:'I feel a little lost. Find the three moon charms, then come sit with me for a moment.'};
  const steps=[['listen','I’m nervous. Could you listen for a little while?'],['story','That helped. Could you tell me a cheerful little story?'],['wave','I feel braver. Will you wave with me?']];
  const expected=steps[s.guardianStep][0];let prefix='';
  if(choice){if(choice===expected){s.guardianStep++;if(s.guardianStep===3){s.guardian=true;return {speaker:'Cloud guardian',text:'A little listening, a little story, and a friendly wave. I feel ready! Your charms can open the moon gate now.',chime:true,wave:true};}}else prefix='That’s kind of you. What I need right now is a little different. ';}
  return {speaker:'Cloud guardian',text:prefix+steps[s.guardianStep][1],choices:[{id:'listen',label:'Listen'},{id:'story',label:'Tell a story'},{id:'wave',label:'Wave hello'}]};
 }
 if(o.type==='G'){
  if(!s.guardian||s.charms.length<3)return {speaker:'Moon gate',text:'Three charms and a friend’s brave heart will open this gate. Check your quest above.'};
  s.gate=true;return {speaker:'Moon gate',text:'The three charms glow together. The path to the moonflower is open!',chime:true};
 }
 if(o.type==='S'){
  if(!s.gate)return {speaker:'Moonflower',text:'The moon gate is still waiting for its charms.'};
  s.complete=true;return {speaker:'A moonflower for Nancy',text:'The little garden glows again. You found the treasure, helped a new friend, and brought the moonflower home in your heart. ♡',complete:true,chime:true};
 }
 return {speaker:'Kitty',text:'Step through the arch to continue your adventure.'};
}
export function claimAdventureReward(storage){
 try{
  const read=k=>{try{return JSON.parse(storage.getItem(k)||'{}');}catch{return {};}};
  const s=normalizeAdventure(read('kitty-nancy-adventure-v1'));if(!s.complete)return {claimed:false};
  const room=normalizeState(read('kitty-room-3d-v1'),read('kitty-picnic-v1'));
  if(room.adventureRewarded)return {claimed:false,already:true};
  const doll=rewardDoll(room);room.adventureRewarded=true;
  storage.setItem('kitty-room-3d-v1',JSON.stringify(room));return {claimed:true,name:doll?.name||null};
 }catch{return {claimed:false,saveFailed:true};}
}

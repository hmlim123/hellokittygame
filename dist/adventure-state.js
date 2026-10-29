import {questJournal} from './adventure-quests.js?v=adventure-7';
import {normalizeState,rewardDoll} from './state.js';
function map(w,h,objects,walls=[]){const rows=Array.from({length:h},(_,z)=>Array.from({length:w},(_,x)=>x===0||z===0||x===w-1||z===h-1?'#':'.'));for(const [x,z] of walls)rows[z][x]='#';for(const o of objects){if(o.type==='H')for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)rows[o.z+dz][o.x+dx]='H';rows[o.z][o.x]=o.type;}return {rows:rows.map(r=>r.join('')),objects,w,h};}
export const MAPS={
 village:{...map(15,11,[{type:'M',x:5,z:5},{type:'F',x:8,z:5},{type:'D',x:12,z:2},{type:'o',x:4,z:3},{type:'o',x:10,z:7},{type:'H',x:2,z:2},{type:'H',x:2,z:8},{type:'R',id:'rose',x:5,z:2},{type:'R',id:'sky',x:12,z:8},{type:'R',id:'honey',x:4,z:4}]),title:'Rosemilk Village',spawn:[7,8]},
 garden:{...map(15,13,[{type:'E',x:7,z:12},{type:'G',x:7,z:5},{type:'Q',x:8,z:6},{type:'S',x:7,z:2},{type:'T',id:'west',x:3,z:3},{type:'T',id:'east',x:11,z:3},{type:'B',id:'west',x:2,z:10},{type:'B',id:'east',x:12,z:10},{type:'C',id:'rose',x:3,z:7},{type:'C',id:'honey',x:11,z:7},{type:'C',id:'sky',x:4,z:10}],Array.from({length:13},(_,i)=>[i+1,5]).concat([[5,8],[5,9],[9,8],[9,9]])),title:'Moonflower Garden',spawn:[7,10]}
};
const DIRECTIONS={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
export function walkable(state,x,z){const t=MAPS[state.map]?.rows[z]?.[x];return t==='.'||t==='D'||t==='E'||t==='R'||t==='B'||t==='G'&&state.gate;}
export function normalizeAdventure(raw={}){
 raw=raw&&typeof raw==='object'?raw:{};
 const charms=[...new Set((Array.isArray(raw.charms)?raw.charms:[]).filter(x=>['rose','honey','sky'].includes(x)))];
 const accepted=raw.accepted===true||charms.length>0,guardian=raw.guardian===true&&charms.length===3,gate=raw.gate===true&&guardian;
 const unique=(v,allowed)=>[...new Set((Array.isArray(v)?v:[]).filter(x=>allowed.includes(x)))];
 const ribbons=unique(raw.ribbons,['rose','sky','honey']),berries=unique(raw.berries,['west','east']),litLanterns=raw.complete===true&&gate?unique(raw.litLanterns,['west','east']):[];
 const state={version:2,ribbons,berries,litLanterns,ribbonReturned:raw.ribbonReturned===true&&ribbons.length===3,picnicDelivered:raw.picnicDelivered===true&&berries.length===2,lanternsBlessed:raw.lanternsBlessed===true&&litLanterns.length===2,trackedQuest:['ribbons','picnic','lanterns'].includes(raw.trackedQuest)?raw.trackedQuest:'moonflower',map:raw.map==='garden'&&accepted?'garden':'village',x:raw.x,z:raw.z,facing:Object.hasOwn(DIRECTIONS,raw.facing)?raw.facing:'down',accepted,charms,guardianStep:guardian?3:charms.length===3?Math.min(2,Math.max(0,Number.isInteger(raw.guardianStep)?raw.guardianStep:0)):0,guardian,gate,complete:raw.complete===true&&gate};
 if(!Number.isInteger(state.x)||!Number.isInteger(state.z)||!walkable(state,state.x,state.z))[state.x,state.z]=MAPS[state.map].spawn;
 return state;
}
export function questText(s){
 if(s.trackedQuest&&s.trackedQuest!=='moonflower'){const q=questJournal(s).find(q=>q.id===s.trackedQuest);return q.done?q.title+' · complete!':q.progress;}
 if(s.complete)return s.ribbonReturned&&s.picnicDelivered&&s.lanternsBlessed?'All four quests complete! Nancy’s little world is glowing. ♡':'Moonflower restored! More little quests await in Inventory → Quest.';
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
 const map=MAPS[s.map],remaining=type=>map.objects.filter(o=>o.type===type),closest=list=>list.sort((a,b)=>(Math.abs(a.x-s.x)+Math.abs(a.z-s.z))-(Math.abs(b.x-s.x)+Math.abs(b.z-s.z)))[0];
 let target;
 if(s.trackedQuest==='ribbons'&&!s.ribbonReturned)target=s.map==='village'?(s.ribbons.length===3?remaining('M')[0]:closest(remaining('R').filter(o=>!s.ribbons.includes(o.id)))):remaining('E')[0];
 else if(s.trackedQuest==='picnic'&&!s.picnicDelivered)target=s.map==='village'?(s.berries.length===2?remaining('M')[0]:remaining('D')[0]):s.berries.length===2?remaining('E')[0]:closest(remaining('B').filter(o=>!s.berries.includes(o.id)));
 else if(s.trackedQuest==='lanterns'&&s.complete&&!s.lanternsBlessed)target=s.map==='village'?remaining('D')[0]:s.litLanterns.length===2?remaining('S')[0]:closest(remaining('T').filter(o=>!s.litLanterns.includes(o.id)));
 else if(s.map==='village')target=remaining(s.accepted?'D':'M')[0];
 if(!target)return '';
 const name=({D:'Dungeon entrance',E:'Village path',M:'Momo',R:'Lost ribbon',B:'Picnic berries',T:'Garden lantern',S:'Moonflower shrine'})[target.type];
 const queue=[{x:s.x,z:s.z,first:null,steps:0}],seen=new Set([`${s.x},${s.z}`]);
 for(let i=0;i<queue.length;i++){
  const p=queue[i];
  if(Math.abs(p.x-target.x)+Math.abs(p.z-target.z)<=1){
   if(!p.steps)return target.type==='D'?'Pink arch · walk through or tap to enter':target.type==='M'?'Momo is beside you · a little quest awaits':target.type==='E'?'Village path · walk through or tap to return':name+' is beside you · walk up to discover';
   return `${{up:'↑',down:'↓',left:'←',right:'→'}[p.first]} ${name} · ${p.steps} ${p.steps===1?'step':'steps'} away`;
  }
  for(const [d,[dx,dz]] of Object.entries(DIRECTIONS)){
   const x=p.x+dx,z=p.z+dz,key=`${x},${z}`;
   if(!seen.has(key)&&walkable(s,x,z)&&!['D','E'].includes(map.rows[z][x])){seen.add(key);queue.push({x,z,first:p.first||d,steps:p.steps+1});}
  }
 }
 return `${name} · follow the cream path`;
}
export class AdventureEncounters{
 constructor(){this.contacts=new Set();}
 key(s,o,equipment={}){return `${s.map}:${o.type}:${o.id||''}:${o.type==='M'?`${s.ribbonReturned}:${s.picnicDelivered}:${s.ribbons.length}:${s.berries.length}:${equipment.item||''}`:o.type==='S'?String(s.litLanterns.length):o.type==='G'&&s.guardian?'ready':o.type==='Q'&&s.charms.length===3?'ready':'waiting'}`;}
 take(s,equipment={}){
  const near=MAPS[s.map].objects.filter(o=>['M','C','Q','G','S','R','B','T'].includes(o.type)&&Math.abs(o.x-s.x)+Math.abs(o.z-s.z)<=1);
  const keys=new Set(near.map(o=>this.key(s,o,equipment)));this.contacts=new Set([...this.contacts].filter(k=>keys.has(k)));
  const eligible=o=>o.type==='R'?!s.ribbons.includes(o.id):o.type==='B'?!s.berries.includes(o.id):o.type==='T'?s.complete&&!s.litLanterns.includes(o.id):o.type==='M'?!s.accepted||s.ribbons.length===3&&!s.ribbonReturned||s.berries.length===2&&!s.picnicDelivered:o.type==='C'?!s.charms.includes(o.id):o.type==='Q'?!s.guardian:o.type==='G'?!s.gate:s.gate&&(!s.complete||s.litLanterns.length===2&&!s.lanternsBlessed);
  const rank=o=>o.type==='Q'&&s.charms.length===3?5:o.type==='G'&&s.guardian?4:o.type==='C'||o.type==='S'?3:o.type==='M'?2:1;
  const o=near.filter(o=>eligible(o)&&!this.contacts.has(this.key(s,o,equipment))).sort((a,b)=>rank(b)-rank(a))[0];
  if(o)this.contacts.add(this.key(s,o,equipment));return o;
 }
 mark(s,o,equipment={}){if(o)this.contacts.add(this.key(s,o,equipment));}
}
export function interactAdventure(s,choice,target=nearbyObject(s),equipment={}){
 const o=MAPS[s.map].objects.includes(target)?target:null;
 const result=interactObject(s,choice,o,equipment);
 return {...result,source:o,art:result.art||({M:'momo',C:o?.id,Q:'cloud',G:'gate',S:'moonflower',R:'rose',B:'berry',T:'lantern'})[o?.type]||null};
}
function interactObject(s,choice,o,equipment){
 if(!o)return {speaker:'Kitty',text:'Let’s look around. Walk next to a friend, a chest, or a sign, then interact.'};
 if(o.type==='D'||o.type==='E'){
  return enterAdventurePath(s,o.type);
 }
 if(o.type==='R'){const found=s.ribbons.includes(o.id);if(!found)s.ribbons.push(o.id);return {speaker:'A lost ribbon!',text:`${s.ribbons.length} of 3 ribbons found. Bring them back to Momo by the village fountain.`,chime:!found};}
 if(o.type==='B'){const found=s.berries.includes(o.id);if(!found)s.berries.push(o.id);return {speaker:'Picnic berries',text:`${s.berries.length} of 2 berry bushes visited. When both are picked, equip Sweet strawberry and bring Momo a picnic.`,chime:!found};}
 if(o.type==='M'){
  if(s.ribbons.length===3&&!s.ribbonReturned){s.ribbonReturned=true;return {speaker:'Momo’s ribbons are home!',text:'Thank you, Nancy! Your Berry sweetheart outfit is waiting in Inventory → Clothes, in the adventure and at home.',chime:true,questComplete:'ribbons'};}
  if(s.berries.length===2&&!s.picnicDelivered){if(equipment.item==='strawberry'){s.picnicDelivered=true;return {speaker:'A picnic for Momo',text:'A sweet picnic together! A little picnic basket is waiting in Kitty’s room as a memory of your kindness.',chime:true,questComplete:'picnic',art:'berry'};}return {speaker:'Momo',text:'Those berries look lovely! Equip Sweet strawberry in Inventory → Items, then come back for our picnic.'};}

  if(choice==='accept')s.accepted=true;
  return {speaker:'Momo',text:s.complete?'The garden is glowing again. You brought a little kindness to this world, Nancy. ♡':s.accepted?'Three moon charms are hidden in the garden chests. Enter the pink arch in the northeast. The cloud by the gate could use a kind friend, too.':'Nancy, the moonflower has lost its glow. Will you help me find its three moon charms?',choices:s.accepted?[]:[{id:'accept',label:'Let’s help!'}]};
 }
 if(o.type==='H')return {speaker:'A cozy little cottage',text:'A home full of little things and warm wishes. Momo is outside by the village fountain. ♡'};
 if(o.type==='T'&&s.complete){const found=s.litLanterns.includes(o.id);if(!found)s.litLanterns.push(o.id);return {speaker:'A lantern awakens',text:`${s.litLanterns.length} of 2 lanterns are glowing. Visit both, then return to the moonflower shrine.`,chime:!found};}
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
  if(s.complete&&s.litLanterns.length===2&&!s.lanternsBlessed){s.lanternsBlessed=true;return {speaker:'A little light for home',text:'The garden lanterns shine together. A moon lantern is now glowing in Kitty’s room, just for Nancy.',chime:true,questComplete:'lanterns',art:'lantern'};}
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

import test from 'node:test';
import assert from 'node:assert/strict';
import {MAPS,normalizeAdventure,walkable,moveAdventure,interactAdventure,claimAdventureReward,questText,villageDirections,enterAdventurePath,AdventureEncounters} from '../dist/adventure-state.js';
function route(s,x,z){
 const queue=[[s.x,s.z,[]]],seen=new Set([`${s.x},${s.z}`]);
 for(let i=0;i<queue.length;i++){const [a,b,path]=queue[i];if(a===x&&b===z)return path;for(const [d,dx,dz] of [['up',0,-1],['down',0,1],['left',-1,0],['right',1,0]]){const nx=a+dx,nz=b+dz,k=`${nx},${nz}`;if(!seen.has(k)&&walkable(s,nx,nz)){seen.add(k);queue.push([nx,nz,[...path,d]]);}}}return null;
}
function go(s,x,z){const p=route(s,x,z);assert.ok(p,`Route to ${x},${z}`);for(const d of p)assert.equal(moveAdventure(s,d).moved,true);}
function complete(){
 const s=normalizeAdventure();go(s,5,6);interactAdventure(s,'accept');assert.equal(s.accepted,true);go(s,12,2);assert.equal(s.map,'garden');
 assert.equal(route(s,7,3),null);
 for(const [x,z,dir] of [[3,8,'up'],[11,8,'up'],[4,11,'up']]){go(s,x,z);s.facing=dir;interactAdventure(s);}
 assert.equal(s.charms.length,3);go(s,7,6);s.facing='right';interactAdventure(s,'story');assert.equal(s.guardianStep,0);
 for(const action of ['listen','story','wave'])interactAdventure(s,action);
 assert.equal(s.guardian,true);s.facing='up';interactAdventure(s);assert.equal(s.gate,true);go(s,7,3);s.facing='up';assert.equal(interactAdventure(s).complete,true);return s;
}
test('the complete village and dungeon route is reachable and opens in quest order',()=>{const s=complete();assert.equal(s.complete,true);assert.match(questText(s),/restored/);});
test('the village arch starts the quest automatically while the moon gate remains locked',()=>{
 const s=normalizeAdventure();assert.equal(moveAdventure(s,'invalid').moved,false);
 s.x=12;s.z=3;assert.equal(moveAdventure(s,'up').changedMap,true);assert.equal(s.map,'garden');assert.equal(s.accepted,true);
 s.x=7;s.z=6;assert.equal(moveAdventure(s,'up').moved,false);
});
test('approaching starts the quest and opens chests once without interaction buttons',()=>{
 const e=new AdventureEncounters(),s=normalizeAdventure({x:5,z:6});
 const momo=e.take(s);assert.equal(momo.type,'M');interactAdventure(s,'accept',momo);assert.equal(s.accepted,true);assert.equal(e.take(s),undefined);
 Object.assign(s,{map:'garden',x:3,z:8});const chest=e.take(s);assert.equal(chest.id,'rose');const reveal=interactAdventure(s,undefined,chest);
 assert.equal(reveal.art,'rose');assert.equal(reveal.chime,true);assert.deepEqual(s.charms,['rose']);assert.equal(e.take(s),undefined);
 s.x=4;s.z=9;e.take(s);s.x=3;s.z=8;assert.equal(e.take(s),undefined,'Collected treasure never triggers again');
});
test('encounters rearm only after leaving, and the guardian takes priority over a nearby locked gate',()=>{
 const e=new AdventureEncounters(),s=normalizeAdventure({accepted:true,map:'garden',x:7,z:6,charms:['rose','honey','sky']});
 const cloud=e.take(s);assert.equal(cloud.type,'Q');e.mark(s,MAPS.garden.objects.find(o=>o.type==='G'));assert.equal(e.take(s),undefined);
 for(const choice of ['listen','story','wave'])interactAdventure(s,choice,cloud);
 const gate=e.take(s);assert.equal(gate.type,'G');interactAdventure(s,undefined,gate);assert.equal(s.gate,true);assert.equal(e.take(s),undefined);
 Object.assign(s,{x:7,z:3});const shrine=e.take(s);assert.equal(shrine.type,'S');interactAdventure(s,undefined,shrine);assert.equal(s.complete,true);assert.equal(e.take(s),undefined);
 const hint=normalizeAdventure({accepted:true,map:'garden',x:8,z:7}),visits=new AdventureEncounters();assert.equal(visits.take(hint).type,'Q');assert.equal(visits.take(hint),undefined);
 hint.z=9;visits.take(hint);hint.z=7;assert.equal(visits.take(hint).type,'Q');
});
test('chests never duplicate charms and corrupt progress cannot open the shrine',()=>{
 const s=normalizeAdventure({accepted:true,map:'garden',x:3,z:8,facing:'up'});interactAdventure(s);interactAdventure(s);assert.deepEqual(s.charms,['rose']);
 const broken=normalizeAdventure({map:'bad',x:-100,z:500,accepted:false,charms:['rose','rose','bad'],guardian:true,gate:true,complete:true});assert.equal(broken.guardian,false);assert.equal(broken.complete,false);assert.equal(broken.gate,false);assert.equal(walkable(broken,broken.x,broken.z),true);
});
test('completion reward is one atomic room save and preserves existing collections',()=>{
 const s=complete(),data=new Map([['kitty-nancy-adventure-v1',JSON.stringify(s)],['kitty-room-3d-v1',JSON.stringify({owned:[0,2],theme:'mint'})],['kitty-picnic-v1',JSON.stringify({owned:[4]})]]);let writes=0;
 const storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>{writes++;data.set(k,v);}};
 assert.equal(claimAdventureReward(storage).claimed,true);assert.equal(writes,1);
 const room=JSON.parse(data.get('kitty-room-3d-v1'));assert.deepEqual(room.owned,[0,2,4,1]);assert.equal(room.theme,'mint');assert.equal(room.adventureRewarded,true);
 assert.equal(claimAdventureReward(storage).already,true);assert.equal(writes,1);
 assert.equal(claimAdventureReward({getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('blocked');}}).claimed,false);
});
test('completed saves round-trip and returning through the garden path reaches the village',()=>{
 const s=complete();assert.deepEqual(normalizeAdventure(JSON.parse(JSON.stringify(s))),s);go(s,7,12);assert.equal(s.map,'village');assert.equal(walkable(s,s.x,s.z),true);
});
test('interacting beside the entrance starts the quest from every side without needing Momo',()=>{
 for(const [x,z] of [[12,3],[11,2],[13,2],[12,1]]){
  const s=normalizeAdventure({x,z});
  assert.equal(interactAdventure(s).changedMap,true);assert.equal(s.map,'garden');assert.equal(s.accepted,true);assert.deepEqual([s.x,s.z],MAPS.garden.spawn);
  go(s,7,11);assert.equal(interactAdventure(s).changedMap,true);assert.equal(s.map,'village');assert.deepEqual([s.x,s.z],[12,3]);
 }
});
test('tapping a visible arch enters directly and invalid paths cannot change progress',()=>{
 const s=normalizeAdventure(),before=structuredClone(s);
 for(const path of ['bad','E','C',null])assert.equal(enterAdventurePath(s,path).moved,false);
 assert.deepEqual(s,before);assert.equal(enterAdventurePath(s,'D').changedMap,true);assert.equal(s.accepted,true);
 assert.equal(enterAdventurePath(s,'D').moved,false);assert.equal(enterAdventurePath(s,'E').changedMap,true);assert.equal(s.map,'village');
});
test('village hints lead around obstacles to Momo and then to the off-screen dungeon entrance',()=>{
 const dirs={'↑':'up','↓':'down','←':'left','→':'right'};
 for(const start of [{},{x:12,z:1}]){
 const s=normalizeAdventure(start);
 for(const accepted of [false,true]){
  s.accepted=accepted;
  let steps=0;
  while(dirs[villageDirections(s)[0]]){assert.equal(moveAdventure(s,dirs[villageDirections(s)[0]]).moved,true);assert.ok(++steps<40);}
  assert.match(villageDirections(s),accepted?/walk through or tap/:/little quest awaits/);
  assert.equal(s.map,'village');assert.equal(steps>0,true);
 }
 interactAdventure(s);assert.equal(s.map,'garden');assert.equal(villageDirections(s),'');
 }
});

test('ribbon and picnic quests are reachable, require the equipped item, and cannot award twice',()=>{
 const s=normalizeAdventure({accepted:true});
 for(const [id,x,z] of [['rose',5,3],['sky',12,9],['honey',4,5]]){go(s,x,z);interactAdventure(s,undefined,MAPS.village.objects.find(o=>o.type==='R'&&o.id===id));}
 go(s,5,6);assert.equal(interactAdventure(s).questComplete,'ribbons');assert.equal(s.ribbonReturned,true);assert.equal(interactAdventure(s).questComplete,undefined);
 go(s,12,2);for(const [id,x,z] of [['west',3,10],['east',11,10]]){go(s,x,z);interactAdventure(s,undefined,MAPS.garden.objects.find(o=>o.type==='B'&&o.id===id));}
 go(s,7,12);go(s,5,6);const momo=MAPS.village.objects.find(o=>o.type==='M');
 assert.match(interactAdventure(s,undefined,momo,{item:'none'}).text,/Equip Sweet strawberry/);assert.equal(s.picnicDelivered,false);
 assert.equal(interactAdventure(s,undefined,momo,{item:'strawberry'}).questComplete,'picnic');assert.equal(interactAdventure(s,undefined,momo,{item:'strawberry'}).questComplete,undefined);
 assert.deepEqual(normalizeAdventure(s),s);
});
test('lantern quest follows the original ending and old completed saves gain optional quests safely',()=>{
 const s=complete();
 for(const [id,x,z] of [['west',3,4],['east',11,4]]){go(s,x,z);assert.equal(interactAdventure(s,undefined,MAPS.garden.objects.find(o=>o.type==='T'&&o.id===id)).chime,true);}
 go(s,7,3);assert.equal(interactAdventure(s).questComplete,'lanterns');assert.equal(s.lanternsBlessed,true);assert.deepEqual(normalizeAdventure(s),s);
 const e=new AdventureEncounters();assert.equal(e.take(s),undefined);
 const corrupt=normalizeAdventure({ribbons:['rose','rose'],ribbonReturned:true,berries:['bad'],picnicDelivered:true,litLanterns:['west','east'],lanternsBlessed:true});
 assert.equal(corrupt.ribbonReturned,false);assert.equal(corrupt.picnicDelivered,false);assert.equal(corrupt.lanternsBlessed,false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {normalizeState} from '../dist/state.js';
const storage=new Map(),scope={localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)}};
vm.createContext(scope);vm.runInContext(fs.readFileSync('dist/rewards.js','utf8'),scope);const R=scope.KittyRewards;
test('both games contribute to a shared wallet, milestones and one first-game daily bonus',()=>{
 const s=R.normalize();let r=R.award(s,{id:'p1',game:'picnic',catches:20,completed:true,day:'2026-10-23'});
 assert.equal(r.amount,28);assert.equal(s.rounds,1);assert.equal(s.picnics,1);
 r=R.award(s,{id:'h1',game:'hunt',catches:8,completed:true,day:'2026-10-23'});assert.equal(r.amount,12);assert.equal(r.daily,0);assert.equal(s.balance,40);assert.equal(s.hunts,1);
 r=R.award(s,{id:'p2',game:'picnic',catches:3,completed:true,day:'2026-10-25'});assert.equal(r.amount,19);assert.equal(r.daily,5);assert.equal(s.rounds,3);assert.equal(r.unlocked[0].rounds,3);
});
test('partial hunts keep earned bows without advancing milestones; empty and repeated results do not pay',()=>{
 const s=R.normalize();assert.equal(R.award(s,{id:'empty',game:'picnic',catches:0,completed:true}),null);
 assert.equal(R.award(s,{id:'partial',game:'hunt',catches:3,completed:false}).amount,3);assert.equal(s.rounds,0);
 assert.equal(R.award(s,{id:'partial',game:'hunt',catches:3,completed:false}),null);assert.equal(s.balance,3);
});
test('gifts debit once, persist, and can only equip owned items',()=>{
 let s=R.normalize();assert.equal(R.purchase(s,'crown'),'insufficient');assert.equal(R.equip(s,'crown'),false);s.balance=100;
 assert.equal(R.purchase(s,'crown'),'purchased');assert.equal(s.balance,30);assert.equal(s.equipped.accessory,'crown');assert.equal(R.purchase(s,'crown'),'owned');assert.equal(s.balance,30);
 R.save(s);s=R.load();assert.equal(s.equipped.accessory,'crown');R.equip(s,'crown');assert.equal(s.equipped.accessory,null);R.equip(s,'crown');assert.equal(s.equipped.accessory,'crown');
});
test('rewards continue after the full collection and milestones; replay/reload cannot double award',()=>{
 const s=R.normalize();let result;
 for(let i=0;i<40;i++)result=R.award(s,{id:'round'+i,game:'hunt',catches:8,completed:true,day:'2026-10-23'});
 assert.equal(s.milestones.length,6);assert.equal(result.amount,12);assert.equal(s.rounds,40);
 R.save(s);assert.equal(R.record({id:'round39',game:'hunt',catches:8,completed:true}),null);assert.equal(R.load().rounds,40);
});
test('corrupt saves cannot create negative balances, arbitrary gifts, or equipped locked items',()=>{
 const s=R.normalize({balance:-4,earned:Infinity,owned:['sky','sky','bad'],equipped:{theme:'twilight',accessory:'crown'}});
 assert.equal(s.balance,0);assert.equal(s.earned,0);assert.equal(s.owned.length,1);assert.equal(s.equipped.theme,null);assert.equal(s.equipped.accessory,null);assert.equal(R.normalize(null).balance,0);
});
test('picnic friends merge into an existing arranged room, preserving positions and both old saves',()=>{
 const s=normalizeState({owned:[0,1],slots:[1,null,null,0,null,null],theme:'mint'},{owned:[2,3]});
 assert.deepEqual(s.owned,[0,1,2,3]);assert.equal(s.slots[0],1);assert.equal(s.slots[3],0);assert.equal(s.slots.filter(n=>n!==null).length,4);assert.equal(s.theme,'mint');
 storage.set('kitty-picnic-v1',JSON.stringify({owned:[2,3]}));storage.set('kitty-room-3d-v1',JSON.stringify({owned:[0,1]}));assert.equal(Array.from(R.collection()).join(','),'0,1,2,3');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeEquipment,equip,OUTFITS} from '../dist/equipment-state.js';
test('equipment migrates the room gift without changing old saves and repairs invalid selections',()=>{
 const legacy={heldGift:'teddy'},raw={outfit:'missing',item:'bad'};
 assert.deepEqual(normalizeEquipment(raw,{},legacy),{version:1,outfit:'classic',item:'teddy'});assert.deepEqual(legacy,{heldGift:'teddy'});
 assert.deepEqual(normalizeEquipment(null,null),{version:1,outfit:'classic',item:'flowers'});
 assert.equal(normalizeEquipment({outfit:'sailor',item:'none'}).item,'none');
 assert.equal(normalizeEquipment({outfit:'picnic',item:'letter'}).outfit,'classic');
});
test('clothes unlock from quest discoveries and equipment changes never alter quest progress',()=>{
 const quest={charms:['honey'],complete:false},before=structuredClone(quest),equipment=normalizeEquipment();
 assert.equal(equip(equipment,'outfit','picnic',quest),true);assert.equal(equip(equipment,'outfit','moonlight',quest),false);assert.equal(equipment.outfit,'picnic');assert.deepEqual(quest,before);
 quest.complete=true;assert.equal(equip(equipment,'outfit','moonlight',quest),true);assert.equal(normalizeEquipment(equipment,quest).outfit,'moonlight');
 for(const [kind,id] of [['unknown','teddy'],['item','invented'],['outfit','invented']])assert.equal(equip(equipment,kind,id,quest),false);
 assert.equal(OUTFITS.filter(o=>o.unlock({})).length,2);
});

test('shared choices merge with the latest equipment and expose quest-earned clothes in either place',async()=>{
 const {readWardrobe,saveEquipmentChoice}=await import('../dist/equipment-storage.js');
 const data=new Map([['kitty-nancy-adventure-v1',JSON.stringify({accepted:true,charms:['honey']})],['kitty-nancy-equipment-v1',JSON.stringify({outfit:'picnic',item:'flowers'})]]);
 const storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
 assert.equal(readWardrobe(storage).equipment.outfit,'picnic');
 const changed=saveEquipmentChoice(storage,'item','teddy',{equipment:{outfit:'classic',item:'flowers'}});
 assert.equal(changed.saved,true);assert.equal(changed.equipment.outfit,'picnic');assert.equal(changed.equipment.item,'teddy');
 assert.equal(saveEquipmentChoice(storage,'outfit','moonlight').accepted,false);
 assert.deepEqual(JSON.parse(data.get('kitty-nancy-adventure-v1')).charms,['honey']);
});
test('shared equipment tolerates blocked storage and corrupt saves',async()=>{
 const {readWardrobe,saveEquipmentChoice}=await import('../dist/equipment-storage.js');
 const blocked={getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('blocked');}},fallback={equipment:{outfit:'sailor',item:'none'}};
 assert.equal(readWardrobe(blocked,fallback).equipment.outfit,'sailor');
 const selected=saveEquipmentChoice(blocked,'item','letter',fallback);assert.equal(selected.accepted,true);assert.equal(selected.saved,false);assert.equal(selected.equipment.item,'letter');
 assert.equal(readWardrobe({getItem:()=>'{broken'}).equipment.outfit,'classic');
});

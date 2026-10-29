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

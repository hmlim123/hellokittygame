import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCare,addCare,claimSurprise,localDay,SURPRISES} from '../dist/care.js';
test('pets and treats add hearts without changing the plushie collection',()=>{
  const care=normalizeCare();assert.equal(addCare(care,'pet'),true);addCare(care,'treat');assert.equal(care.hearts,3);assert.equal(addCare(care,'unknown'),false);assert.equal(care.hearts,3);
});
test('a daily surprise can only be collected once per local date and survives reload',()=>{
  let care=normalizeCare();assert.equal(claimSurprise(care,'2026-10-23').id,0);care=normalizeCare(JSON.parse(JSON.stringify(care)));
  assert.equal(claimSurprise(care,'2026-10-23'),null);assert.equal(claimSurprise(care,'2026-10-22'),null);assert.equal(care.hearts,3);
  assert.equal(claimSurprise(care,'2026-10-24').id,1);assert.equal(care.hearts,6);
});
test('all seven daily stickers unlock before repeats and corrupt saves are repaired',()=>{
  const care=normalizeCare();for(let day=1;day<=8;day++)assert.ok(claimSurprise(care,`2026-10-${String(day).padStart(2,'0')}`));
  assert.equal(care.gifts.length,SURPRISES.length);assert.equal(care.visits,8);
  assert.deepEqual(normalizeCare({hearts:-20,gifts:[0,0,6,99,'1'],lastDay:null,visits:NaN}),{hearts:0,lastDay:'',gifts:[0,6],visits:0});
  assert.equal(localDay(new Date(2026,9,23,23,59)),'2026-10-23');
});

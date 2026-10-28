import test from 'node:test';
import assert from 'node:assert/strict';
import {FriendArrival} from '../dist/friend-arrival.js';
import {createHunt,catchBow,tickHunt} from '../dist/state.js';
import {RoomSound} from '../dist/sound.js';
test('friend arrives, waves and reaches the shelf with a single completion signal',()=>{
  const a=new FriendArrival([1,2,-2.65]);
  assert.equal(a.advance(0).phase,'enter');
  assert.equal(a.advance(1.6).phase,'wave');assert.equal(a.advance(2.3).phase,'settle');
  const last=a.advance(1);assert.equal(last.justFinished,true);assert.deepEqual(last.position,[1,2,-2.65]);assert.equal(last.scale,.51);
  assert.equal(a.advance(10).justFinished,false);
});
test('reduced motion arrival settles immediately, with no entrance path',()=>{
  const p=new FriendArrival([0,.65,-2.65],true).advance(0);
  assert.equal(p.phase,'done');assert.deepEqual(p.position,[0,.65,-2.65]);
});
test('relaxed hunts retain all catches without time pressure and still complete once',()=>{
  const h=createHunt({relaxed:true});tickHunt(h,3600);assert.equal(h.active,true);assert.equal(h.time,45);
  h.paused=true;assert.equal(catchBow(h),false);h.paused=false;
  for(let i=0;i<8;i++)assert.equal(catchBow(h),true);
  assert.equal(h.complete,true);assert.equal(catchBow(h),false);
  const timed=createHunt();tickHunt(timed,45);assert.equal(timed.active,false);
});
test('sound is opt-in and gracefully unavailable without a Web Audio implementation',async()=>{
  const sound=new RoomSound();assert.equal(sound.context,null);assert.equal(sound.enabled,false);
  sound.chime('arrival');assert.equal(sound.context,null);assert.equal(await sound.toggle(),false);sound.stop();
});
test('rapid sound toggles cannot create duplicate music timers while audio resumes',async()=>{
  let resume,created=0;const saved=globalThis.AudioContext;
  globalThis.AudioContext=class{constructor(){created++;this.state='running';}resume(){return new Promise(r=>resume=r);}};
  const sound=new RoomSound();sound.musicNote=()=>{};
  try{const pending=sound.toggle();assert.equal(await sound.toggle(),false);assert.equal(created,1);resume();assert.equal(await pending,true);sound.stop();assert.equal(sound.enabled,false);assert.equal(sound.timer,null);}
  finally{sound.stop();if(saved)globalThis.AudioContext=saved;else delete globalThis.AudioContext;}
});

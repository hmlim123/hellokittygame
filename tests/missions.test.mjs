import test from 'node:test';
import assert from 'node:assert/strict';
import {createMission,tickMission,actMission,replayMemory,normalizeJournal,recordMission} from '../dist/missions.js';
test('bow and strawberry missions have different goals and complete exactly once',()=>{
 for(const [id,goal] of [['bows',8],['strawberries',6]]){
  const m=createMission(id);for(let i=0;i<goal;i++)assert.equal(actMission(m,i%4).accepted,true);
  assert.equal(m.complete,true);assert.equal(m.active,false);assert.equal(m.hits,goal);assert.equal(actMission(m,0).accepted,false);
 }
 assert.throws(()=>createMission('unknown'));
});
test('timed missions expire; relaxed missions and paused missions keep their progress',()=>{
 const m=createMission('strawberries');m.paused=true;tickMission(m,100);assert.equal(m.time,40);assert.equal(actMission(m,0).accepted,false);
 m.paused=false;tickMission(m,40);assert.equal(m.active,false);assert.equal(m.complete,false);
 const relaxed=createMission('strawberries',{relaxed:true});tickMission(relaxed,3600);assert.equal(relaxed.active,true);assert.equal(relaxed.time,40);
});
test('memory teaches a sequence before accepting input; mistakes replay without awarding completion',()=>{
 let i=0;const m=createMission('hearts',{random:()=>[.1,.3,.6,.9][i++]});assert.deepEqual(m.sequence,[0,1,2,3]);assert.equal(m.time,null);
 assert.equal(actMission(m,0).accepted,false);tickMission(m,.7);assert.equal(m.flash,0);tickMission(m,4);assert.equal(m.phase,'play');
 actMission(m,0);assert.equal(actMission(m,3).mistake,true);assert.equal(m.hits,0);assert.equal(m.phase,'show');assert.equal(m.complete,false);
 tickMission(m,4);for(const n of m.sequence)actMission(m,n);assert.equal(m.complete,true);assert.equal(replayMemory(m),false);assert.equal(actMission(m,0).accepted,false);
});
test('memory pause freezes cues and replay resets only the current attempt',()=>{
 const m=createMission('hearts');m.paused=true;tickMission(m,5);assert.equal(m.clock,0);assert.equal(replayMemory(m),false);
 m.paused=false;tickMission(m,4);actMission(m,m.sequence[0]);assert.equal(m.hits,1);assert.equal(replayMemory(m),true);assert.equal(m.hits,0);assert.equal(m.phase,'show');
});
test('keepsakes sanitize corrupt storage and remember first completion without duplicate notes',()=>{
 const j=normalizeJournal({completed:{bows:-9,strawberries:'100',hearts:Infinity,unknown:7}});assert.deepEqual(j.completed,{bows:0,strawberries:0,hearts:0,picnic:0});
 assert.equal(recordMission(j,'hearts'),true);assert.equal(recordMission(j,'hearts'),false);assert.equal(j.completed.hearts,2);assert.equal(recordMission(j,'unknown'),false);
 assert.deepEqual(normalizeJournal(JSON.parse(JSON.stringify(j))),j);
});

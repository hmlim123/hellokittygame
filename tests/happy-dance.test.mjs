import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from '../dist/vendor/GLTFLoader.js';
import {makeBlenderKitty,blenderClips,reactBlender,updateBlender,blenderExpression} from '../dist/blender-kitty.js';
import {applyEquipment} from '../dist/equipment-model.js';
const assets=[];
for(const style of ['classic','cloud','witch','baby','kitten','bunny']){
 const bytes=await readFile(new URL('../dist/assets/'+(style==='classic'?'hello-kitty.glb':'plush/'+style+'.glb'),import.meta.url));
 const loader=new GLTFLoader().register(()=>({name:'NodeTextureBinding',loadTexture(){return Promise.resolve(new THREE.Texture());}}));
 const g=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');assets.push({style,asset:{scene:g.scene,clips:blenderClips(g.animations)}});
}
function step(hero,seconds){for(let t=0;t<seconds-1e-7;t+=1/60)updateBlender(hero,Math.min(1/60,seconds-t));hero.updateMatrixWorld(true);}
function floorOf(mesh){const p=new THREE.Vector3();let y=Infinity;for(let i=0;i<mesh.geometry.attributes.position.count;i++){p.fromBufferAttribute(mesh.geometry.attributes.position,i).applyMatrix4(mesh.matrixWorld);y=Math.min(y,p.y);}return y;}
function span(values){return Math.max(...values)-Math.min(...values);}
test('all six have a six-second Blender happy dance with broad paw swings, real steps, hops and happy eyes',()=>{
 for(const {style,asset}of assets){
  const hero=makeBlenderKitty(asset),b=hero.userData.blender;assert.equal(b.model.getObjectByName('CTRL_Root').userData.dance_library,'happy-step-v1');
  assert.ok(Math.abs(b.actions.dance.getClip().duration-6)<.001);assert.ok(Math.abs(b.actions.danceHeld.getClip().duration-6)<.001);
  const root=b.model.getObjectByName('CTRL_Root'),arms=['L','R'].map(s=>b.model.getObjectByName('CTRL_Arm_'+s)),feet=[-1,1].map(s=>b.model.getObjectByName('Foot_'+s));
  const x=[],up=[],lateral=[[],[]],armMax=[0,0];let happy=false;
  reactBlender(hero,'dance');
  for(let i=0;i<=360;i++){
   if(i)updateBlender(hero,1/60);hero.updateMatrixWorld(true);
   const p=root.getWorldPosition(new THREE.Vector3());x.push(p.x);up.push(p.y);
   for(let j=0;j<2;j++){armMax[j]=Math.max(armMax[j],arms[j].quaternion.angleTo(new THREE.Quaternion()));lateral[j].push(feet[j].getWorldPosition(new THREE.Vector3()).x);}
   if(blenderExpression(hero)==='softHappy')happy=true;
  }
  assert.ok(span(x)>.22,style+' needs visible side-to-side travel');assert.ok(span(up)>.085,style+' hops must be visible');
  assert.ok(armMax.every(a=>a>1.25),style+' paw swings are still too small: '+armMax);assert.ok(lateral.every(a=>span(a)>.2),style+' feet must step, not just bob');assert.ok(happy,style+' should smile during its dance');
  step(hero,.5);assert.equal(b.current,null);assert.equal(blenderExpression(hero),'open');assert.deepEqual(b.restWeights,[1,1]);
 }
});
test('planted dance feet stay on the floor without sliding, and happy hops lift both feet',()=>{
 for(const {style,asset}of assets){
  const hero=makeBlenderKitty(asset),b=hero.userData.blender,feet=[-1,1].map(s=>b.model.getObjectByName('Foot_'+s)),ctrl=['L','R'].map(s=>b.model.getObjectByName('CTRL_Foot_'+s));
  reactBlender(hero,'dance');let previous=null,bothUp=false,planted=0;
  for(let frame=0;frame<=360;frame++){
   if(frame)updateBlender(hero,1/60);hero.updateMatrixWorld(true);
   const samples=feet.map((foot,i)=>({y:floorOf(foot),p:ctrl[i].getWorldPosition(new THREE.Vector3())}));
   if(samples.every(s=>s.y>.075))bothUp=true;
   for(let i=0;i<2;i++){
    assert.ok(samples[i].y>-.004,style+' foot sinks below the floor at '+(frame/60)+': '+samples[i].y);
    if(previous&&samples[i].y<.002&&previous[i].y<.002){planted++;assert.ok(Math.hypot(samples[i].p.x-previous[i].p.x,samples[i].p.z-previous[i].p.z)<.0075,style+' planted foot slides at '+frame/60);}
   }
   previous=samples;
  }
  assert.ok(planted>100);assert.ok(bothUp,style+' needs an actual two-foot happy hop');
 }
});
test('occupied-paw dance keeps gifts at the original grip while retaining the full footwork',()=>{
 for(const {style,asset}of assets){
  const hero=makeBlenderKitty(asset),b=hero.userData.blender;applyEquipment(hero,{outfit:'classic',item:'flowers'});hero.updateMatrixWorld(true);
  const body=b.model.getObjectByName('CTRL_Body'),bouquet=b.model.getObjectByName('CTRL_Bouquet'),paws=['L','R'].map(s=>b.model.getObjectByName('Socket_Paw_'+s));
  const grip=()=>paws.map(o=>body.worldToLocal(o.getWorldPosition(new THREE.Vector3())).sub(body.worldToLocal(bouquet.getWorldPosition(new THREE.Vector3()))));
  const expected=grip();reactBlender(hero,'dance');assert.equal(b.current,b.actions.danceHeld);const x=[];
  for(let i=0;i<60;i++){
   step(hero,.1);x.push(b.model.getObjectByName('CTRL_Root').getWorldPosition(new THREE.Vector3()).x);
   grip().forEach((v,j)=>assert.ok(v.distanceTo(expected[j])<.001,style+' loses its held gift'));
   for(const side of ['L','R'])assert.ok(b.model.getObjectByName('CTRL_Arm_'+side).quaternion.angleTo(new THREE.Quaternion())<.001);
  }
  assert.ok(span(x)>.22);assert.ok(b.restWeights.every(w=>w<.001));
 }
});
test('changing items mid-dance preserves the beat, and waving can interrupt cleanly',()=>{
 for(const {asset}of assets){
  const hero=makeBlenderKitty(asset),b=hero.userData.blender;reactBlender(hero,'dance');step(hero,1.3);const time=b.current.time,position=b.model.getObjectByName('CTRL_Root').position.clone();
  applyEquipment(hero,{outfit:'classic',item:'teddy'});updateBlender(hero,.01);assert.equal(b.current,b.actions.danceHeld);assert.ok(Math.abs(b.current.time-time-.01)<.001);assert.ok(b.model.getObjectByName('CTRL_Root').position.distanceTo(position)<.04);
  step(hero,.5);assert.ok(b.restWeights.every(w=>w<.001));assert.equal(b.fading.length,0);
  const heldTime=b.current.time;applyEquipment(hero,{outfit:'classic',item:'none'});updateBlender(hero,.01);assert.equal(b.current,b.actions.dance);assert.ok(Math.abs(b.current.time-heldTime-.01)<.001);
  reactBlender(hero,'wave');step(hero,1.3);assert.equal(blenderExpression(hero),'wink');step(hero,3);assert.equal(b.current,null);assert.deepEqual(b.restWeights,[1,1]);
 }
});
test('reduced motion gives happy eyes without moving the rig',()=>{
 for(const {asset}of assets){
  const hero=makeBlenderKitty(asset),b=hero.userData.blender,root=b.model.getObjectByName('CTRL_Root'),bind=root.position.clone();
  reactBlender(hero,'dance',true);updateBlender(hero,.5,{reduced:true});assert.equal(b.current,null);assert.equal(blenderExpression(hero),'softHappy');assert.ok(root.position.distanceTo(bind)<1e-6);
  updateBlender(hero,1,{reduced:true});assert.equal(blenderExpression(hero),'open');
 }
});

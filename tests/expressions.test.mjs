import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from '../dist/vendor/GLTFLoader.js';
import {makeBlenderKitty,blenderClips,reactBlender,updateBlender,blenderExpression,FACE_SHAPES} from '../dist/blender-kitty.js';
import {applyEquipment} from '../dist/equipment-model.js';
import {startEmptyPaws,EMPTY_PAWS_KEY} from '../dist/empty-paws.js';
const assets=[];
for(const style of ['classic','cloud','witch','baby','kitten','bunny']){
 const bytes=await readFile(new URL('../dist/assets/'+(style==='classic'?'hello-kitty.glb':'plush/'+style+'.glb'),import.meta.url));
 const loader=new GLTFLoader().register(()=>({name:'NodeTextureBinding',loadTexture(){return Promise.resolve(new THREE.Texture());}}));
 const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 assets.push({style,asset:{scene:gltf.scene,clips:blenderClips(gltf.animations)}});
}
test('all six Blender models have five distinct authored expressions that restore and can be interrupted',()=>{
 for(const {style,asset} of assets){
  const hero=makeBlenderKitty(asset),b=hero.userData.blender;
  assert.equal(b.model.getObjectByName('CTRL_Root').userData.expression_library,'expressions-v1');
  assert.equal(Object.keys(b.actions).length,19);
  for(const [name,shape] of Object.entries(FACE_SHAPES)){
   reactBlender(hero,name);updateBlender(hero,b.actions[name].getClip().duration/2);
   assert.equal(blenderExpression(hero),name,style+' '+name);
   const eyes=b.morphs.filter(o=>o.morphTargetDictionary.Sleepy!==undefined);assert.ok(eyes.length>=2);assert.ok(b.model.getObjectByName("Eye_left"));assert.ok(b.model.getObjectByName("Eye_right"));
   assert.ok(eyes.every(o=>o.morphTargetInfluences[o.morphTargetDictionary[shape]]>.9));
   assert.ok(b.restWeight>.99,'empty paws should remain relaxed while expressing');
   updateBlender(hero,5);assert.equal(blenderExpression(hero),'open');assert.equal(b.current,null);
  }
  reactBlender(hero,'shy');updateBlender(hero,1);reactBlender(hero,'wave');updateBlender(hero,1.3);
  assert.equal(blenderExpression(hero),'wink');assert.equal(b.fading.length,0);
  updateBlender(hero,4);assert.equal(blenderExpression(hero),'open');
 }
});
test('empty paws lower the fused arm surface; held items and baking retain their authored grip',()=>{
 for(const {style,asset}of assets){
  const hero=makeBlenderKitty(asset),b=hero.userData.blender;
  const arms=b.morphs.filter(o=>o.morphTargetDictionary.EmptyRest!==undefined);assert.equal(arms.length,2);
  for(const arm of arms){
   const i=arm.morphTargetDictionary.EmptyRest,delta=arm.geometry.morphAttributes.position[i];
   let largest=0,smallest=Infinity;
   for(let v=0;v<delta.count;v++){const d=new THREE.Vector3().fromBufferAttribute(delta,v).length();largest=Math.max(largest,d);smallest=Math.min(smallest,d);}
   assert.ok(largest>.2,style+' missing lowered paw');assert.ok(smallest<.005,'shoulder root must stay anchored');
   assert.equal(arm.morphTargetInfluences[i],1);
  }
  const bouquet=b.model.getObjectByName('CTRL_Bouquet');let visible=false;bouquet.traverse(o=>{if(o.isMesh&&o.visible)visible=true;});assert.equal(visible,false);
  applyEquipment(hero,{outfit:'classic',item:'flowers'});updateBlender(hero,1);
  assert.ok(b.restWeight<.001);assert.ok(b.gifts.original.every(o=>o.visible));
  reactBlender(hero,'shy');updateBlender(hero,1);assert.ok(b.restWeight<.001,'expression must not move paws away from their gift');
  applyEquipment(hero,{outfit:'classic',item:'none'});updateBlender(hero,5);assert.ok(b.restWeight>.99);
  b.heldAttachment='spoon';updateBlender(hero,1);assert.ok(b.restWeight<.001);
  b.heldAttachment=null;reactBlender(hero,'placeTray');updateBlender(hero,2.28);assert.ok(b.restWeight<.001);
 }
});
test('reduced motion shows static authored expressions and clears them without head movement',()=>{
 for(const {asset}of assets){
  const hero=makeBlenderKitty(asset),b=hero.userData.blender;
  for(const name of Object.keys(FACE_SHAPES)){
   reactBlender(hero,name,true);updateBlender(hero,.3,{reduced:true});assert.equal(blenderExpression(hero),name);assert.equal(b.current,null);
   assert.deepEqual(b.headIdle.rotation.toArray(),[0,0,0,'XYZ']);
   updateBlender(hero,1.1,{reduced:true});assert.equal(blenderExpression(hero),'open');
  }
 }
});
test('the automatic bouquet is retired once without resetting progress or other items',()=>{
 const data=new Map([['kitty-nancy-gift-start-v1','1'],['kitty-world-v2','progress'],['kitty-nancy-cozy-v1','stories']]);
 const storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
 const chosen={version:1,outfit:'sailor',plush:'bunny',item:'flowers'};
 assert.deepEqual(startEmptyPaws(storage,chosen),{...chosen,item:'none'});assert.equal(chosen.item,'flowers');assert.equal(data.get(EMPTY_PAWS_KEY),'1');
 assert.equal(startEmptyPaws(storage,chosen).item,'flowers','flowers selected later must persist');
 assert.equal(data.get('kitty-world-v2'),'progress');assert.equal(data.get('kitty-nancy-cozy-v1'),'stories');assert.equal(data.get('kitty-nancy-gift-start-v1'),'1');
 for(const item of ['teddy','letter','strawberry','watering','ribbon','lantern']){data.delete(EMPTY_PAWS_KEY);assert.equal(startEmptyPaws(storage,{...chosen,item}).item,item);}
 const blocked={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};assert.equal(startEmptyPaws(blocked,chosen).item,'none');
});

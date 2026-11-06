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
  assert.equal(b.model.getObjectByName('CTRL_Root').userData.empty_paw_pose,'soft-sides-v2');
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
   let largest=0;
   for(let v=0;v<delta.count;v++){const d=new THREE.Vector3().fromBufferAttribute(delta,v).length();largest=Math.max(largest,d);}
   assert.ok(largest>.2,style+' missing lowered paw');
   assert.equal(arm.morphTargetInfluences[i],1);
   // Inspect the palm vertices themselves: lowering the old cupped fist is
   // insufficient. Empty palms belong beside the skirt, back from the chest.
   hero.updateMatrixWorld(true);
   const base=new THREE.Vector3(),rest=new THREE.Vector3(),center=new THREE.Vector3();let palms=0;
   for(let v=0;v<arm.geometry.attributes.position.count;v++){
    base.fromBufferAttribute(arm.geometry.attributes.position,v).applyMatrix4(arm.matrixWorld);
    if(base.z<.82*b.baseScale)continue;
    arm.getVertexPosition(v,rest).applyMatrix4(arm.matrixWorld);center.add(rest);palms++;
   }
   assert.ok(palms>100);center.divideScalar(palms);
   assert.ok(Math.abs(center.x)>.46,style+' empty paw is still curled inward: '+center.toArray());
   assert.ok(center.z<.26,style+' empty paw still reaches forward to hold an invisible item');
   assert.ok(center.y<.66,style+' empty paw should settle below the chest');
   // Check the actual joint: the new shoulder surface must overlap the sleeve,
   // and its controller must stay at the bind pivot. A resculpt may move every
   // vertex, so an unchanged vertex is not evidence of a connected shoulder.
   const side=arm.name.endsWith('-1')?-1:1;
   const shoulder=b.model.getObjectByName('Pink_shoulder_'+side);
   shoulder.geometry.computeBoundingBox();
   const box=shoulder.geometry.boundingBox,c=box.getCenter(new THREE.Vector3()),r=box.getSize(new THREE.Vector3()).multiplyScalar(.5);
   const inverse=shoulder.matrixWorld.clone().invert();let joined=0;
   for(let v=0;v<arm.geometry.attributes.position.count;v++){
    arm.getVertexPosition(v,rest).applyMatrix4(arm.matrixWorld).applyMatrix4(inverse).sub(c).divide(r);
    if(rest.lengthSq()<.9)joined++;
   }
   assert.ok(joined>30,style+' resting arm separates from its sleeve: '+joined);
   const joint=b.model.getObjectByName(side<0?'CTRL_Arm_L':'CTRL_Arm_R').getWorldPosition(new THREE.Vector3());
   const bind=new THREE.Vector3(side*.77*b.baseScale,2.12*b.baseScale+b.normalize.position.y,.39*b.baseScale);
   assert.ok(joint.distanceTo(bind)<.001,'rest must keep the original shoulder bind position');
  }
  const bouquet=b.model.getObjectByName('CTRL_Bouquet');let visible=false;bouquet.traverse(o=>{if(o.isMesh&&o.visible)visible=true;});assert.equal(visible,false);
  hero.updateMatrixWorld(true);const center=new THREE.Box3().setFromObject(bouquet).getCenter(new THREE.Vector3());
  const ray=new THREE.Raycaster(center.clone().add(new THREE.Vector3(0,0,10)),new THREE.Vector3(0,0,-1));
  assert.equal(ray.intersectObject(bouquet,true).length,0,'hidden flowers must not capture touches');
  applyEquipment(hero,{outfit:'classic',item:'flowers'});updateBlender(hero,1);
  assert.ok(b.restWeight<.001);assert.ok(b.gifts.original.every(o=>o.visible));assert.ok(ray.intersectObject(bouquet,true).length>0,'selected flowers must remain touchable');
  reactBlender(hero,'shy');updateBlender(hero,1);assert.ok(b.restWeight<.001,'expression must not move paws away from their gift');
  for(const item of ['teddy','letter','strawberry']){
   applyEquipment(hero,{outfit:'classic',item});hero.updateMatrixWorld(true);
   const prop=b.gifts.cache.get(item),p=new THREE.Box3().setFromObject(prop).getCenter(new THREE.Vector3());
   const touch=new THREE.Raycaster(p.clone().add(new THREE.Vector3(0,0,10)),new THREE.Vector3(0,0,-1));
   assert.ok(touch.intersectObject(prop,true).length>0,item+' should be touchable while equipped');
   applyEquipment(hero,{outfit:'classic',item:'none'});assert.equal(touch.intersectObject(prop,true).length,0,item+' should not intercept empty-paw touches');
  }
  updateBlender(hero,5);assert.ok(b.restWeight>.99);
  b.heldAttachment='spoon';updateBlender(hero,1);assert.ok(b.restWeight<.001);
  b.heldAttachment=null;reactBlender(hero,'placeTray');updateBlender(hero,2.28);assert.ok(b.restWeight<.001);
 }
});

test('empty paws stay relaxed for head-only gestures and the non-waving arm stays down',()=>{
 for(const {style,asset}of assets){
  const hero=makeBlenderKitty(asset),b=hero.userData.blender;
  for(const kind of ['pet','tilt','kiss','bow','surprise','dance','celebrate']){
   reactBlender(hero,kind);updateBlender(hero,.7);
   assert.ok(b.restWeights.every(w=>w>.99),style+' curls empty paws during '+kind);
   updateBlender(hero,5);
  }
  reactBlender(hero,'wave');updateBlender(hero,1.3);
  assert.ok(b.restWeights[0]<.001,'waving paw keeps the authored performance');
  assert.ok(b.restWeights[1]>.99,'other paw must rest at the side');
  updateBlender(hero,4);assert.deepEqual(b.restWeights,[1,1]);
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

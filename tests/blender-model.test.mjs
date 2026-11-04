import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GLTFLoader} from '../dist/vendor/GLTFLoader.js';
import * as THREE from 'three';
import {blenderClips,makeBlenderKitty,reactBlender,updateBlender,setBlenderAttention,blenderTouchPart} from '../dist/blender-kitty.js';
const bytes=await readFile(new URL('../dist/assets/hello-kitty.glb',import.meta.url));
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const full=new THREE.AnimationClip('Performance',-1,gltf.animations.flatMap(a=>a.tracks));
const asset={scene:gltf.scene,clips:blenderClips(gltf.animations)};

test('the shipped GLB contains the actual Blender character, rig, and animated wink',()=>{
  const names=[];gltf.scene.traverse(o=>names.push(o.name));
  assert.ok(names.includes('CTRL_Root'));assert.ok(names.includes('CTRL_Head'));
  assert.ok(names.some(n=>n.startsWith('Pink_daisy')));
  assert.ok(names.some(n=>n.startsWith('White_arm')));
  assert.ok(full.tracks.some(t=>t.name.includes('morphTargetInfluences')));
  assert.ok(!names.some(n=>n.includes('softbox')||n.includes('plinth')));
  assert.ok(bytes.length<2_000_000);
});
test('the Blender wave moves the paw and winks, then restores both pose and open eye',()=>{
  const hero=makeBlenderKitty(asset),b=hero.userData.blender;
  const arm=b.model.getObjectByName('CTRL_Arm_L'),rest=arm.quaternion.clone();
  reactBlender(hero,'wave',false);updateBlender(hero,1.3);
  assert.ok(arm.quaternion.angleTo(rest)>.3);
  const eye=b.morphs.find(o=>o.morphTargetDictionary.Closed!==undefined);
  assert.ok(eye.morphTargetInfluences[eye.morphTargetDictionary.Closed]>.8);
  updateBlender(hero,3);assert.equal(b.current,null);
  assert.ok(arm.quaternion.angleTo(rest)<1e-5);
  assert.equal(eye.morphTargetInfluences[eye.morphTargetDictionary.Closed],0);
});
test('reduced motion gives a static wink with no arm motion, and variants stay independent',()=>{
  const a=makeBlenderKitty(asset,0),b=makeBlenderKitty(asset,2);
  const rig=a.userData.blender,arm=rig.model.getObjectByName('CTRL_Arm_L'),rest=arm.quaternion.clone();
  reactBlender(a,'wave',true);updateBlender(a,.5);
  assert.equal(rig.reducedWink,true);assert.ok(arm.quaternion.angleTo(rest)<1e-6);
  const otherEye=b.userData.blender.morphs.find(o=>o.morphTargetDictionary.Closed!==undefined);
  assert.equal(otherEye.morphTargetInfluences[otherEye.morphTargetDictionary.Closed],0);
  updateBlender(a,1);assert.equal(rig.reducedWink,false);
  reactBlender(a,'dance',true);assert.equal(rig.current,null);
});

test('idle attention is bounded, blinking returns open, and reduced motion is still',()=>{
  const hero=makeBlenderKitty(asset),b=hero.userData.blender;
  setBlenderAttention(hero,100,100);updateBlender(hero,1);
  assert.ok(Math.abs(b.headIdle.rotation.y)<=.101&&Math.abs(b.headIdle.rotation.x)<=.066);
  b.nextBlink=.01;updateBlender(hero,.02);updateBlender(hero,.12);
  assert.ok(b.eyes[0].scale.y<.1);
  updateBlender(hero,.2);assert.equal(b.eyes[0].scale.y,1);
  updateBlender(hero,1,{reduced:true});assert.equal(b.headIdle.rotation.x,0);assert.equal(b.headIdle.rotation.y,0);assert.equal(b.normalize.scale.y,b.baseScale);
});
test('switching gestures preserves the current paw pose and cleans up faded actions',()=>{
  const hero=makeBlenderKitty(asset),b=hero.userData.blender,arm=b.model.getObjectByName('CTRL_Arm_L');
  reactBlender(hero,'wave');updateBlender(hero,.8);const before=arm.quaternion.clone();
  reactBlender(hero,'dance');assert.ok(arm.quaternion.angleTo(before)<1e-6);
  updateBlender(hero,.01);assert.ok(arm.quaternion.angleTo(before)<.2);
  updateBlender(hero,.3);assert.equal(b.fading.length,0);
  updateBlender(hero,4);assert.equal(b.current,null);
});
test('touch targets use the actual bow and bouquet meshes; offering moves the bouquet',()=>{
  const hero=makeBlenderKitty(asset),b=hero.userData.blender;
  assert.equal(blenderTouchPart(b.model.getObjectByName('Bow_center_knot')),'tilt');
  const blossom=b.model.getObjectByName('Pink_daisy_golden_center');assert.equal(blenderTouchPart(blossom),'offer');
  assert.equal(blenderTouchPart(b.model.getObjectByName('Head')),'pet');
  const bouquet=b.model.getObjectByName('CTRL_Bouquet'),before=bouquet.position.clone();
  reactBlender(hero,'offer');updateBlender(hero,.8);assert.ok(bouquet.position.distanceTo(before)>.1);
});

test('gift choices replace only the bouquet and remain attached to its Blender controller',async()=>{
  const {setHeldGift}=await import('../dist/gifts.js');
  const hero=makeBlenderKitty(asset),b=hero.userData.blender,head=b.model.getObjectByName('Head'),geometry=head.geometry;
  const bouquet=b.model.getObjectByName('CTRL_Bouquet');
  setHeldGift(hero,'teddy');assert.equal(b.gift,'teddy');assert.ok(b.gifts.original.every(o=>!o.visible));
  const teddy=b.gifts.cache.get('teddy');assert.equal(teddy.parent,bouquet);assert.equal(blenderTouchPart(teddy.children[0]),'offer');
  setHeldGift(hero,'letter');assert.equal(teddy.visible,false);assert.equal(b.gifts.cache.get('letter').visible,true);
  setHeldGift(hero,'strawberry');assert.equal(b.gifts.cache.get('strawberry').parent,bouquet);
  setHeldGift(hero,'flowers');assert.ok(b.gifts.original.every(o=>o.visible));assert.equal(head.geometry,geometry);
  setHeldGift(hero,'unknown');assert.equal(b.gift,'flowers');
});

test('a teddy cuddle moves the real rig gently and returns its additive arms to rest',()=>{
 const hero=makeBlenderKitty(asset),b=hero.userData.blender;
 reactBlender(hero,'hug');updateBlender(hero,.65);assert.ok(b.armIdle[0].rotation.z>.3);assert.ok(b.armIdle[1].rotation.z<-.3);
 updateBlender(hero,1);updateBlender(hero,.1);assert.ok(b.armIdle.every(a=>a.rotation.z===0));
});
test('strawberry has three non-overlapping bites and switching props clears transient play',async()=>{
 const {setHeldGift,playHeldItem,updateHeldItem}=await import('../dist/gifts.js');
 const hero=makeBlenderKitty(asset),b=hero.userData.blender;setHeldGift(hero,'strawberry');
 for(let bite=1;bite<=3;bite++){
  const result=playHeldItem(hero);assert.equal(result.bite,bite);assert.equal(result.finishedBites,bite===3);assert.equal(playHeldItem(hero).busy,true);
  const prop=b.gifts.cache.get('strawberry'),start=prop.position.y;updateHeldItem(hero,.6);assert.ok(prop.position.y>start+.5);
  updateHeldItem(hero,1);assert.equal(b.itemPlay,null);
 }
 assert.equal(b.bites,0);assert.equal(b.gifts.cache.get('strawberry').scale.x,1);
 playHeldItem(hero);setHeldGift(hero,'teddy');assert.equal(b.itemPlay,null);assert.equal(b.bites,0);
});

test('equipping clothes changes the actual Blender dress and bow, adds rigged details, and preserves the face and other models',async()=>{
 const {applyEquipment}=await import('../dist/equipment-model.js');
 const hero=makeBlenderKitty(asset),other=makeBlenderKitty(asset),b=hero.userData.blender;
 const dress=b.model.getObjectByName('Strawberry_pink_rounded_dress'),head=b.model.getObjectByName('Head'),geometry=head.geometry,white=head.material.color.getHexString();
 const original=other.userData.blender.model.getObjectByName('Strawberry_pink_rounded_dress').material.color.getHexString();
 applyEquipment(hero,{outfit:'sailor',item:'none'});assert.equal(dress.material.color.getHexString(),'91bbd3');assert.equal(b.model.getObjectByName('Bow_center_knot').material.color.getHexString(),'91bbd3');
 assert.equal(b.wardrobe.cache.get('sailor').parent,b.model.getObjectByName('CTRL_Body'));assert.ok(b.wardrobe.cache.get('sailor').getObjectByName('Sailor_collar'));
 assert.equal(head.geometry,geometry);assert.equal(head.material.color.getHexString(),white);assert.equal(other.userData.blender.model.getObjectByName('Strawberry_pink_rounded_dress').material.color.getHexString(),original);
 applyEquipment(hero,{outfit:'picnic',item:'teddy'});assert.equal(b.wardrobe.cache.get('sailor').visible,false);assert.ok(b.model.getObjectByName('Cream_picnic_apron'));assert.equal(b.gift,'teddy');
 applyEquipment(hero,{outfit:'moonlight',item:'none'});assert.equal(b.wardrobe.cache.get('moonlight').children.length,3);assert.ok(b.gifts.original.every(o=>!o.visible));assert.ok([...b.gifts.cache.values()].every(o=>!o.visible));
 for(let i=0;i<8;i++)applyEquipment(hero,{outfit:'sailor',item:'flowers'});assert.equal(b.wardrobe.cache.size,3);assert.ok(b.gifts.original.every(o=>o.visible));
 applyEquipment(hero,{outfit:'classic',item:'flowers'});assert.ok([...b.wardrobe.cache.values()].every(o=>!o.visible));reactBlender(hero,'wave');updateBlender(hero,.8);assert.ok(b.current);
});

test('tickles and kisses animate gently and settle; high five uses the Blender paw animation',()=>{
 for(const kind of ['tickle','kiss']){
  const hero=makeBlenderKitty(asset),b=hero.userData.blender;reactBlender(hero,kind);updateBlender(hero,.35);assert.ok(Math.abs(b.headIdle.rotation.x)+Math.abs(b.headIdle.rotation.y)+Math.abs(b.headIdle.rotation.z)>0);
  updateBlender(hero,2);updateBlender(hero,.1);assert.equal(b.gesture,null);assert.ok(b.armIdle.every(a=>Math.abs(a.rotation.z)<1e-6));
  reactBlender(hero,kind,true);updateBlender(hero,.3,{reduced:true});assert.equal(b.gesture,null);assert.ok(b.armIdle.every(a=>a.rotation.z===0));
 }
 const hero=makeBlenderKitty(asset);reactBlender(hero,'highfive');assert.equal(hero.userData.blender.current,hero.userData.blender.actions.wave);
});

test('authored baking and discovery clips move joined paws and settle back to their bind pose',()=>{
 for(const kind of ['stir','cut','present','surprise','bow','celebrate','sip']){
  assert.ok(asset.clips[kind],`missing named Blender clip ${kind}`);
  const hero=makeBlenderKitty(asset),b=hero.userData.blender;
  const controls=['CTRL_Head','CTRL_Body','CTRL_Arm_L','CTRL_Arm_R'].map(n=>b.model.getObjectByName(n));
  const rest=controls.map(o=>({q:o.quaternion.clone(),p:o.position.clone()}));
  reactBlender(hero,kind);updateBlender(hero,asset.clips[kind].duration*.5);
  assert.ok(controls.some((o,i)=>o.quaternion.angleTo(rest[i].q)>.02||o.position.distanceTo(rest[i].p)>.01),kind+' has no visible pose');
  for(const name of ['CTRL_Arm_L','CTRL_Arm_R'])assert.ok(b.model.getObjectByName(name).position.length()<1e-5,kind+' detaches a shoulder');
  updateBlender(hero,4);assert.equal(b.current,null);
  controls.forEach((o,i)=>{assert.ok(o.quaternion.angleTo(rest[i].q)<1e-5);assert.ok(o.position.distanceTo(rest[i].p)<1e-5);});
 }
});
test('Blender hand sockets follow the paws and preserve a stable tray and teacup attachment',()=>{
 const hero=makeBlenderKitty(asset),b=hero.userData.blender;
 const paw=b.model.getObjectByName('Socket_Paw_R'),cup=b.model.getObjectByName('Socket_Teacup'),tray=b.model.getObjectByName('Socket_Tray');
 assert.equal(paw.parent.name,'CTRL_Arm_R');assert.equal(cup.parent,paw);assert.equal(tray.parent.name,'Grip_Midpoint');
 const start=cup.getWorldPosition(new THREE.Vector3());reactBlender(hero,'sip');updateBlender(hero,1.25);
 assert.ok(cup.getWorldPosition(new THREE.Vector3()).y>start.y+.2);
});
test('the shipped friend and decoration assets contain editable Blender models and playable greetings',async()=>{
 for(const file of ['cozy-friends','cozy-props']){
  const data=await readFile(new URL('../dist/assets/'+file+'.glb',import.meta.url));assert.ok(data.length<350000);
  const model=await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
  if(file==='cozy-props'){
   for(const name of ['Cushion','Frame','Oven','Tray','Cup','Bowl','Spoon','Cutter','Cutter_Heart','Cutter_Star'])assert.ok(model.scene.getObjectByName('Toy_'+name));
  }else{
   for(const name of ['Momo','Pip'])assert.ok(model.scene.getObjectByName(name));
   const action=model.animations.find(a=>a.name==='greet');assert.ok(action);
   const mixer=new THREE.AnimationMixer(model.scene),paw=model.scene.getObjectByName('Momo_Paw_L'),ear=model.scene.getObjectByName('Pip_Ear_L');
   const q=paw.quaternion.clone(),e=ear.quaternion.clone();mixer.clipAction(action).play();mixer.update(.8);
   assert.ok(paw.quaternion.angleTo(q)>.5);assert.ok(ear.quaternion.angleTo(e)>.01);
   mixer.stopAllAction();assert.ok(paw.quaternion.angleTo(q)<1e-5);
  }
 }
});

test('turning on reduced motion interrupts the active Blender gesture immediately',()=>{
 const hero=makeBlenderKitty(asset),b=hero.userData.blender;
 const arm=b.model.getObjectByName('CTRL_Arm_L'),rest=arm.quaternion.clone();
 reactBlender(hero,'wave',false);updateBlender(hero,.8);assert.ok(arm.quaternion.angleTo(rest)>.3);
 reactBlender(hero,'wave',true);assert.equal(b.current,null);assert.equal(b.fading.length,0);
 updateBlender(hero,.02,{reduced:true});assert.ok(arm.quaternion.angleTo(rest)<1e-5);
});

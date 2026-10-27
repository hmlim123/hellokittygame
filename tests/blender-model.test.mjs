import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {GLTFLoader} from '../dist/vendor/GLTFLoader.js';
import * as THREE from 'three';
import {makeBlenderKitty,reactBlender,updateBlender} from '../dist/blender-kitty.js';
const bytes=await readFile(new URL('../dist/assets/hello-kitty.glb',import.meta.url));
const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const full=new THREE.AnimationClip('Performance',-1,gltf.animations.flatMap(a=>a.tracks));
const asset={scene:gltf.scene,clips:{wave:THREE.AnimationUtils.subclip(full,'wave',48,96,24),dance:THREE.AnimationUtils.subclip(full,'dance',0,49,24)}};

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

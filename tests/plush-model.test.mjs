import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {GLTFLoader} from '../dist/vendor/GLTFLoader.js';
import {makeBlenderKitty,blenderClips,reactBlender,updateBlender} from '../dist/blender-kitty.js';
import {PLUSH_STYLES,normalizePlush} from '../dist/plush-state.js';
const collection=JSON.parse(await readFile(new URL('../dist/assets/plush/collection.json',import.meta.url),'utf8'));
const models=[];
for(const style of PLUSH_STYLES.filter(s=>s.id!=='classic')){
 const bytes=await readFile(new URL('../dist/assets/'+style.file,import.meta.url));
 const jsonLength=bytes.readUInt32LE(12),doc=JSON.parse(bytes.subarray(20,20+jsonLength).toString());
 // Node has no image decoder. Keep the real mesh/morph/animation data and
 // material bindings; inspect the embedded PNG separately, render it in browsers.
 const loader=new GLTFLoader().register(()=>({name:'NodeTextureBinding',loadTexture(){return Promise.resolve(new THREE.Texture());}}));
 const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 models.push({style,bytes,doc,gltf,asset:{scene:gltf.scene,clips:blenderClips(gltf.animations)}});
}
test('all five exports are distinct complete Blender plush models with packed fabric and bounded payloads',async()=>{
 assert.equal(models.length,5);assert.equal(new Set(models.map(m=>createHash('sha256').update(m.bytes).digest('hex'))).size,5);
 for(const {style,bytes,doc,gltf} of models){
  assert.ok(bytes.length<4_000_000,style.id+' exceeds its lazy-loaded model budget');
  const root=gltf.scene.getObjectByName('CTRL_Root');assert.equal(root.userData.plush_variant,style.id);
  assert.equal(root.userData.plush_surface,'close-cropped-fleece');
  assert.equal(doc.nodes.filter(n=>n.extras?.plush_fur||/^Plush_pile/.test(n.name||'')).length,0,'no exposed chin fringe');
  assert.equal(doc.nodes.filter(n=>n.extras?.plush_embroidery).length,6,'six stitched cheek whiskers');
  assert.ok(doc.materials.some(m=>m.normalTexture),'packed fabric normal is missing');
  assert.ok(doc.images.length>=1);const image=doc.images[0],view=doc.bufferViews[image.bufferView];
  const binaryStart=20+bytes.readUInt32LE(12)+8;const png=bytes.subarray(binaryStart+(view.byteOffset||0),binaryStart+(view.byteOffset||0)+view.byteLength);
  assert.equal(png.subarray(1,4).toString(),'PNG');assert.ok(png.readUInt32BE(16)>=512);
  assert.ok(!doc.nodes.some(n=>/softbox|Portrait_camera|plinth/i.test(n.name||'')));
  const meta=JSON.parse(await readFile(new URL('../dist/assets/plush/'+style.id+'-source.json',import.meta.url),'utf8'));
  assert.equal(meta.variant,style.id);assert.equal(meta.source_file,'hello_kitty_plush_'+style.id+'.blend');assert.match(meta.source_sha256,/^[a-f0-9]{64}$/);assert.equal(meta.source_sha256,collection.models.find(m=>m.id===style.id).sha256);assert.match(meta.source_commit,/^[a-f0-9]{40}$/);
 }
});
test('every plush keeps body scale and authored oven contact, including the tall hat and bunny ears',()=>{
 for(const {style,asset} of models){
  const hero=makeBlenderKitty(asset),b=hero.userData.blender;
  assert.equal(b.plush,style.id);assert.ok(Math.abs(b.baseScale-.49692658)<.00001);
  hero.position.set(-.2,0,-.15);reactBlender(hero,'placeTray');updateBlender(hero,2.28);hero.updateMatrixWorld(true);
  const p=b.model.getObjectByName('Socket_Tray').getWorldPosition(new THREE.Vector3());
  assert.ok(p.distanceTo(new THREE.Vector3(1.05,.512,.35))<.04,style.id+' loses paw/oven contact: '+p.toArray());
  assert.ok(b.model.getObjectByName('Socket_Spoon'));
 }
});
test('all five have different soft dances, joined shoulders and a usable wink',()=>{
 const dances=[];
 for(const {style,asset} of models){
  const hero=makeBlenderKitty(asset),b=hero.userData.blender;
  reactBlender(hero,'dance');updateBlender(hero,.7);
  const arm=b.model.getObjectByName('CTRL_Arm_R');assert.ok(arm.position.length()<1e-5);
  dances.push([...arm.quaternion.toArray(),...b.model.getObjectByName('CTRL_Root').quaternion.toArray()].map(n=>n.toFixed(5)).join(','));
  updateBlender(hero,4);assert.equal(b.current,null);
  reactBlender(hero,'wave');updateBlender(hero,1.3);
  assert.ok(b.morphs.some(o=>o.morphTargetDictionary.Closed!==undefined&&o.morphTargetInfluences[o.morphTargetDictionary.Closed]>.8),style.id+' cannot wink');
  updateBlender(hero,4);assert.ok(b.morphs.every(o=>o.morphTargetDictionary.Closed===undefined||o.morphTargetInfluences[o.morphTargetDictionary.Closed]<.001));
 }
 assert.equal(new Set(dances).size,5);
});
test('happy eyes and fused paw deformation play and restore on every edition',()=>{
 for(const {style,asset} of models){
  const hero=makeBlenderKitty(asset),b=hero.userData.blender;
  reactBlender(hero,'celebrate');updateBlender(hero,1);
  assert.ok(b.morphs.some(o=>o.morphTargetDictionary.JoyClosed!==undefined&&o.morphTargetInfluences[o.morphTargetDictionary.JoyClosed]>.9),style.id+' has no happy eye expression');
  updateBlender(hero,5);
  assert.ok(b.morphs.every(o=>o.morphTargetDictionary.JoyClosed===undefined||o.morphTargetInfluences[o.morphTargetDictionary.JoyClosed]<.001));
  reactBlender(hero,'stir');updateBlender(hero,1.2);
  const paws=b.morphs.filter(o=>o.morphTargetDictionary.Elbow_soft!==undefined);
  assert.ok(paws.length>=2);assert.ok(paws.some(o=>o.morphTargetInfluences[o.morphTargetDictionary.Elbow_soft]>.05));
  reactBlender(hero,'wave',true);updateBlender(hero,.1,{reduced:true});assert.equal(b.current,null);
 }
});
test('unknown plush choices fall back without changing the original equipment schema',()=>{
 assert.equal(normalizePlush('invented'),undefined);assert.equal(normalizePlush('classic'),undefined);assert.equal(normalizePlush('bunny'),'bunny');
});

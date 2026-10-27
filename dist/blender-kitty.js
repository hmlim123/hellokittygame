import * as THREE from 'three';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {DOLLS} from './state.js';

export async function loadBlenderKitty(){
  const gltf=await new GLTFLoader().loadAsync(globalThis.KITTY_MODEL_URL||new URL('./assets/hello-kitty.glb',import.meta.url).href);
  // Blender exports each animated object's action separately. Combine them so
  // the head, face, paws, bouquet and feet always play on the same clock.
  const full=new THREE.AnimationClip('Blender performance',-1,gltf.animations.flatMap(a=>a.tracks));
  return {scene:gltf.scene,clips:{wave:THREE.AnimationUtils.subclip(full,'Wave and wink',48,96,24),dance:THREE.AnimationUtils.subclip(full,'Little dance',0,49,24)}};
}
export function makeBlenderKitty(asset,id=0){
  const hero=new THREE.Group(),model=asset.scene.clone(true);
  const normalize=new THREE.Group();normalize.add(model);hero.add(normalize);
  const bounds=new THREE.Box3().setFromObject(model),height=bounds.max.y-bounds.min.y;
  const scale=2.27/height;normalize.scale.setScalar(scale);normalize.position.y=-bounds.min.y*scale;
  model.traverse(o=>{
    if(!o.isMesh)return;
    o.castShadow=o.receiveShadow=false;
    // Each variant is the actual Blender mesh, with a local outfit recolor.
    o.material=o.material.clone();
    if(id!==0&&o.material.name==='Strawberry pink satin')o.material.color.set(DOLLS[id].color);
  });
  const mixer=new THREE.AnimationMixer(model),actions={};
  for(const [name,clip] of Object.entries(asset.clips)){
    actions[name]=mixer.clipAction(clip);actions[name].setLoop(THREE.LoopOnce,1);actions[name].clampWhenFinished=true;
  }
  const morphs=[];
  model.traverse(o=>{if(o.morphTargetDictionary)morphs.push(o);});
  const resetEyes=closed=>{
    for(const o of morphs){
      if(o.morphTargetDictionary.Closed!==undefined)o.morphTargetInfluences[o.morphTargetDictionary.Closed]=closed?1:0;
      if(o.morphTargetDictionary.Hidden!==undefined)o.morphTargetInfluences[o.morphTargetDictionary.Hidden]=closed?0:1;
    }
  };
  resetEyes(false);
  hero.userData={kind:'kitty',id,blender:{model,mixer,actions,morphs,resetEyes,current:null,age:0,reducedWink:false},source:'hellokitty3D/hello_kitty_animated.blend'};
  return hero;
}
export function reactBlender(hero,emotion,reduced){
  const b=hero.userData.blender;
  b.mixer.stopAllAction();b.resetEyes(false);b.current=null;b.reducedWink=false;b.age=0;
  if(!['wave','dance'].includes(emotion))return;
  if(reduced){if(emotion==='wave'){b.resetEyes(true);b.reducedWink=true;}return;}
  const action=b.actions[emotion];action.reset().fadeIn(.18).play();b.current=action;
}
export function updateBlender(hero,dt){
  const b=hero.userData.blender;b.age+=dt;b.mixer.update(dt);
  if(b.current){
    const end=b.current.getClip().duration;
    if(b.age>=end&&b.age-dt<end)b.current.fadeOut(.2);
    if(b.age>end+.22){b.current.stop();b.current=null;b.resetEyes(false);}
  }
  if(b.reducedWink&&b.age>1.2){b.resetEyes(false);b.reducedWink=false;}
}

import * as THREE from 'three';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {DOLLS} from './state.js';

export async function loadBlenderKitty(){
  const gltf=await new GLTFLoader().loadAsync(globalThis.KITTY_MODEL_URL||new URL('./assets/hello-kitty.glb',import.meta.url).href);
  // Blender exports each animated object's action separately. Combine them so
  // the head, face, paws, bouquet and feet always play on the same clock.
  const full=new THREE.AnimationClip('Blender performance',-1,gltf.animations.flatMap(a=>a.tracks));
  return {scene:gltf.scene,clips:{wave:THREE.AnimationUtils.subclip(full,'Wave and wink',48,96,24),dance:THREE.AnimationUtils.subclip(full,'Little dance',0,49,24),offer:THREE.AnimationUtils.subclip(full,'Flowers for you',96,139,24)}};
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
  // Additive head/eye pivots preserve the exported controller animation.
  const head=model.getObjectByName('CTRL_Head'),headIdle=new THREE.Group();
  headIdle.name='Idle_head';headIdle.position.copy(head.position);head.parent.add(headIdle);headIdle.add(head);head.position.set(0,0,0);
  model.updateMatrixWorld(true);
  const eyes=[];
  for(const name of ['Eye_left','Eye_right']){
    const eye=model.getObjectByName(name);eye.geometry.computeBoundingBox();
    const pivot=new THREE.Group();pivot.name='Blink_'+name;
    const parent=eye.parent,center=eye.localToWorld(eye.geometry.boundingBox.getCenter(new THREE.Vector3()));
    pivot.position.copy(parent.worldToLocal(center));parent.add(pivot);pivot.attach(eye);eyes.push(pivot);
  }
  const armIdle=[];
  for(const name of ['CTRL_Arm_L','CTRL_Arm_R']){const arm=model.getObjectByName(name),pivot=new THREE.Group();pivot.position.copy(arm.position);arm.parent.add(pivot);pivot.add(arm);arm.position.set(0,0,0);armIdle.push(pivot);}
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
  hero.userData={kind:'kitty',id,blender:{model,normalize,baseScale:scale,headIdle,armIdle,eyes,mixer,actions,morphs,resetEyes,current:null,fading:[],age:0,time:0,blink:-1,nextBlink:3.4+id*.31,look:new THREE.Vector2(),target:new THREE.Vector2(),gesture:null,reduced:false,reducedWink:false},source:'hellokitty3D/hello_kitty_animated.blend'};
  return hero;
}
export function setBlenderAttention(hero,x=0,y=0){
  hero.userData.blender.target.set(THREE.MathUtils.clamp(x,-1,1),THREE.MathUtils.clamp(y,-1,1));
}
export function blenderTouchPart(object){
  let o=object;
  while(o){
    if(o.userData.interaction)return o.userData.interaction;
    if(o.name.startsWith('Bow_'))return 'tilt';
    if(/^(Pink_daisy|Yellow_daisy|Pink_flower|Yellow_flower|Bouquet_leaf|Leaf_vein)/.test(o.name))return 'offer';
    o=o.parent;
  }
  return 'pet';
}
export function reactBlender(hero,emotion,reduced=false){
  const b=hero.userData.blender,action=b.actions[emotion];b.reduced=reduced;
  // Repeated taps don't restart a gesture mid-pose.
  if(action&&b.current===action&&b.age<action.getClip().duration)return;
  if(b.current){b.current.fadeOut(.2);b.fading.push({action:b.current,left:.22});}
  b.current=null;b.reducedWink=false;b.gesture=null;b.age=0;
  if(reduced){b.mixer.stopAllAction();b.fading=[];b.resetEyes(false);if(emotion==='wave'||emotion==='pet'){b.resetEyes(true);b.reducedWink=true;}return;}
  if(action){action.reset().fadeIn(.2).play();b.current=action;}
  else if(['pet','tilt','catch','hug'].includes(emotion))b.gesture=emotion;
}
export function updateBlender(hero,dt,{reduced=hero.userData.blender.reduced,idle=true}={}){
  const b=hero.userData.blender;dt=Number.isFinite(dt)?Math.max(0,dt):0;b.age+=dt;b.time+=dt;b.mixer.update(dt);
  for(let i=b.fading.length-1;i>=0;i--){const f=b.fading[i];f.left-=dt;if(f.left<=0){if(f.action!==b.current)f.action.stop();b.fading.splice(i,1);}}
  if(b.current){
    const end=b.current.getClip().duration;
    if(b.age>=end&&b.age-dt<end)b.current.fadeOut(.2);
    if(b.age>end+.22){b.current.stop();b.current=null;b.resetEyes(false);}
  }
  if(b.reducedWink&&b.age>1.2){b.resetEyes(false);b.reducedWink=false;}
  const smooth=1-Math.exp(-dt*5),attentive=idle&&!reduced&&!b.current;
  b.look.lerp(attentive?b.target:new THREE.Vector2(),smooth);
  b.headIdle.rotation.set(-b.look.y*.065,b.look.x*.10,0);
  b.armIdle.forEach(a=>a.rotation.z=0);
  if(b.gesture&&!reduced){
    const p=Math.min(1,b.age/(b.gesture==='hug'?1.35:1.1)),curve=Math.sin(Math.PI*p);
    if(b.gesture==='hug'){b.armIdle[0].rotation.z=curve*.45;b.armIdle[1].rotation.z=-curve*.45;}
    if(b.gesture==='tilt')b.headIdle.rotation.z+=curve*.15;
    else b.headIdle.rotation.x+=curve*.10;
    if(p===1)b.gesture=null;
  }
  if(reduced||!idle){b.headIdle.rotation.set(0,0,0);b.blink=-1;}
  else{
    b.nextBlink-=dt;
    if(b.nextBlink<=0){b.blink=0;b.nextBlink=4.1;}
    else if(b.blink>=0){b.blink+=dt;if(b.blink>.24)b.blink=-1;}
  }
  const blink=b.blink<0?0:Math.sin(Math.PI*b.blink/.24)**2;
  b.eyes.forEach(p=>p.scale.y=1-blink*.96);
  b.normalize.scale.y=b.baseScale*(1+(idle&&!reduced&&!b.current?Math.sin(b.time*1.6)*.005:0));
}

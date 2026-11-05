import {normalizePlush} from './plush-state.js';
import * as THREE from 'three';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {DOLLS} from './state.js';

export async function loadBlenderKitty(plush){
  plush=normalizePlush(plush);
  const gltf=await new GLTFLoader().loadAsync(globalThis.KITTY_MODEL_URL||new URL(plush?'./assets/plush/'+plush+'.glb?v=silver-bunny-26':'./assets/hello-kitty.glb?v=cozy-toys-1',import.meta.url).href);
  return {scene:gltf.scene,clips:blenderClips(gltf.animations)};

}
// New exports carry real named clips. The fallback keeps older imported models playable.
export function blenderClips(animations){
  if(['wave','dance','offer'].every(name=>animations.some(a=>a.name===name)))return Object.fromEntries(animations.map(a=>[a.name,a]));
  const full=new THREE.AnimationClip('Blender performance',-1,animations.flatMap(a=>a.tracks));
  return {wave:THREE.AnimationUtils.subclip(full,'Wave and wink',48,96,24),dance:THREE.AnimationUtils.subclip(full,'Little dance',0,49,24),offer:THREE.AnimationUtils.subclip(full,'Flowers for you',96,139,24)};
}
export function makeBlenderKitty(asset,id=0){
  const hero=new THREE.Group(),model=asset.scene.clone(true);
  const normalize=new THREE.Group();normalize.add(model);hero.add(normalize);
  const bounds=new THREE.Box3().setFromObject(model),height=bounds.max.y-bounds.min.y;
  const plush=model.getObjectByName('CTRL_Root').userData.plush_variant;
  const scale=2.27/(plush?model.getObjectByName('CTRL_Root').userData.plush_body_height:height);normalize.scale.setScalar(scale);
  let floor=bounds.min.y;
  if(plush){
    // Ground the stuffed foot itself; short pile can compress into the floor
    // without lifting the paws away from the authored baking contact points.
    const foot=model.getObjectByName('Foot_-1');
    if(foot?.geometry){foot.geometry.computeBoundingBox();floor=foot.geometry.boundingBox.clone().applyMatrix4(foot.matrixWorld).min.y;}
  }
  normalize.position.y=-floor*scale;
  model.traverse(o=>{
    if(!o.isMesh)return;
    o.castShadow=o.receiveShadow=false;
    // Pet the stuffed surface, rather than raycasting thousands of tiny fibers.
    if(o.userData.plush_fur)o.raycast=()=>{};
    // Each variant is the actual Blender mesh, with a local outfit recolor.
    const localMaterial=m=>{
      if(!o.userData.plush_fur)return m.clone();
      // Strand geometry supplies its own fine normals. A matte material avoids
      // expensive layered sheen and tiny normal-map glints on each filament.
      const matte=new THREE.MeshStandardMaterial({color:m.color,roughness:.98,metalness:0,side:m.side});
      matte.name=m.name;return matte;
    };
    o.material=Array.isArray(o.material)?o.material.map(localMaterial):localMaterial(o.material);
    for(const material of Array.isArray(o.material)?o.material:[o.material]){
      material.userData.plushBaseColor=material.color.getHex();
      if(id!==0&&material.name==='Strawberry pink satin')material.color.set(DOLLS[id].color);
    }
  });
  // Additive head/eye pivots preserve the exported controller animation.
  const bases=new Map();
  const pivotFor=(name,pivotName)=>{
    const control=model.getObjectByName(name),pivot=new THREE.Group();
    bases.set(name,control.position.clone());pivot.name=pivotName;
    pivot.position.copy(control.position);control.parent.add(pivot);pivot.add(control);control.position.set(0,0,0);return pivot;
  };
  const headIdle=pivotFor('CTRL_Head','Idle_head');
  for(const name of ['CTRL_Body','CTRL_Foot_L','CTRL_Foot_R'])pivotFor(name,'Walk_'+name);
  model.updateMatrixWorld(true);
  const eyes=[];
  for(const name of ['Eye_left','Eye_right']){
    const eye=model.getObjectByName(name);eye.updateWorldMatrix(true,true);
    const pivot=new THREE.Group();pivot.name='Blink_'+name;
    const parent=eye.parent,center=new THREE.Box3().setFromObject(eye).getCenter(new THREE.Vector3());
    pivot.position.copy(parent.worldToLocal(center));parent.add(pivot);pivot.attach(eye);eyes.push(pivot);
  }
  const armIdle=[];
  for(const name of ['CTRL_Arm_L','CTRL_Arm_R'])armIdle.push(pivotFor(name,'Idle_'+name));
  const mixer=new THREE.AnimationMixer(model),actions={};
  for(const [name,clip] of Object.entries(asset.clips)){
    const local=clip.clone();
    // Controllers live inside additive gaze/walking pivots. Translation keys
    // must be offsets from the bind pose, so they never double the shoulder.
    for(const track of local.tracks){
      const base=track.name.endsWith('.position')&&bases.get(track.name.slice(0,-9));
      if(base)for(let i=0;i<track.values.length;i++)track.values[i]-=base.getComponent(i%3);
    }
    actions[name]=mixer.clipAction(local);actions[name].setLoop(THREE.LoopOnce,1);actions[name].clampWhenFinished=true;
  }
  const morphs=[],pile=[];
  model.traverse(o=>{if(o.morphTargetDictionary)morphs.push(o);if(o.isMesh&&o.userData.plush_fur)pile.push(o);});
  const resetEyes=closed=>{
    for(const o of morphs){
      if(o.morphTargetDictionary.Closed!==undefined)o.morphTargetInfluences[o.morphTargetDictionary.Closed]=closed?1:0;
      if(o.morphTargetDictionary.Hidden!==undefined)o.morphTargetInfluences[o.morphTargetDictionary.Hidden]=closed?0:1;
    }
  };
  resetEyes(false);
  hero.userData={kind:'kitty',id,blender:{pile,pileVisible:true,plush,modelHeight:(bounds.max.y-floor)*scale,model,normalize,baseScale:scale,headIdle,armIdle,eyes,mixer,actions,morphs,resetEyes,current:null,fading:[],age:0,time:0,blink:-1,nextBlink:3.4+id*.31,look:new THREE.Vector2(),target:new THREE.Vector2(),gesture:null,reduced:false,reducedWink:false},source:plush?'hellokitty3D/hello_kitty_plush_'+plush+'.blend':'hellokitty3D/hello_kitty_natural.blend'};
  return hero;
}
export function setBlenderAttention(hero,x=0,y=0){
  hero.userData.blender.target.set(THREE.MathUtils.clamp(x,-1,1),THREE.MathUtils.clamp(y,-1,1));
}
export function blenderTouchPart(object){
  let o=object;
  while(o){
    if(o.userData.interaction)return o.userData.interaction;
    if(/^White_arm/.test(o.name))return 'highfive';
    if(/(foot|Foot|paw|Paw)/.test(o.name))return 'tickle';
    if(/nose/i.test(o.name))return 'kiss';
    if(o.name.startsWith('Bow_'))return 'tilt';
    if(/^(Pink_daisy|Yellow_daisy|Pink_flower|Yellow_flower|Bouquet_leaf|Leaf_vein)/.test(o.name))return 'offer';
    o=o.parent;
  }
  return 'pet';
}
export function reactBlender(hero,emotion,reduced=false){
  const b=hero.userData.blender,action=b.actions[emotion==='highfive'?'wave':emotion==='excited'?'celebrate':emotion];b.reduced=reduced;
  // Repeated taps don't restart a gesture mid-pose.
  if(!reduced&&action&&b.current===action&&b.age<action.getClip().duration)return;
  if(b.current){b.current.fadeOut(.2);b.fading.push({action:b.current,left:.22});}
  b.current=null;b.reducedWink=false;b.gesture=null;b.age=0;
  if(reduced){b.mixer.stopAllAction();b.fading=[];b.resetEyes(false);if(['wave','pet','highfive','kiss','tickle','hug'].includes(emotion)){b.resetEyes(true);b.reducedWink=true;}return;}
  if(action){action.reset().fadeIn(.2).play();b.current=action;}
  else if(['pet','tilt','catch','hug','kiss','tickle'].includes(emotion))b.gesture=emotion;
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
    if(b.gesture==='tickle'){b.headIdle.rotation.z+=Math.sin(b.age*22)*curve*.07;b.armIdle[0].rotation.z=Math.sin(b.age*22)*curve*.16;b.armIdle[1].rotation.z=-Math.sin(b.age*22)*curve*.16;}
    if(b.gesture==='kiss')b.headIdle.rotation.y+=curve*.14;
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

// Scrub the authored contact motion from live input, with a damped clock.
// Unlike replaying a gesture on every pointer event, this keeps contact continuous.
export function followBlenderActivity(hero,input,dt,reduced=false){
 const b=hero.userData.blender;
 if(!input?.active){
  if(b.inputAction){const old=b.inputAction;old.paused=false;old.fadeOut(.18);b.fading.push({action:old,left:.2});if(b.current===old)b.current=null;b.inputAction=null;}
  return;
 }
 if(reduced){if(b.inputAction){b.mixer.stopAllAction();b.inputAction=null;b.current=null;}return;}
 const action=b.actions[input.kind];if(!action)return;
 if(b.inputAction!==action){
  if(b.current&&b.current!==action){b.current.fadeOut(.18);b.fading.push({action:b.current,left:.2});}action.reset().setEffectiveWeight(1).fadeIn(.16).play();action.paused=true;b.current=action;b.inputAction=action;b.inputPhase=input.progress;
 }
 // Input owns this pose until release. A transient greeting must not leave
 // the paused contact action playing underneath a competing gesture.
 if(b.current!==action){if(b.current){b.current.fadeOut(.18);b.fading.push({action:b.current,left:.2});}b.current=action;action.enabled=true;action.setEffectiveWeight(1);action.play();action.paused=true;}
 const target=Number.isFinite(input.progress)?input.progress:0;
 b.inputPhase+=(target-b.inputPhase)*(1-Math.exp(-Math.min(.25,Math.max(0,dt))*16));
 const phase=input.kind==='stir'?((b.inputPhase%1)+1)%1:Math.max(0,Math.min(1,b.inputPhase));
 action.time=phase*action.getClip().duration;b.age=0;b.mixer.update(0);
}

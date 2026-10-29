import * as THREE from 'three';
import {CanvasFallback} from './CanvasFallback.js';
import {loadBlenderKitty,makeBlenderKitty,reactBlender,updateBlender} from './blender-kitty.js';
import {makeGift} from './gifts.js';
import {RoomSound} from './sound.js';
import {MAPS,normalizeAdventure,questText,moveAdventure,nearbyObject,interactAdventure,claimAdventureReward,villageDirections,enterAdventurePath,AdventureEncounters} from './adventure-state.js?v=inventory-5';
import {DiscoveryEffects,questArt} from './adventure-effects.js?v=inventory-5';
import {EQUIPMENT_KEY,normalizeEquipment,equip,OUTFITS,HELD_ITEMS} from './equipment-state.js?v=inventory-5';
import {applyEquipment} from './equipment-model.js?v=inventory-5';
import {EquipmentPreview} from './equipment-preview.js?v=inventory-5';
import {InventoryUI} from './inventory.js?v=inventory-5';
const $=id=>document.getElementById(id),KEY='kitty-nancy-adventure-v1';
function read(key){try{return JSON.parse(localStorage.getItem(key)||'{}')||{};}catch{return {};}}
const state=normalizeAdventure(read(KEY)),sound=new RoomSound();
const equipment=normalizeEquipment(read(EQUIPMENT_KEY),state,read('kitty-room-preferences-v1'));
let loadedAsset,preview;
const storage={getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)};
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const encounters=new AdventureEncounters(),effects=new DiscoveryEffects($('effects'),{reduced});
let pendingEncounter=true,discoveryTime=0,storySource=null;
let ready=false,player,renderer,camera,scene,world,clock,motion=null,pressed=null,queued=null,noticeTime=0,walkTime=0;
const rendered=[],labels=[];
const dirs={ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right',w:'up',s:'down',a:'left',d:'right'};
function saveEquipment(){try{localStorage.setItem(EQUIPMENT_KEY,JSON.stringify(equipment));$('equipmentSaveStatus').textContent='Your outfit and item save automatically.';}catch{$('equipmentSaveStatus').textContent='Saving unavailable. Your choice lasts while this tab stays open.';}}
function refreshEquipment(){
 if(player)applyEquipment(player,equipment);inventoryUI.render(equipment,state);
 if(preview)preview.equip(equipment,`${OUTFITS.find(o=>o.id===equipment.outfit).name}, ${HELD_ITEMS.find(i=>i.id===equipment.item).name}`);
}
const inventoryUI=new InventoryUI((kind,id)=>{if(equip(equipment,kind,id,state)){refreshEquipment();saveEquipment();}});
function save(){try{localStorage.setItem(KEY,JSON.stringify(state));$('saveStatus').textContent='Your steps and discoveries save automatically.';}catch{$('saveStatus').textContent='Saving unavailable. Keep this tab open to continue your adventure.';}}
function notice(text){$('notice').textContent=text;$('notice').classList.add('visible');noticeTime=4;}
function modal(){return $('story').open||$('inventory').open;}
function refreshUI(){
 $('quest').textContent=questText(state);$('area').textContent=MAPS[state.map].title;
 const o=nearbyObject(state);$('interact').textContent=({'M':'Talk to Momo','D':'Enter dungeon','E':'Back to village','C':'Open chest','G':'Moon gate','Q':'Cloud guardian','S':'Moonflower shrine','F':'Make a little wish','o':'Little flowers','H':'Cozy cottage','T':'Little lantern'})[o?.type]||'Talk / inspect ♡';
 if(o?.type==='C'&&state.charms.includes(o.id))$('interact').textContent='View charm';
 $('wayfinder').textContent=villageDirections(state);$('wayfinder').hidden=state.map!=='village';
 $('interact').disabled=!ready||!!motion||modal();
 for(const {object,mesh} of rendered){if(object.type==='G')mesh.visible=!state.gate;}
}
function showDiscovery(result){
 const src=questArt(result.art);$('discoveryImage').hidden=!src;if(src)$('discoveryImage').src=src;
 $('discoveryTitle').textContent=result.speaker;$('discoveryWords').textContent=result.text;
 $('discoveryTag').textContent=result.source?.type==='C'?'A LITTLE TREASURE':result.source?.type==='M'?'A QUEST FOR NANCY':'A LITTLE DISCOVERY';
 $('discovery').hidden=false;discoveryTime=7;
}
function showStory(result){
 if(result.changedMap){
  pressed=queued=null;$('discovery').hidden=true;effects.clear();pendingEncounter=true;buildWorld();player.position.set(state.x,0,state.z);followCamera(true);save();refreshUI();renderer.domElement.focus();return;
 }
 if(result.chime){sound.chime('arrival');const o=result.source;if(o){const p=new THREE.Vector3(o.x,.7,o.z).project(camera);effects.burst((p.x*.5+.5)*$('world').clientWidth,(-p.y*.5+.5)*$('world').clientHeight,result.art);}}
 if(result.wave)reactBlender(player,'wave',reduced);
 save();
 if(result.chime&&result.source?.id==='honey')result.text+=' The Honey picnic outfit is now in Inventory → Clothes!';
 if(result.complete)result.text+=' Your Moonlight dress is unlocked in Inventory → Clothes.';
 if(result.complete){const reward=claimAdventureReward(storage);if(reward.claimed)result.text+=reward.name?` ${reward.name} is waiting on your shelf back in the room.`:' Your whole little family is cheering for you back in the room.';if(reward.saveFailed)result.text+=' This browser could not save the room reward. You can return to the shrine to try again.';}
 refreshUI();
 if(!result.choices?.length&&!result.complete){if($('story').open)$('story').close();showDiscovery(result);return;}
 pressed=queued=null;storySource=result.source;$('discovery').hidden=true;$('speaker').textContent=result.speaker;$('storyWords').textContent=result.text;
 const art=questArt(result.art);$('storyImage').hidden=!art;if(art)$('storyImage').src=art;
 $('storyChoices').replaceChildren();
 for(const choice of result.choices||[]){const button=document.createElement('button');button.textContent=choice.label;button.onclick=()=>showStory(interactAdventure(state,choice.id,storySource));$('storyChoices').append(button);}
 $('returnRoom').hidden=!result.complete;
 refreshUI();if(!$('story').open)$('story').showModal();
}
function checkEncounter(){const o=encounters.take(state);if(o)showStory(interactAdventure(state,o.type==='M'?'accept':undefined,o));}
function interact(){if(!ready||motion||modal())return;const o=nearbyObject(state);encounters.mark(state,o);reactBlender(player,'wave',reduced);showStory(interactAdventure(state,undefined,o));}
function usePath(type){if(!ready||motion||modal())return;const result=enterAdventurePath(state,type);if(result.changedMap)showStory(result);}
$('interact').onclick=interact;
$('closeStory').onclick=()=>$('story').close();$('story').addEventListener('close',()=>{pendingEncounter=true;refreshUI();renderer?.domElement.focus();});
function openBag(){
 if(!ready)return;pressed=queued=null;$('bagQuest').textContent=questText(state);
 $('charms').replaceChildren();for(const [id,name] of [['rose','Rose'],['honey','Honey'],['sky','Sky']]){const el=document.createElement('span'),img=document.createElement('img');img.src=questArt(id);img.alt='';el.append(img,document.createTextNode(name));el.className=state.charms.includes(id)?'':'missing';el.setAttribute('aria-label',name+' charm'+(state.charms.includes(id)?', collected':', missing'));$('charms').append(el);}
 $('questComplete').textContent=state.complete?'Moonflower restored. Your little story is saved. ♡':'Every little step counts. There is no timer.';$('inventory').showModal();
 if(!preview)preview=new EquipmentPreview(loadedAsset,$('equipmentPreview'),{software:renderer.software,reduced});
 preview.resize();refreshEquipment();
}
$('bag').onclick=openBag;for(const id of ['closeBag','backToWorld'])$(id).onclick=()=>$('inventory').close();$('inventory').addEventListener('close',()=>renderer?.domElement.focus());
$('sound').onclick=async()=>{const on=await sound.toggle();$('sound').textContent=on?'♫ On':'♫ Off';$('sound').setAttribute('aria-pressed',String(on));$('sound').setAttribute('aria-label',on?'Turn sound off':'Turn sound on');};
$('retry').onclick=()=>location.reload();
function step(direction){
 if(!ready||modal())return;if(motion){queued=direction;return;}
 const from=player.position.clone(),oldMap=state.map,result=moveAdventure(state,direction);
 pendingEncounter=true;
 player.rotation.y={up:Math.PI,down:0,left:-Math.PI/2,right:Math.PI/2}[direction];
 if(result.message)notice(result.message);
 if(result.moved){
  if(oldMap!==state.map){$('discovery').hidden=true;effects.clear();buildWorld();player.position.set(state.x,0,state.z);followCamera(true);}
  else if(reduced)player.position.set(state.x,0,state.z);
  else motion={from,to:new THREE.Vector3(state.x,0,state.z),time:0};
  save();
 }
 refreshUI();
}
addEventListener('keydown',e=>{
 if(modal())return;const direction=dirs[e.key];
 if(direction){e.preventDefault();if(pressed!==direction){pressed=direction;step(direction);}}
 else if((e.key===' '||e.key==='Enter')&&e.target.tagName!=='BUTTON'&&e.target.tagName!=='A'){e.preventDefault();interact();}
});
addEventListener('keyup',e=>{if(dirs[e.key]===pressed)pressed=null;});
addEventListener('blur',()=>pressed=queued=null);
for(const b of document.querySelectorAll('[data-direction]')){
 b.onpointerdown=e=>{e.preventDefault();pressed=b.dataset.direction;b.setPointerCapture(e.pointerId);step(pressed);};
 b.onpointerup=b.onpointercancel=()=>pressed=null;
 b.onclick=e=>{if(e.detail===0)step(b.dataset.direction);};
}
document.addEventListener('visibilitychange',()=>{pressed=queued=null;if(document.hidden)sound.suspend();else sound.resume();});
// Soft low-poly map pieces keep the imported Kitty readable on phones.
const material=color=>new THREE.MeshStandardMaterial({color,roughness:.9});
const cube=new THREE.BoxGeometry(1,1,1),sphere=new THREE.SphereGeometry(1,14,10);
function mesh(parent,geometry,mat,x,y,z,sx=1,sy=sx,sz=sx){const o=new THREE.Mesh(geometry,mat);o.position.set(x,y,z);o.scale.set(sx,sy,sz);parent.add(o);return o;}
const mats={grass:[material('#d7e4c1'),material('#d2dfba')],stone:[material('#d9d1e7'),material('#d3cbe2')],hedge:material('#b6c99f'),wall:material('#b8a9ce'),pink:material('#d992b3'),cream:material('#fff0da'),gold:material('#eed395'),water:material('#b8dce4'),ink:new THREE.MeshBasicMaterial({color:'#4a354b'})};
function label(text,x,y,z,action){const el=document.createElement(action?'button':'span');el.textContent=text;el.className='world-label';if(action){el.classList.add('world-action');el.onclick=action;}$('world').append(el);labels.push({el,point:new THREE.Vector3(x,y,z)});}
function arch(parent){
 const g=new THREE.Group();parent.add(g);
 for(const x of [-.43,.43])mesh(g,new THREE.CylinderGeometry(.07,.07,.8,10),mats.pink,x,.4,0);
 mesh(g,new THREE.TorusGeometry(.43,.075,8,22,Math.PI),mats.pink,0,.8,0);return g;
}
function buildWorld(){
 world.clear();rendered.length=0;labels.forEach(l=>l.el.remove());labels.length=0;
 const map=MAPS[state.map],garden=state.map==='garden',matrix=new THREE.Matrix4();scene.background=new THREE.Color(garden?'#e5d9ef':'#e6e4d3');
 const pathTile=(x,z)=>garden?x===7||z===7||z===10:x===7||z===5||z===8&&x<8||x===12&&z<=5||z===2&&x>=7;
 const floorPalette=[...(garden?mats.stone:mats.grass),mats.cream];
 for(let parity=0;parity<3;parity++){
  const floor=new THREE.InstancedMesh(cube,floorPalette[parity],map.w*map.h);let i=0;
  for(let z=0;z<map.h;z++)for(let x=0;x<map.w;x++)if((pathTile(x,z)?2:(x+z)%2)===parity){if(renderer.software)mesh(world,cube,floorPalette[parity],x,-.11,z,.995,.20,.995);else{matrix.compose(new THREE.Vector3(x,-.11,z),new THREE.Quaternion(),new THREE.Vector3(.995,.20,.995));floor.setMatrixAt(i++,matrix);}}floor.count=i;if(!renderer.software)world.add(floor);
 }
 const walls=new THREE.InstancedMesh(cube,garden?mats.wall:mats.hedge,map.w*map.h);let n=0;
 for(let z=0;z<map.h;z++)for(let x=0;x<map.w;x++)if(map.rows[z][x]==='#'){if(renderer.software)mesh(world,cube,garden?mats.wall:mats.hedge,x,.25,z,.96,.65,.96);else{matrix.compose(new THREE.Vector3(x,.25,z),new THREE.Quaternion(),new THREE.Vector3(.96,.65,.96));walls.setMatrixAt(n++,matrix);}}walls.count=n;if(!renderer.software)world.add(walls);
 for(const object of map.objects){
  const g=new THREE.Group();g.position.set(object.x,0,object.z);world.add(g);rendered.push({object,mesh:g});
  if(object.type==='H'){
   mesh(g,cube,mats.cream,0,.65,0,2.25,1.3,2.25);
   const roof=mesh(g,new THREE.ConeGeometry(1.85,.85,4),mats.pink,0,1.7,0);roof.rotation.y=Math.PI/4;
   mesh(g,cube,mats.gold,0,.43,1.14,.48,.86,.04);
   for(const x of [-.75,.75]){mesh(g,cube,mats.water,x,.82,1.14,.43,.43,.035);mesh(g,cube,mats.cream,x,.82,1.17,.035,.45,.02);}
   mesh(g,cube,mats.cream,0,.05,1.25,.7,.1,.3);
  }
  if(object.type==='T'){
   mesh(g,cube,mats.pink,0,.28,0,.15,.55,.15);mesh(g,sphere,mats.gold,0,.65,0,.17,.22,.17);mesh(g,new THREE.ConeGeometry(.24,.18,6),mats.cream,0,.92,0);
  }
  if(object.type==='M'){const teddy=makeGift('teddy');teddy.scale.setScalar(1.5);teddy.position.y=.25;g.add(teddy);label('Momo',object.x,1.5,object.z);}
  if(object.type==='Q'){
   for(const [x,y,s] of [[-.28,.65,.29],[0,.78,.37],[.29,.65,.27]])mesh(g,sphere,mats.cream,x,y,0,s,s*.8,s*.7);
   for(const x of [-.1,.1])mesh(g,sphere,mats.ink,x,.78,.255,.026,.036,.018);label('Cloud guardian',object.x,1.45,object.z);
  }
  if(object.type==='C'){
   const lid=new THREE.Group();lid.position.set(0,.32,-.22);g.add(lid);mesh(lid,cube,mats.gold,0,0,.22,.63,.12,.48);
   mesh(g,cube,mats.pink,0,.17,0,.61,.31,.45);mesh(g,cube,mats.cream,0,.24,.235,.12,.17,.025);
   lid.rotation.x=state.charms.includes(object.id)?-.85:0;
  }
  if(object.type==='G'){arch(g);mesh(g,cube,mats.gold,0,.55,0,.7,.75,.08);label('Moon gate',object.x,1.5,object.z);}
  if(object.type==='D'||object.type==='E'){arch(g);mesh(g,cube,mats.cream,0,.015,0,.8,.04,.8);label(object.type==='D'?'Enter dungeon ↗':'Return to village ↗',object.x,1.45,object.z,()=>usePath(object.type));}
  if(object.type==='F'){
   mesh(g,new THREE.CylinderGeometry(.55,.55,.25,20),mats.cream,0,.12,0);mesh(g,new THREE.CylinderGeometry(.45,.45,.02,20),mats.water,0,.26,0);mesh(g,new THREE.CylinderGeometry(.10,.14,.65,12),mats.cream,0,.45,0);
  }
  if(object.type==='S'||object.type==='o'){
   const y=object.type==='S'?.55:.25;if(object.type==='S'){mesh(g,new THREE.CylinderGeometry(.5,.55,.35,16),mats.cream,0,.17,0);label('Moonflower',object.x,1.55,object.z);}
   mesh(g,new THREE.CylinderGeometry(.025,.025,.45,8),mats.hedge,0,y,0);
   for(let i=0;i<5;i++){const a=i*Math.PI*2/5;mesh(g,sphere,mats.pink,Math.sin(a)*.16,y+.25+Math.cos(a)*.16,0,.12,.14,.06);}mesh(g,sphere,mats.gold,0,y+.25,.07,.095,.095,.04);
  }
 }
 refreshUI();
}
function followCamera(snap=false,dt=.016){
 const map=MAPS[state.map],target=new THREE.Vector3(THREE.MathUtils.clamp(player.position.x,3,map.w-4),0,THREE.MathUtils.clamp(player.position.z,3,map.h-4));
 const desired=target.clone().add(new THREE.Vector3(0,8,6));
 camera.position.lerp(desired,snap||reduced?1:1-Math.exp(-dt*7));camera.lookAt(new THREE.Vector3(camera.position.x,0,camera.position.z-6));camera.updateMatrixWorld(true);
 for(const l of labels){const p=l.point.clone().project(camera);l.el.hidden=p.x<-1||p.x>1||p.y<-1||p.y>1;l.el.style.left=(p.x*.5+.5)*$('world').clientWidth+'px';l.el.style.top=(-p.y*.5+.5)*$('world').clientHeight+'px';}
}
try{
 const asset=await loadBlenderKitty();loadedAsset=asset;scene=new THREE.Scene();world=new THREE.Group();scene.add(world);
 const probe=document.createElement('canvas'),gl=probe.getContext('webgl2',{antialias:true});
 renderer=gl?new THREE.WebGLRenderer({canvas:probe,context:gl,antialias:true}):new CanvasFallback();
 renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.shadowMap.enabled=false;
 renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','Moonflower Adventure. Walk up to friends and treasure to discover them automatically. Arrow keys or WASD to walk.');$('world').prepend(renderer.domElement);
 scene.add(new THREE.HemisphereLight('#fff4ef','#baa6cf',2.8));const light=new THREE.DirectionalLight('#fff1d2',2);light.position.set(-3,9,6);scene.add(light);
 camera=new THREE.OrthographicCamera(-6,6,4,-4,.1,60);
 renderer.domElement.addEventListener('click',e=>{
  if(!ready||motion||modal())return;
  const rect=renderer.domElement.getBoundingClientRect(),ray=new THREE.Raycaster();
  ray.setFromCamera(new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),camera);
  for(const o of MAPS[state.map].objects.filter(o=>o.type==='D'||o.type==='E')){
   const bounds=new THREE.Box3(new THREE.Vector3(o.x-.75,0,o.z-.5),new THREE.Vector3(o.x+.75,1.7,o.z+.5));
   if(ray.ray.intersectBox(bounds,new THREE.Vector3())){usePath(o.type);break;}
  }
 });
 player=makeBlenderKitty(asset);player.scale.setScalar(.48);player.position.set(state.x,0,state.z);player.rotation.y={up:Math.PI,down:0,left:-Math.PI/2,right:Math.PI/2}[state.facing];scene.add(player);
 refreshEquipment();saveEquipment();
 const resize=()=>{const w=$('world').clientWidth,h=$('world').clientHeight;renderer.setSize(w,h,false);const half=w/h<1?4.0:4.4;camera.left=-half*w/h;camera.right=half*w/h;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();};
 new ResizeObserver(resize).observe($('world'));resize();ready=true;buildWorld();followCamera(true);$('loading').hidden=true;save();
 if(state.complete)claimAdventureReward(storage);
 clock=new THREE.Clock();let repeat=0;
 renderer.setAnimationLoop(()=>{
  const elapsed=clock.getDelta(),dt=Math.min(elapsed,.1);repeat+=dt;
  if(motion){motion.time+=dt;const p=Math.min(1,motion.time/.18);player.position.lerpVectors(motion.from,motion.to,p);player.position.y=Math.sin(p*Math.PI)*.045;player.rotation.z=Math.sin(p*Math.PI)*.02;if(p===1){motion=null;player.position.y=0;player.rotation.z=0;refreshUI();}}
  if(!motion&&!modal()&&pendingEncounter){pendingEncounter=false;checkEncounter();}
  if(!motion&&!modal()){const dir=queued||pressed;if(dir&&(queued||repeat>.18)){queued=null;repeat=0;step(dir);}}
  updateBlender(player,elapsed,{reduced,idle:!motion&&!modal()});followCamera(false,dt);
  for(const {object,mesh} of rendered)if(object.type==='C'){const lid=mesh.children[0],target=state.charms.includes(object.id)?-.85:0;lid.rotation.x=reduced?target:THREE.MathUtils.lerp(lid.rotation.x,target,1-Math.exp(-dt*9));}
  effects.update(Math.min(elapsed,1));if(discoveryTime>0){discoveryTime-=Math.min(elapsed,1);if(discoveryTime<=0)$('discovery').hidden=true;}
  if(noticeTime>0){noticeTime-=dt;if(noticeTime<=0)$('notice').classList.remove('visible');}
  if(!$('inventory').open)renderer.render(scene,camera);else if(preview&&!$('previewPane').hidden)preview.render(elapsed);
 });
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();pressed=queued=null;$('error').hidden=false;});
}catch(error){console.error('Adventure failed to load:',error);$('loading').hidden=true;$('error').hidden=false;}

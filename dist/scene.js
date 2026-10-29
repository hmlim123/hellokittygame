import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {material,ball,box,cylinder,tube,makeKitty,makeBow,heartMesh,label,useSoftwareDetail,updateFace} from './models.js';
import {CanvasFallback} from './CanvasFallback.js';
import {soften,blinkAmount,expressionTarget} from './expression.js';
import {avatarPose} from './chat.js';
import {THEMES} from './state.js';
import {FriendArrival} from './friend-arrival.js';
import {makeStrawberry,setHeldGift,playHeldItem,updateHeldItem} from './gifts.js';
import {makeBlenderKitty,reactBlender,updateBlender,setBlenderAttention,blenderTouchPart} from './blender-kitty.js';
import {applyEquipment} from './equipment-model.js?v=wardrobe-6';
export class KittyRoom{
  constructor(container,{asset=null,onSlot=()=>{},onKitty=()=>{},onGift=()=>{},onFrame=()=>{}}={}){
    this.asset=asset;this.container=container;this.onSlot=onSlot;this.onKitty=onKitty;this.onGift=onGift;this.onFrame=onFrame;
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#f6dce5');
    const probe=document.createElement('canvas'),gl=probe.getContext('webgl2',{antialias:true});
    if(gl){this.renderer=new THREE.WebGLRenderer({canvas:probe,context:gl,antialias:true,alpha:false,powerPreference:'high-performance'});}else{useSoftwareDetail();this.renderer=new CanvasFallback();}
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));this.renderer.shadowMap.enabled=false;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.18;
    this.renderer.domElement.setAttribute('aria-label','Interactive 3D Hello Kitty room. Drag to rotate, scroll or pinch to zoom.');this.renderer.domElement.tabIndex=0;container.prepend(this.renderer.domElement);
    this.camera=new THREE.PerspectiveCamera(37,1,.1,80);this.camera.position.set(10,8.2,12.3);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.target.set(0,1.45,0);this.controls.enableDamping=true;this.controls.dampingFactor=.08;this.controls.enablePan=false;this.controls.minDistance=8;this.controls.maxDistance=23;this.controls.minPolarAngle=.48;this.controls.maxPolarAngle=1.3;this.controls.minAzimuthAngle=-.18;this.controls.maxAzimuthAngle=1.15;this.controls.rotateSpeed=.65;
    this.ambient=new THREE.HemisphereLight('#fff8ef','#b8a5a6',2.15);this.scene.add(this.ambient);
    this.sun=new THREE.DirectionalLight('#fff1d5',3.1);this.sun.position.set(-3,9,6);this.sun.castShadow=false;this.sun.shadow.mapSize.set(1024,1024);Object.assign(this.sun.shadow.camera,{left:-8,right:8,top:9,bottom:-8,near:1,far:25});this.sun.shadow.normalBias=.035;this.sun.shadow.bias=-.0001;this.scene.add(this.sun);
    this.fill=new THREE.DirectionalLight('#f9d4e0',.8);this.fill.position.set(5,3,0);this.scene.add(this.fill);
    this.lampLight=new THREE.PointLight('#ffd2a1',0,8,1.8);this.lampLight.position.set(-2.9,2.7,1.8);this.scene.add(this.lampLight);
    if(!this.renderer.software){this.backdropMat=material('#f4eae2');const backdrop=new THREE.Mesh(new THREE.PlaneGeometry(200,200),this.backdropMat);backdrop.rotation.x=-Math.PI/2;backdrop.position.y=-.4;backdrop.receiveShadow=true;this.scene.add(backdrop);}
    this.room=new THREE.Group();this.scene.add(this.room);this.wallMat=material('#f0d5d8');this.rugMat=material('#d49aab',true);this.accentMat=material('#df9cae',true);
    this.white=material('#fff7e9');this.wood=material('#d4ae8b');this.darkWood=material('#b18c70');this.buildRoom();this.gifts.forEach(g=>g.visible=false);
    this.hero=this.createKitty(0);this.hero.position.set(-.12,.08,.65);this.hero.rotation.y=.3;this.hero.scale.setScalar(1.25);this.room.add(this.hero);this.heroCache=new Map([[0,this.hero]]);
    this.shelfDolls=[];this.shelfCache=new Map();this.slots=[[-.44,.65,-2.65],[1.0,.65,-2.65],[2.44,.65,-2.65],[-.44,2.01,-2.65],[1,2.01,-2.65],[2.44,2.01,-2.65]];this.slotTargets=[];
    const slotmat=new THREE.MeshBasicMaterial({color:'#f6ca75',transparent:true,opacity:0,depthWrite:false});
    this.slots.forEach((p,i)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(1.25,1.18,.7),slotmat.clone());m.position.set(p[0],p[1]+.55,p[2]);m.userData={kind:'slot',index:i};this.room.add(m);this.slotTargets.push(m)});
    this.bows=[];this.bowPositions=[[-2.75,2.7,1],[2.5,2.1,1.7],[.5,3.8,-.6],[-1.5,1.2,2.4],[2.9,3.3,-.7],[-2.4,3.6,-1.2],[1.2,1.3,2.65],[-.7,3.1,1.2]];
    for(let i=0;i<4;i++){const bow=makeBow(['#df7799','#c99bce','#dbb76f','#9dbcb4'][i],.58);bow.userData={kind:'bow',index:i};bow.visible=false;this.room.add(bow);this.bows.push(bow)}this.bowIndices=[0,1,2,3];
    this.huntPositions=this.bowPositions;this.memoryPositions=[[-2.2,2.4,1.2],[-.75,3.0,1.2],[.75,3.0,1.2],[2.2,2.4,1.2]];
    this.missionGroups={bows:this.bows,strawberries:[],hearts:[]};
    for(let i=0;i<4;i++){
      const berry=makeStrawberry();berry.scale.setScalar(1.1);berry.visible=false;this.room.add(berry);this.missionGroups.strawberries.push(berry);
      const h=heartMesh(['#d77b9e','#b6a2da','#eaca77','#94bdc9'][i],.25);h.visible=false;h.userData.baseScale=h.scale.clone();this.room.add(h);this.missionGroups.hearts.push(h);
    }
    this.missionKind='bows';this.missionFlash=-1;this.heldGift='flowers';
    this.ray=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.confetti=[];this.faceState={joy:0,smile:0,sleepy:0,yawn:0,warmth:0};this.poseState={lift:0,tilt:0,turn:0,left:-.35,right:.35,squash:1};this.blinkTime=-1;this.nextBlink=2.5;this.waveTime=0;this.chatting=false;this.reaction=null;this.nextHello=12;this.selected=false;this.inspect=false;this.night=false;this.hunting=false;this.reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.arrival=null;
    this.renderer.domElement.addEventListener('pointermove',e=>{const r=this.renderer.domElement.getBoundingClientRect();if(this.asset)setBlenderAttention(this.hero,(e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2);});
    this.renderer.domElement.addEventListener('pointerleave',()=>{if(this.asset)setBlenderAttention(this.hero);});
    let down;this.renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});this.renderer.domElement.addEventListener('pointercancel',()=>down=null);this.renderer.domElement.addEventListener('pointerup',e=>{const start=down;down=null;if(!start||Math.hypot(e.clientX-start.x,e.clientY-start.y)>7)return;this.pick(e);});
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);this.resize();this.clock=new THREE.Clock();this.renderer.setAnimationLoop(()=>this.frame());
  }
  createKitty(id){return this.asset?makeBlenderKitty(this.asset,id):makeKitty(id);}
  buildRoom(){const r=this.room,w=this.white,wood=this.wood;
    box(r,material('#ecd9c3'),0,-.15,0,9.2,.38,7.8);
    box(r,material('#f1dfc8'),0,.055,0,9,.08,7.6);
    const seam=material('#dcbf9f');for(let x=-4.1;x<4.5;x+=.55)box(r,seam,x,.101,0,.012,.005,7.55);for(let z=-3;z<3.8;z+=1.6)for(let x=-4;x<4;x+=1.1)box(r,seam,x,.103,z+(Math.round(x)%2)*.35,.54,.004,.009);
    box(r,this.wallMat,0,2.45,-3.85,9.2,4.7,.18);box(r,this.wallMat,-4.55,2.45,0,.18,4.7,7.8);
    box(r,w,0,.25,-3.71,9,.23,.1);box(r,w,-4.41,.25,0,.1,.23,7.6);
    const stripe=material('#fff3e9');for(let x=-4.35;x<4.5;x+=.58)box(r,stripe,x,2.5,-3.747,.11,4.45,.012);for(let z=-3.55;z<3.8;z+=.58)box(r,stripe,-4.447,2.5,z,.012,4.45,.11);
    // An oval, stitched rug under the star of the room.
    const rug=cylinder(r,this.rugMat,0,.125,1.0,2.15,.055);rug.scale.z=.72;
    const rugedge=meshRing(2.0,.018,material('#fff2e2'));rugedge.rotation.x=-Math.PI/2;rugedge.scale.y=.72;rugedge.position.set(0,.159,1);r.add(rugedge);
    const rugInner=meshRing(1.9,.012,material('#eec7c9'));rugInner.rotation.x=-Math.PI/2;rugInner.scale.y=.72;rugInner.position.set(0,.161,1);r.add(rugInner);
    // Six open cubbies. Each shelf can hold any collected plushie.
    const cabinet=new THREE.Group();cabinet.position.set(1,0,-2.95);r.add(cabinet);
    box(cabinet,material('#f4e4d1'),0,1.97,-.42,4.5,3.3,.08);
    for(let x of[-2.25,2.25])box(cabinet,w,x,1.95,0,.14,3.5,1.05);
    for(let y of[.49,1.86,3.25])box(cabinet,w,0,y,0,4.65,.14,1.12);
    for(let x of[-.72,.72])box(cabinet,w,x,1.87,0,.08,2.7,.92);
    box(cabinet,this.accentMat,0,.35,0,4.52,.14,1.06);
    for(let x of[-1.9,1.9])for(let z of[-.25,.35])cylinder(cabinet,wood,x,.23,z,.07,.25);
    const cabinetBow=makeBow('#e9afbc',.65);cabinetBow.position.set(0,3.55,.05);cabinet.add(cabinetBow);
    label(cabinet,'little things, big love',0,3.57,.16,3,.32,{size:42,color:'#9d7668'});
    // A sunlit window and soft curtains on the left wall.
    const windowGroup=new THREE.Group();windowGroup.position.set(-4.42,2.95,-.7);windowGroup.rotation.y=Math.PI/2;r.add(windowGroup);
    const glass=material('#c4dce1');glass.emissive=new THREE.Color('#d2e7e5');glass.emissiveIntensity=.25;box(windowGroup,glass,0,0,0,1.9,2.1,.05);
    for(let x of[-1,0,1])box(windowGroup,w,x,0,.08,.075,2.25,.1);for(let y of[-1.1,0,1.1])box(windowGroup,w,0,y,.08,2.1,.075,.1);
    box(windowGroup,w,0,-1.15,.2,2.4,.12,.5);const curtainMat=material('#eed2cf',true);
    for(let side of[-1,1])for(let k=0;k<4;k++){const c=cylinder(windowGroup,curtainMat,side*(1.03+k*.075),0,.22,.11,2.48);c.scale.z=.5;}tube(windowGroup,[[-1.5,1.32,.15],[0,1.32,.15],[1.5,1.32,.15]],.035,wood);
    // A few slow petals at the window, with no particles crossing the controls.
    this.petals=[];
    for(let i=0;i<5;i++){const p=ball(windowGroup,material(i%2?'#eed0da':'#fff3de'),0,0,.06,.035,.065,.012);p.userData.phase=i/5;this.petals.push(p);}
    // A pillowy reading chair.
    const chair=new THREE.Group();chair.position.set(-2.95,.2,-1.35);chair.rotation.y=.48;r.add(chair);
    const chairMat=material('#dfb4bb',true);ball(chair,chairMat,0,.65,0,.72,.22,.65);ball(chair,chairMat,0,1.16,-.38,.74,.65,.23);ball(chair,chairMat,-.64,.88,.03,.2,.32,.61);ball(chair,chairMat,.64,.88,.03,.2,.32,.61);
    for(const x of[-.45,.45])for(const z of[-.34,.34])cylinder(chair,wood,x,.25,z,.065,.5);
    const cushion=ball(chair,material('#fff0dd',true),0,1.15,-.12,.38,.3,.12);cushion.rotation.z=.2;const cushionHeart=heartMesh('#d998a7',.12);cushionHeart.position.set(0,1.15,.02);chair.add(cushionHeart);
    // A tea table with a tiny flower pot and a book.
    cylinder(r,wood,2.9,.62,1.5,.075,1.05);cylinder(r,w,2.9,1.18,1.5,.7,.1);cylinder(r,wood,2.9,.18,1.5,.4,.08);
    const book=box(r,material('#c1cbb5'),2.7,1.27,1.64,.55,.09,.4);book.rotation.y=-.22;box(r,w,2.7,1.27,1.84,.5,.045,.01);
    this.flowerPot(r,3.15,1.26,1.3,.55);
    const mug=meshCylinder(.15,.12,.21,material('#e7bec5'));mug.position.set(2.52,1.38,1.28);r.add(mug);const handle=meshRing(.105,.025,material('#e7bec5'));handle.position.set(2.72,1.4,1.28);r.add(handle);
    // Warm floor lamp.
    cylinder(r,wood,-3.3,1.18,1.85,.035,2.1);cylinder(r,wood,-3.3,.18,1.85,.3,.06);const shade=meshCylinder(.38,.56,.53,material('#fff0d5'));shade.position.set(-3.3,2.34,1.85);r.add(shade);
    // Gifts to explore and a handwritten wall print.
    this.gifts=[];for(let i=0;i<2;i++){const g=new THREE.Group();g.position.set(-2.5+i*.65,.1,2.6-i*.3);g.rotation.y=i?-.2:.12;r.add(g);const gm=material(i?'#d6c8df':'#edb9c2');box(g,gm,0,.27,0,.58,.54,.58);box(g,w,0,.55,0,.62,.07,.62);box(g,material('#fff5df'),0,.28,.298,.09,.54,.012);box(g,material('#fff5df'),.298,.28,0,.012,.54,.09);const b=makeBow(i?'#b5a2c5':'#d9839d',.4);b.position.set(0,.66,0);b.rotation.x=-Math.PI/2;g.add(b);g.userData={kind:'gift'};this.gifts.push(g);}
    const frame=new THREE.Group();frame.position.set(-2.7,3.25,-3.65);r.add(frame);box(frame,wood,0,0,0,1.38,1.55,.09);box(frame,w,0,0,.06,1.23,1.4,.035);const h=heartMesh('#d59bac',.27);h.position.set(0,.15,.1);frame.add(h);label(frame,'you are loved',0,-.4,.1,1.1,.25,{size:48,color:'#ac8474'});
    this.flowerPot(r,-3.9,.1,2.8,.85);
  }
  flowerPot(parent,x,y,z,s){const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(s);parent.add(g);cylinder(g,material('#cfaa8b'),0,.17,0,.23,.34,.17);const green=material('#8fa287');for(let i=0;i<5;i++){const a=i*2.4;const px=Math.cos(a)*.19,pz=Math.sin(a)*.19;tube(g,[[0,.3,0],[px,.52,pz],[px,.8+(i%2)*.15,pz]],.014,green);const yy=.8+(i%2)*.15;for(let k=0;k<5;k++)ball(g,material(i%2?'#eabcc6':'#fff1d4'),px+Math.cos(k*1.256)*.09,yy+Math.sin(k*1.256)*.09,pz,.07,.07,.035);ball(g,material('#d7b664'),px,yy,pz+.02,.035);const leaf=ball(g,green,px*.5,.54,pz,.12,.035,.05);leaf.rotation.z=a;}return g;}
  resize(){const w=this.container.clientWidth,h=this.container.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();if(!this.inspect){const distance=w/h<.85?20.5:16.5;this.camera.position.copy(new THREE.Vector3(10,8.2,12.3).normalize().multiplyScalar(distance));this.controls.target.set(0,1.6,0);}this.controls.update();}
  updateShelf(slots,exclude=null){for(const d of this.shelfDolls)d.visible=false;this.shelfDolls=[];slots.forEach((id,i)=>{if(id===null||id===exclude)return;let k=this.shelfCache.get(id);if(!k){k=this.createKitty(id);k.scale.setScalar(.51);this.shelfCache.set(id,k);this.room.add(k);}k.visible=true;k.position.set(...this.slots[i]);k.userData.slot=i;this.shelfDolls.push(k);});}
  welcomeFriend(id,slots,onComplete){
    if(this.arrival)this.finishArrival();
    if(this.reduced){this.updateShelf(slots);onComplete();return;}
    this.updateShelf(slots,id);this.inspect=true;this.controls.minDistance=6;this.controls.maxDistance=16;this.controls.target.set(.4,1.5,.2);this.camera.position.set(5.5,4.3,8.5);this.controls.update();
    const visitor=this.createKitty(id);visitor.rotation.y=.15;this.room.add(visitor);
    this.arrival={visitor,slots:[...slots],clock:new FriendArrival(this.slots[slots.indexOf(id)]),waved:false,onComplete};
  }
  finishArrival(){
    const a=this.arrival;if(!a)return;this.arrival=null;
    reactBlender(a.visitor,null);a.visitor.userData.blender.mixer.stopAllAction();
    this.shelfCache.set(a.visitor.userData.id,a.visitor);a.visitor.rotation.y=0;
    this.updateShelf(a.slots);this.inspectKitty();a.onComplete();
  }
  updateArrival(dt){
    const a=this.arrival;if(!a)return;
    const pose=a.clock.advance(Math.min(dt,.5));a.visitor.position.set(...pose.position);a.visitor.scale.setScalar(pose.scale);
    if(pose.phase==='wave'&&!a.waved){a.waved=true;reactBlender(a.visitor,'wave');}
    updateBlender(a.visitor,dt,{idle:false});
    if(pose.justFinished)this.finishArrival();
  }
  celebrateCatch(position){
    if(this.reduced)return;
    this.react('catch');
    for(let i=0;i<4;i++){const h=heartMesh(i%2?'#e5a0b9':'#f2c5d3',.045);h.position.copy(position);h.userData={velocity:new THREE.Vector3((i-1.5)*.12,.35+i*.06,0),life:.75+i*.1,heart:true};this.scene.add(h);this.confetti.push(h);}
  }
  setHero(id){this.room.remove(this.hero);let h=this.heroCache.get(id);if(!h){h=this.createKitty(id);this.heroCache.set(id,h);}h.position.set(-.12,.08,.65);h.rotation.y=.3;h.scale.setScalar(1.25);this.room.add(h);this.hero=h;if(this.equipment)this.setEquipment(this.equipment);else if(this.asset)setHeldGift(this.hero,this.heldGift);this.waveTime=1.5;if(this.rewardEquipped)this.setRewardGifts(this.rewardEquipped,this.baseRewardTheme);}
  setRewardGifts(equipped={},baseTheme='rose'){
    this.rewardEquipped={...equipped};this.baseRewardTheme=baseTheme;
    const colors={sky:['#dce7f2','#b4abd5','#9cbacb'],gold:['#f5e6b9','#d8b56e','#e2c582'],twilight:['#d9d0e9','#9b8dba','#b9a1cc']}[equipped.theme];
    if(colors){this.wallMat.color.set(colors[0]);this.rugMat.color.set(colors[1]);this.accentMat.color.set(colors[2]);}else this.setTheme(baseTheme);
    if(!this.rewardDecorations){
      this.rewardDecorations={hearts:new THREE.Group(),garden:new THREE.Group()};
      for(const group of Object.values(this.rewardDecorations))this.room.add(group);
      const garland=this.rewardDecorations.hearts;
      tube(garland,[[-1.1,4.3,-3.48],[1,3.97,-3.48],[3.15,4.3,-3.48]],.018,material('#d4b185'));
      for(let i=0;i<7;i++){const x=-.9+i*.64,y=4.09-Math.sin(i/6*Math.PI)*.2,h=heartMesh(i%2?'#cf87a5':'#edb9c6',.13);h.position.set(x,y,-3.4);garland.add(h);}
      this.flowerPot(this.rewardDecorations.garden,-1.85,.12,1.05,.8);
      this.flowerPot(this.rewardDecorations.garden,1.7,.12,2.3,.7);
      this.flowerPot(this.rewardDecorations.garden,2.05,.12,-.2,.85);
    }
    for(const [id,group] of Object.entries(this.rewardDecorations))group.visible=equipped.decoration===id;
    if(!this.rewardCrown){
      this.rewardCrown=new THREE.Group();const gold=material('#e8c76c');
      const band=new THREE.Mesh(new THREE.TorusGeometry(.23,.035,8,24),gold);band.rotation.x=Math.PI/2;this.rewardCrown.add(band);
      for(let i=0;i<5;i++){const a=i/5*Math.PI*2,peak=new THREE.Mesh(new THREE.ConeGeometry(.07,.19,5),gold);peak.position.set(Math.cos(a)*.2,.075,Math.sin(a)*.2);this.rewardCrown.add(peak);ball(this.rewardCrown,material('#e9a1b7'),Math.cos(a)*.2,.18,Math.sin(a)*.2,.032);}
      this.rewardCrown.position.set(-.13,.65,.04);this.rewardCrown.rotation.z=.08;
    }
    this.hero.userData.head.add(this.rewardCrown);this.rewardCrown.visible=equipped.accessory==='crown';
  }
  playItem(){const result=playHeldItem(this.hero,this.reduced);if(result.accepted)this.react(this.heldGift==='teddy'?'hug':'pet');return result;}
  setEquipment(equipment){this.equipment={...equipment};this.heldGift=equipment.item;if(this.asset)applyEquipment(this.hero,equipment);}
  setGift(id){if(this.equipment){this.setEquipment({...this.equipment,item:id});return;}this.heldGift=id;if(this.asset)setHeldGift(this.hero,id);}
  react(emotion){if(this.asset){reactBlender(this.hero,emotion,this.reduced);return;}this.emotion=emotion;this.reaction={emotion,elapsed:0};this.waveTime=0;this.nextHello=14;}
  setChat(active){this.chatting=active;if(active){this.inspectKitty();this.react('wave');}else{this.reaction=null;this.resetView();}}
  setTheme(theme){const t=THEMES[theme]||THEMES.rose;this.wallMat.color.set(t.wall);this.rugMat.color.set(t.rug);this.accentMat.color.set(t.accent);}
  setNight(night){this.night=night;this.renderer.night=night;if(this.backdropMat)this.backdropMat.color.set(night?'#343449':'#f4eae2');this.scene.background.set(night?'#343449':'#f5ece5');this.ambient.intensity=night?.9:2.6;this.sun.intensity=night?.65:2.3;this.sun.color.set(night?'#bbc5e5':'#fff1d5');this.fill.intensity=night?.35:.8;this.lampLight.intensity=night?4:0;this.renderer.toneMappingExposure=night?1:1.18;}
  selectSlot(active){this.selected=active;this.slotTargets.forEach(m=>m.material.opacity=active?.15:0);}
  resetView(){this.inspect=false;this.controls.minDistance=8;this.controls.maxDistance=23;this.controls.target.set(0,1.45,0);this.camera.position.set(10,8.2,12.3);this.resize();}
  inspectKitty(){this.inspect=true;this.controls.target.set(-.12,1.35,.65);this.controls.minDistance=3.3;this.controls.maxDistance=10;this.camera.position.set(2.1,2.8,6.5);this.controls.update();this.waveTime=1.5;}
  rotate(delta){const p=this.camera.position.clone().sub(this.controls.target),s=new THREE.Spherical().setFromVector3(p);s.theta=THREE.MathUtils.clamp(s.theta+delta,this.controls.minAzimuthAngle+.01,this.controls.maxAzimuthAngle-.01);this.camera.position.copy(new THREE.Vector3().setFromSpherical(s).add(this.controls.target));this.controls.update();}
  showHunt(active){this.showMission('bows',active);}
  showMission(id,active){
    Object.values(this.missionGroups).flat().forEach(o=>o.visible=false);
    this.hunting=active;this.missionKind=id;this.missionFlash=-1;
    this.bows=this.missionGroups[id]||this.missionGroups.bows;
    this.bowPositions=id==='hearts'?this.memoryPositions:this.huntPositions;
    this.bows.forEach((b,i)=>{b.visible=active;this.bowIndices[i]=i;if(active){if(id==='hearts')b.position.set(...this.bowPositions[i]);else this.moveBow(i);}});
    if(active)this.resetView();
  }
  setMissionFlash(index){this.missionFlash=index;}
  moveBow(i){const used=this.bowIndices.filter((_,j)=>j!==i);let choices=this.bowPositions.map((_,j)=>j).filter(j=>!used.includes(j)&&j!==this.bowIndices[i]);const next=choices[Math.floor(Math.random()*choices.length)];this.bowIndices[i]=next;this.bows[i].position.set(...this.bowPositions[next]);}
  project(pos){const p=pos.clone().project(this.camera);return {x:(p.x*.5+.5)*this.container.clientWidth,y:(-.5*p.y+.5)*this.container.clientHeight,visible:p.z<1&&p.x>-1&&p.x<1&&p.y>-1&&p.y<1};}
  burst(position){const colors=['#e3a2b4','#ead296','#bca9d5','#b7ccb0'];for(let i=0;i<32;i++){const m=new THREE.Mesh(new THREE.SphereGeometry(.035,5,4),material(colors[i%4]));m.position.copy(position);m.userData={velocity:new THREE.Vector3((Math.random()-.5)*3,1+Math.random()*2,(Math.random()-.5)*2),life:1.2+Math.random()*.5};this.scene.add(m);this.confetti.push(m);}}
  heartBurst(){if(this.reduced)return;for(let i=0;i<5;i++){const h=heartMesh('#df8fa7',.065);h.position.copy(this.hero.position).add(new THREE.Vector3((i-2)*.3,2.1+(i%2)*.15,.3));h.userData={velocity:new THREE.Vector3((i-2)*.09,.6,0),life:1.7+i*.09,heart:true};this.scene.add(h);this.confetti.push(h);}}
  giveTreat(){
    if(!this.treat){const g=new THREE.Group(),red=material('#df6d82');ball(g,red,0,0,0,.15,.17,.14);ball(g,red,0,-.12,0,.095,.08,.09);const green=material('#8cae82');for(let i=0;i<5;i++){const leaf=ball(g,green,Math.sin(i*1.257)*.07,.145,Math.cos(i*1.257)*.07,.09,.025,.04);leaf.rotation.y=-i*1.257;}const seed=material('#ffe5b1');for(let i=0;i<8;i++)ball(g,seed,Math.sin(i*2.4)*.1,-.08+(i%3)*.07,.125,.012,.018,.007);this.treat=g;}
    this.hero.add(this.treat);this.treat.visible=true;this.treatTime=0;
  }
  pick(e){const r=this.renderer.domElement.getBoundingClientRect();this.pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);this.ray.setFromCamera(this.pointer,this.camera);if(this.selected){const hit=this.ray.intersectObjects(this.slotTargets,false)[0];if(hit){this.onSlot(hit.object.userData.index);return;}}
    const candidates=[this.hero,...this.shelfDolls,...this.gifts.filter(g=>g.visible)];const hit=this.ray.intersectObjects(candidates,true).find(h=>{for(let o=h.object;o;o=o.parent)if(!o.visible)return false;return true;});if(!hit)return;let p=hit.object;while(p&&!p.userData.kind)p=p.parent;if(p?.userData.kind==='kitty'){this.waveTime=1.6;this.onKitty(p.userData.id,p===this.hero,blenderTouchPart(hit.object));}else if(p?.userData.kind==='gift')this.onGift();}
  frame(){const elapsed=this.clock.getDelta(),dt=Math.min(elapsed,.05),t=this.clock.elapsedTime;const u=this.hero.userData;this.controls.update();if(this.asset){
      updateBlender(this.hero,elapsed,{reduced:this.reduced,idle:!this.hunting&&!this.arrival});
      updateHeldItem(this.hero,elapsed);
      this.updateArrival(elapsed);
    }else{
    if(!this.reduced){this.hero.position.y=.08+Math.sin(t*1.7)*.015;this.hero.userData.head.rotation.z=Math.sin(t*.8)*.025;this.gifts.forEach((g,i)=>g.rotation.y=(i?-.2:.12)+Math.sin(t+i)*.025);}
    if(this.chatting&&!this.reaction&&!this.reduced&&this.emotion!=='sleepy'){this.nextHello-=elapsed;if(this.nextHello<=0)this.react('wave');}
    if(this.reaction)this.reaction.elapsed+=elapsed;
    const pose=avatarPose(this.reaction?.emotion,this.reaction?.elapsed??-1,this.reduced);
    if(this.reaction&&!pose.active)this.reaction=null;
    const emotion=this.reaction?.emotion||(this.chatting?this.emotion:null);
    const target=expressionTarget(emotion,pose.active,this.reaction?.elapsed??0);
    for(const key of Object.keys(this.faceState))this.faceState[key]=soften(this.faceState[key],target[key],elapsed,this.reduced?12:6);
    if(!this.reduced){this.nextBlink-=elapsed;if(this.nextBlink<=0){this.blinkTime=0;this.nextBlink=3.2+Math.random()*2.5;}else if(this.blinkTime>=0)this.blinkTime+=elapsed;}
    updateFace(u.face,this.faceState,this.reduced?0:blinkAmount(this.blinkTime));
    u.blush.color.set('#efd1cd').lerp(new THREE.Color('#edb9bf'),this.faceState.warmth*.55);
    u.cheeks.forEach(c=>{c.position.y=-.21+this.faceState.joy*.012;c.scale.y=.03+this.faceState.warmth*.005;});
    if(this.waveTime>0){this.waveTime=Math.max(0,this.waveTime-elapsed);if(!pose.active&&!this.reduced)pose.right=.35+(1.4+Math.sin(this.waveTime*10)*.18)*Math.min(1,this.waveTime*3);}
    for(const key of Object.keys(this.poseState))this.poseState[key]=soften(this.poseState[key],pose[key],elapsed,key==='lift'?18:8);
    const motion=this.poseState;
    this.hero.position.y=.08+motion.lift+(this.reduced?0:Math.sin(t*1.7)*.012);this.hero.rotation.y=.3+motion.turn;this.hero.scale.set(1.25,1.25*motion.squash,1.25);
    u.head.rotation.z=motion.tilt+(this.reduced?0:Math.sin(t*.8)*.016);u.head.rotation.x=this.reduced?0:Math.sin(t*1.6)*.008+this.faceState.joy*.025;
    u.armL.rotation.z=motion.left;u.armR.rotation.z=motion.right;
    }
    this.petals?.forEach((p,i)=>{const phase=(p.userData.phase+(this.reduced?0:t*.035))%1;p.position.set(Math.sin(phase*5+i)*.65,1.0-phase*2,.06);p.rotation.z=this.reduced?0:Math.sin(t*.5+i)*.35;});
    this.bows.forEach((b,i)=>{if(b.visible){const base=this.bowPositions[this.bowIndices[i]];b.position.y=base[1]+(this.reduced||this.missionKind==='hearts'?0:Math.sin(t*1.6+i)*.12);if(this.missionKind==='hearts')b.scale.copy(b.userData.baseScale).multiplyScalar(this.missionFlash===i&&!this.reduced?1.3:1);b.rotation.y=.45+Math.sin(t+i)*.25;b.rotation.z=Math.sin(t*1.1+i)*.12;}});
    for(let i=this.confetti.length-1;i>=0;i--){const c=this.confetti[i];c.userData.life-=dt;c.position.addScaledVector(c.userData.velocity,dt);if(!c.userData.heart)c.userData.velocity.y-=3*dt;if(c.userData.life<=0){this.scene.remove(c);c.geometry.dispose();c.material.dispose();this.confetti.splice(i,1);}}
    if(this.treat?.visible){this.treatTime+=elapsed;const age=this.treatTime,p=Math.min(1,age/1.1),ease=p*p*(3-2*p);this.treat.position.set(.65*(1-ease),.65+.55*ease,.58);this.treat.rotation.z=-.2+Math.sin(age*5)*.06;this.treat.scale.setScalar(Math.max(.01,1-Math.max(0,age-1.5)));if(!this.reduced)u.head.rotation.x+=Math.sin(age*11)*.025*ease;if(age>2.5)this.treat.visible=false;}
    this.onFrame(elapsed,t);if(!this.inventoryOpen)this.renderer.render(this.scene,this.camera);
  }
}
function meshRing(radius,tubeRadius,mat){return new THREE.Mesh(new THREE.TorusGeometry(radius,tubeRadius,8,64),mat)}
function meshCylinder(top,bottom,height,mat){return new THREE.Mesh(new THREE.CylinderGeometry(top,bottom,height,32),mat)}

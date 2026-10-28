import * as THREE from 'three';
export const GIFTS=[
 {id:'flowers',name:'Little flowers',icon:'🌼',action:'Set up a picnic',description:'Arrange a little picnic with all four gifts.',message:'A little bouquet, just for'},
 {id:'teddy',name:'Cuddle teddy',icon:'🧸',action:'Cuddle the teddy',description:'Give the teddy a gentle squeeze together.',message:'A tiny teddy hug for'},
 {id:'strawberry',name:'Sweet strawberry',icon:'🍓',action:'Feed Kitty',description:'Tap for three little strawberry bites.',message:'The sweetest little strawberry for'},
 {id:'letter',name:'Love letter',icon:'💌',action:'Open your letter',description:'Unseal a real letter written for Nancy.',message:'A little love note for'}
];
const sphere=new THREE.SphereGeometry(1,24,16);
const mat=color=>new THREE.MeshStandardMaterial({color,roughness:.8});
function ball(g,m,x,y,z,sx,sy=sx,sz=sx){const o=new THREE.Mesh(sphere,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);g.add(o);return o;}
function heart(m,size){const s=new THREE.Shape();s.moveTo(0,-.55);s.bezierCurveTo(-1.25,.18,-.62,1.12,0,.5);s.bezierCurveTo(.62,1.12,1.25,.18,0,-.55);const o=new THREE.Mesh(new THREE.ExtrudeGeometry(s,{depth:.08,bevelEnabled:true,bevelSegments:2,bevelSize:.04,bevelThickness:.04,steps:1,curveSegments:12}),m);o.scale.setScalar(size);return o;}
export function makeStrawberry(){
 const g=new THREE.Group(),red=mat('#e8869c'),green=mat('#86a58b'),seed=mat('#ffe7b8');
 ball(g,red,0,0,0,.23,.27,.2);ball(g,red,0,-.18,0,.14,.13,.13);
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5,leaf=ball(g,green,Math.sin(a)*.08,.24,Math.cos(a)*.07,.13,.025,.05);leaf.rotation.y=a;}
 for(let i=0;i<9;i++){const x=(i%3-1)*.105,y=.12-Math.floor(i/3)*.13,z=.2*Math.sqrt(Math.max(.1,1-(x/.23)**2-(y/.28)**2));ball(g,seed,x,y,z,.013,.02,.008);}
 return g;
}
export function makeGift(id){
 const g=new THREE.Group();g.name='Present_'+id;g.userData.interaction='offer';
 if(id==='strawberry'){g.add(makeStrawberry());g.position.set(.18,.12,0);}
 else if(id==='teddy'){
  const honey=mat('#c99869'),cream=mat('#f7dfba'),ink=new THREE.MeshBasicMaterial({color:'#39252b'});
  ball(g,honey,0,.07,0,.23,.27,.15);ball(g,honey,0,.4,.02,.25,.23,.17);
  for(const side of [-1,1]){ball(g,honey,side*.2,.57,.01,.10);ball(g,cream,side*.2,.57,.075,.059,.06,.025);ball(g,honey,side*.25,.07,0,.10,.16,.12);ball(g,honey,side*.13,-.16,.04,.11,.09,.12);ball(g,ink,side*.09,.43,.18,.023,.03,.013);}
  ball(g,cream,0,.33,.17,.11,.075,.025);ball(g,ink,0,.35,.20,.028,.022,.014);ball(g,cream,0,.07,.15,.14,.16,.025);
 }
 else if(id==='letter'){
  const paper=mat('#fff0e0'),rose=mat('#d880a1');
  const envelope=new THREE.Mesh(new THREE.BoxGeometry(.82,.46,.075),paper);envelope.position.y=.16;g.add(envelope);
  const seal=heart(rose,.095);seal.position.set(0,.17,.05);g.add(seal);g.rotation.z=-.12;
 }
 return g;
}
export function setHeldGift(hero,id){
 const b=hero.userData.blender;if(!b)return;
 if(b.itemPlay){restoreProp(b.itemPlay);b.itemPlay=null;}
 id=GIFTS.some(g=>g.id===id)?id:'flowers';
 b.gifts??={original:[...b.model.getObjectByName('CTRL_Bouquet').children],cache:new Map()};
 for(const o of b.gifts.original)o.visible=id==='flowers';
 for(const o of b.gifts.cache.values())o.visible=false;
 if(id!=='flowers'){
  let prop=b.gifts.cache.get(id);if(!prop){prop=makeGift(id);b.model.getObjectByName('CTRL_Bouquet').add(prop);b.gifts.cache.set(id,prop);}prop.visible=true;
 }
 b.gift=id;b.bites=0;for(const prop of b.gifts.cache.values())prop.scale.setScalar(1);
}

function restoreProp(play){play.prop.position.copy(play.position);play.prop.scale.copy(play.scale);play.prop.rotation.copy(play.rotation);}
export function playHeldItem(hero,reduced=false){
 const b=hero.userData.blender;
 if(!['teddy','strawberry'].includes(b.gift))return {accepted:false};
 if(b.itemPlay)return {accepted:false,busy:true};
 const prop=b.gifts.cache.get(b.gift),bite=b.gift==='strawberry'?(b.bites||0)+1:0;
 if(bite)b.bites=bite;
 b.itemPlay={prop,id:b.gift,time:0,duration:reduced ? .35 : 1.35,bite,position:prop.position.clone(),scale:prop.scale.clone(),rotation:prop.rotation.clone(),reduced};
 return {accepted:true,bite,finishedBites:bite===3};
}
export function updateHeldItem(hero,dt){
 const b=hero.userData.blender,p=b.itemPlay;if(!p)return;
 p.time+=Number.isFinite(dt)?Math.max(0,dt):0;restoreProp(p);
 const t=Math.min(1,p.time/p.duration),pulse=Math.sin(t*Math.PI);
 if(!p.reduced){
  if(p.id==='teddy'){p.prop.scale.multiplyScalar(1-pulse*.07);p.prop.position.z-=pulse*.12;}
  else{p.prop.position.y+=pulse*.9;p.prop.position.x*=1-pulse;p.prop.scale.multiplyScalar(1-(p.bite/3)*Math.min(1,t*1.8));}
 }
 if(t===1){
  restoreProp(p);b.itemPlay=null;
  if(p.id==='strawberry'){
   if(p.bite===3){b.bites=0;p.prop.scale.setScalar(1);}
   else p.prop.scale.setScalar(1-p.bite*.18);
  }
 }
}

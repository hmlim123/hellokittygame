import * as THREE from 'three';
export const GIFTS=[
 {id:'flowers',name:'Little flowers',icon:'🌼',message:'A little bouquet, just for'},
 {id:'teddy',name:'Cuddle teddy',icon:'🧸',message:'A tiny teddy hug for'},
 {id:'strawberry',name:'Sweet strawberry',icon:'🍓',message:'The sweetest little strawberry for'},
 {id:'letter',name:'Love letter',icon:'💌',message:'A little love note for'}
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
 id=GIFTS.some(g=>g.id===id)?id:'flowers';
 b.gifts??={original:[...b.model.getObjectByName('CTRL_Bouquet').children],cache:new Map()};
 for(const o of b.gifts.original)o.visible=id==='flowers';
 for(const o of b.gifts.cache.values())o.visible=false;
 if(id!=='flowers'){
  let prop=b.gifts.cache.get(id);if(!prop){prop=makeGift(id);b.model.getObjectByName('CTRL_Bouquet').add(prop);b.gifts.cache.set(id,prop);}prop.visible=true;
 }
 b.gift=id;
}

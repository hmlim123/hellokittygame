import * as THREE from 'three';
import {setHeldGift} from './gifts.js';
import {OUTFITS,HELD_ITEMS} from './equipment-state.js?v=adventure-7';
const cloth=color=>new THREE.MeshStandardMaterial({color,roughness:.9,side:THREE.DoubleSide});
function ellipsoid(parent,name,material,x,y,z,sx,sy,sz){const o=new THREE.Mesh(new THREE.SphereGeometry(1,20,14),material);o.name=name;o.position.set(x,y,z);o.scale.set(sx,sy,sz);parent.add(o);return o;}
function patch(parent,name,mat,points){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));geometry.computeVertexNormals();const o=new THREE.Mesh(geometry,mat);o.name=name;parent.add(o);return o;}
function star(parent,x,y,z){
 const shape=new THREE.Shape();for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2?.044:.095;const px=Math.cos(a)*r,py=Math.sin(a)*r;i?shape.lineTo(px,py):shape.moveTo(px,py);}shape.closePath();
 const o=new THREE.Mesh(new THREE.ShapeGeometry(shape),cloth('#f3dfa2'));o.position.set(x,y,z);o.name='Moonlight_star';parent.add(o);
}
function outfitDetails(id){
 const g=new THREE.Group();g.name='Outfit_'+id;
 const cream=cloth('#fff3dd');
 if(id==='berry'){
  for(const side of [-1,1])ellipsoid(g,'Berry_collar',cream,side*.18,.60,.60,.22,.14,.04);
  const shape=new THREE.Shape();shape.moveTo(0,-.11);shape.bezierCurveTo(-.28,.08,-.12,.28,0,.13);shape.bezierCurveTo(.12,.28,.28,.08,0,-.11);const heart=new THREE.Mesh(new THREE.ShapeGeometry(shape),cream);heart.position.set(0,-.08,.80);g.add(heart);
 }
 if(id==='sailor'){
  for(const side of [-1,1])patch(g,'Sailor_collar',cream,[[side*.56,.75,.43],[side*.31,.25,.68],[0,.59,.66]]);
  const blue=cloth('#628fae');ellipsoid(g,'Sailor_knot',blue,0,.48,.70,.08,.08,.035);
  for(const side of [-1,1])patch(g,'Sailor_ribbon',blue,[[0,.48,.72],[side*.19,.20,.75],[side*.025,.20,.76]]);
 }
 if(id==='picnic'){
  ellipsoid(g,'Cream_picnic_apron',cream,0,.10,.70,.65,.46,.12);
  ellipsoid(g,'Apron_pocket',cloth('#efd4b0'),0,-.04,.817,.22,.17,.015);
  const rose=cloth('#dd91ac');ellipsoid(g,'Apron_bow',rose,-.09,.43,.71,.12,.075,.04);ellipsoid(g,'Apron_bow',rose,.09,.43,.71,.12,.075,.04);
 }
 if(id==='moonlight')for(const [x,y,z] of [[-.52,-.08,.70],[.48,.05,.70],[0,-.27,.75]])star(g,x,y,z);
 if(id==='blossom'){
  for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ellipsoid(g,'Blossom_petal',cream,Math.cos(a)*.13,.23+Math.sin(a)*.13,.78,.105,.10,.035);}
  ellipsoid(g,'Blossom_center',cloth('#e8c36b'),0,.23,.82,.075,.075,.025);
 }
 return g;
}
export function applyEquipment(hero,equipment){
 const b=hero.userData.blender;if(!b)return;
 const outfit=OUTFITS.find(o=>o.id===equipment.outfit)||OUTFITS[0];
 b.wardrobe??={materials:[],cache:new Map()};
 if(!b.wardrobe.materials.length)b.model.traverse(o=>{if(!o.isMesh)return;for(const m of Array.isArray(o.material)?o.material:[o.material])if(['Strawberry pink satin','Ribbon fold rose'].includes(m.name))b.wardrobe.materials.push(m);});
 for(const m of b.wardrobe.materials)m.color.set(m.name==='Ribbon fold rose'?outfit.accent:outfit.color);
 for(const g of b.wardrobe.cache.values())g.visible=false;
 if(outfit.id!=='classic'){
  let detail=b.wardrobe.cache.get(outfit.id);if(!detail){detail=outfitDetails(outfit.id);b.model.getObjectByName('CTRL_Body').add(detail);b.wardrobe.cache.set(outfit.id,detail);}detail.visible=true;
 }
 const item=HELD_ITEMS.some(i=>i.id===equipment.item)?equipment.item:'flowers';
 setHeldGift(hero,item==='none'?'flowers':item);
 if(item==='none'){for(const o of b.gifts.original)o.visible=false;b.gift='none';}
 hero.userData.equipment={outfit:outfit.id,item};
}

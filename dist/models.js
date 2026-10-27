import * as THREE from 'three';
import { DOLLS } from './state.js';
let sphereGeo=new THREE.SphereGeometry(1,28,20),boxGeo=new THREE.BoxGeometry(1,1,1);
export function useSoftwareDetail(){sphereGeo=new THREE.SphereGeometry(1,16,12);boxGeo=new THREE.BoxGeometry(1,1,1);}
// Smooth pastel room surfaces, without random fabric bump noise.
export function material(color,plush=false){return new THREE.MeshStandardMaterial({color,roughness:plush?.82:.65,metalness:0});}
export function mesh(geo,mat,parent,x=0,y=0,z=0){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
export function ball(parent,mat,x,y,z,sx,sy=sx,sz=sx){const m=mesh(sphereGeo,mat,parent,x,y,z);m.scale.set(sx,sy,sz);return m;}
export function box(parent,mat,x,y,z,sx,sy,sz){const m=mesh(boxGeo,mat,parent,x,y,z);m.scale.set(sx,sy,sz);return m;}
export function cylinder(parent,mat,x,y,z,r,h,r2=r){return mesh(new THREE.CylinderGeometry(r,r2,h,40),mat,parent,x,y,z);}
export function tube(parent,points,r,mat){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),12,r,6,false),mat,parent);}
export function makeBow(color='#dc5678',scale=1){const g=new THREE.Group(),mat=material(color,true);const a=ball(g,mat,-.22,0,0,.26,.21,.13);a.rotation.z=-.25;const b=ball(g,mat,.22,0,0,.26,.21,.13);b.rotation.z=.25;ball(g,mat,0,0,.045,.135,.15,.15);g.scale.setScalar(scale);return g;}
const earShape=new THREE.Shape();earShape.moveTo(-.2,0);earShape.quadraticCurveTo(-.22,.18,-.16,.43);earShape.quadraticCurveTo(-.13,.51,-.04,.44);earShape.lineTo(.26,.08);earShape.quadraticCurveTo(.1,-.06,-.2,0);
const earGeo=new THREE.ExtrudeGeometry(earShape,{depth:.19,bevelEnabled:true,bevelSegments:4,steps:1,bevelSize:.07,bevelThickness:.08,curveSegments:14});
export function makeKitty(id=0){const g=new THREE.Group(),d=DOLLS[id],white=material('#fffaf1',true),outfit=material(d.color,true),black=material('#342d2c'),yellow=material('#eac567'),pink=material('#f2c6c6');
  ball(g,white,-.27,.16,.14,.27,.17,.34);ball(g,white,.27,.16,.14,.27,.17,.34);
  ball(g,outfit,0,.66,0,.48,.6,.34);
  const armL=new THREE.Group();armL.position.set(-.43,.88,.03);g.add(armL);ball(armL,white,-.04,-.18,0,.18,.29,.19);armL.rotation.z=-.35;
  const armR=new THREE.Group();armR.position.set(.43,.88,.03);g.add(armR);ball(armR,white,.04,-.18,0,.18,.29,.19);armR.rotation.z=.35;
  const head=new THREE.Group();head.position.y=1.47;g.add(head);
  ball(head,white,0,0,0,.78,.58,.43);
  const earL=mesh(earGeo,white,head,-.48,.32,-.1);earL.rotation.z=.06;earL.scale.y=.72;
  const earR=mesh(earGeo,white,head,.48,.32,-.1);earR.scale.set(-1,.72,1);earR.rotation.z=-.06;
  const face=makeFace(head);
  ball(head,yellow,0,-.19,.435,.073,.045,.034);
  const blush=material('#efd1cd');const cheeks=[ball(head,blush,-.46,-.21,.347,.083,.03,.011),ball(head,blush,.46,-.21,.347,.083,.03,.011)];
  for(const side of [-1,1])for(let j=0;j<3;j++){const y=.02-j*.14;tube(head,[[side*.58,y,.28],[side*.76,y+(1-j)*.025,.32],[side*.91,y+(1-j)*.065,.25]],.011,black);}
  const bow=makeBow(d.accent,.91);bow.position.set(.49,.39,.36);bow.rotation.z=-.18;head.add(bow);
  const collar=new THREE.Mesh(new THREE.TorusGeometry(.22,.035,8,32,Math.PI),white);collar.position.set(0,.99,.28);collar.rotation.z=Math.PI;g.add(collar);
  ball(g,white,-.12,.72,.335,.035,.035,.025);ball(g,white,.12,.72,.335,.035,.035,.025);
  const heart=heartMesh('#fff3e5',.09);heart.position.set(0,.48,.34);g.add(heart);
  if(id===5){const wingmat=material('#fff9e8',true);for(const sign of [-1,1])for(let k=0;k<3;k++){const w=ball(g,wingmat,sign*(.43+k*.075),.78+k*.1,-.2,.15,.26,.09);w.rotation.z=sign*-.6;}const halo=mesh(new THREE.TorusGeometry(.34,.025,8,40),material('#d4b56e'),g,0,2.18,0);halo.rotation.x=Math.PI/2;}
  if(id===1){const seedmat=material('#fff8e1');for(let i=0;i<7;i++)ball(g,seedmat,Math.sin(i*2.4)*.28,.45+i*.06,.31,.015,.026,.012);}
  if(id===4){const sailor=material('#fff7e9');box(g,sailor,0,.84,.32,.36,.07,.04);}
  g.userData={kind:'kitty',id,head,armL,armR,bow,face,cheeks,blush};return g;
}
const heartShape=new THREE.Shape();heartShape.moveTo(0,-.6);heartShape.bezierCurveTo(-1.5,.25,-.65,1.3,0,.5);heartShape.bezierCurveTo(.65,1.3,1.5,.25,0,-.6);
export function heartMesh(color,scale=1){const m=new THREE.Mesh(new THREE.ExtrudeGeometry(heartShape,{depth:.12,bevelEnabled:true,bevelSegments:3,bevelSize:.05,bevelThickness:.05,steps:1,curveSegments:10}),material(color));m.scale.setScalar(scale);return m;}
export function rounded(parent,mat,x,y,z,sx,sy,sz,r=.12){const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);box(g,mat,0,0,0,sx-r*2,sy,sz-r*2);box(g,mat,0,0,0,sx,sy-r*2,sz-r*2);box(g,mat,0,0,0,sx-r*2,sy-r*2,sz);for(const a of[-1,1])for(const b of[-1,1])for(const c of[-1,1])ball(g,mat,a*(sx/2-r),b*(sy/2-r),c*(sz/2-r),r);return g;}
export function textTexture(text,{color='#896c60',background=null,size=64,width=512,height=128,font='Georgia',weight='normal'}={}){const c=document.createElement('canvas');c.width=width;c.height=height;const x=c.getContext('2d');if(background){x.fillStyle=background;x.fillRect(0,0,width,height);}x.fillStyle=color;x.font=`${weight} ${size}px ${font}`;x.textAlign='center';x.textBaseline='middle';x.fillText(text,width/2,height/2,width-20);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex;}
export function label(parent,text,x,y,z,w,h,opts={}){const mat=new THREE.MeshBasicMaterial({map:textTexture(text,opts),transparent:true,depthWrite:false});const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);m.position.set(x,y,z);parent.add(m);return m;}

// Curved markings hug the head surface. Dense, rounded ribbons avoid sharp
// corners and keep the smile readable from any of the room camera angles.
function faceRibbon(parent,color){
  const segments=32,positions=new Float32Array((segments+1)*6),indices=[];
  for(let i=0;i<segments;i++){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));geometry.setIndex(indices);
  const m=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));m.frustumCulled=false;parent.add(m);return m;
}
function drawRibbon(m,cx,cy,width,height,arch){
  const p=m.geometry.attributes.position,steps=p.count/2-1;
  for(let i=0;i<=steps;i++){const angle=i/steps*Math.PI,u=-Math.cos(angle),round=Math.sin(angle),x=cx+u*width;
    for(let side=0;side<2;side++){const y=cy+arch*(1-u*u)+(side?1:-1)*height*round;
      const z=.43*Math.sqrt(Math.max(.01,1-(x/.78)**2-(y/.58)**2))+.012;
      p.setXYZ(i*2+side,x,y,z);
    }
  }
  p.needsUpdate=true;m.geometry.computeVertexNormals();
}
function makeFace(parent){const f={left:faceRibbon(parent,'#3c3030'),right:faceRibbon(parent,'#3c3030'),mouth:faceRibbon(parent,'#775650')};updateFace(f,{joy:0,smile:0,sleepy:0,yawn:0},0);return f;}
export function updateFace(face,state,blink){
  const close=Math.min(1,Math.max(state.joy,state.sleepy,blink));
  const arch=.029*state.joy-.012*state.sleepy;
  const width=.047+.014*state.joy,height=.068*(1-close)+.0065*close;
  for(const [eye,x] of [[face.left,-.28],[face.right,.28]])drawRibbon(eye,x,-.035,width,height,arch);
  face.mouth.visible=state.smile+state.yawn>.015;
  if(face.mouth.visible)drawRibbon(face.mouth,0,-.292,.073*state.smile+.025*state.yawn,.006*state.smile+.032*state.yawn,-.019*state.smile);
}

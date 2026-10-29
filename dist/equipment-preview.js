import {OrbitControls} from './vendor/OrbitControls.js';
import * as THREE from 'three';
import {CanvasFallback} from './CanvasFallback.js';
import {makeBlenderKitty,updateBlender} from './blender-kitty.js?v=adventure-7';
import {applyEquipment} from './equipment-model.js?v=adventure-7';
export class EquipmentPreview{
 constructor(asset,container,{software=false,reduced=false}={}){
  this.container=container;this.reduced=reduced;
  const canvas=document.createElement('canvas'),gl=software?null:canvas.getContext('webgl2',{antialias:true});
  this.renderer=gl?new THREE.WebGLRenderer({canvas,context:gl,antialias:true}):new CanvasFallback();
  this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.1;this.renderer.shadowMap.enabled=false;
  this.renderer.domElement.setAttribute('role','img');container.append(this.renderer.domElement);
  this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#f8e9ef');this.scene.add(new THREE.HemisphereLight('#fff4ef','#baa6cf',2.8));const light=new THREE.DirectionalLight('#fff1d2',2);light.position.set(-3,9,6);this.scene.add(light);
  this.hero=makeBlenderKitty(asset);this.scene.add(this.hero);this.camera=new THREE.OrthographicCamera(-1.4,1.4,1.5,-1.5,.1,30);this.camera.position.set(0,1.35,5);this.camera.lookAt(0,1.13,0);this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.target.set(0,1.13,0);this.controls.enableZoom=false;this.controls.enablePan=false;this.controls.minPolarAngle=.6;this.controls.maxPolarAngle=2.2;this.controls.saveState();this.renderer.domElement.addEventListener('dblclick',()=>this.controls.reset());container.title='Drag to rotate Kitty 360°. Double-click to face forward.';this.resize();new ResizeObserver(()=>this.resize()).observe(container);
 }
 resize(){const w=this.container.clientWidth,h=this.container.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h,false);this.camera.left=-1.45*w/h;this.camera.right=1.45*w/h;this.camera.top=1.45;this.camera.bottom=-1.45;this.camera.updateProjectionMatrix();}
 equip(equipment,label){applyEquipment(this.hero,equipment);this.container.dataset.outfit=equipment.outfit;this.container.dataset.item=equipment.item;this.renderer.domElement.setAttribute('aria-label',label);this.render(0);}
 render(dt){this.controls.update();updateBlender(this.hero,dt,{reduced:this.reduced,idle:true});this.renderer.render(this.scene,this.camera);}
}

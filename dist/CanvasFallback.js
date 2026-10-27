import {Projector,RenderableFace} from './vendor/Projector.js';
import {Color,Vector3} from 'three';
// Perspective projection, interpolated lighting and a per-pixel depth buffer.
// This uses the exact same 3D scene and camera as the WebGL renderer.
const srgb=v=>Math.round(255*(v<=.0031308?v*12.92:1.055*Math.pow(Math.min(1,Math.max(0,v)),1/2.4)-.055));
export class CanvasFallback{
  constructor(){this.domElement=document.createElement('canvas');this.context=this.domElement.getContext('2d',{alpha:false});this.projector=new Projector();this.shadowMap={};this.ratio=1;this.software=true;this.width=1;this.height=1;this.light=new Vector3(-.3,.8,.6).normalize();this.last=0;}
  setPixelRatio(){}
  setSize(w,h){this.width=w;this.height=h;const scale=Math.min(1,850/w);this.w=Math.round(w*scale);this.h=Math.round(h*scale);this.domElement.width=this.w;this.domElement.height=this.h;this.domElement.style.width=w+'px';this.domElement.style.height=h+'px';this.image=this.context.createImageData(this.w,this.h);this.depth=new Float32Array(this.w*this.h);}
  setAnimationLoop(fn){this.callback=fn;const loop=t=>{if(t-this.last>=65){this.last=t;this.callback?.();}requestAnimationFrame(loop)};requestAnimationFrame(loop);}
  render(scene,camera){const w=this.w,h=this.h,pixels=this.image.data,depth=this.depth,bg=scene.background||new Color('#f5ece5'),br=srgb(bg.r),bgc=srgb(bg.g),bb=srgb(bg.b);for(let i=0;i<pixels.length;i+=4){pixels[i]=br;pixels[i+1]=bgc;pixels[i+2]=bb;pixels[i+3]=255;}depth.fill(Infinity);
    const data=this.projector.projectScene(scene,camera,true,true),ambient=this.night?.32:.58,power=this.night?.42:.55;
    for(const e of data.elements){if(!(e instanceof RenderableFace))continue;const m=e.material;if(!m||m.visible===false||m.opacity===0||m.map)continue;const a=e.v1.positionScreen,b=e.v2.positionScreen,c=e.v3.positionScreen;if(a.z<-1||b.z<-1||c.z<-1)continue;
      const ax=(a.x*.5+.5)*w,ay=(-a.y*.5+.5)*h,bx=(b.x*.5+.5)*w,by=(-b.y*.5+.5)*h,cx=(c.x*.5+.5)*w,cy=(-c.y*.5+.5)*h;
      const det=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy);if(Math.abs(det)<.001)continue;
      const minX=Math.max(0,Math.floor(Math.min(ax,bx,cx))),maxX=Math.min(w-1,Math.ceil(Math.max(ax,bx,cx))),minY=Math.max(0,Math.floor(Math.min(ay,by,cy))),maxY=Math.min(h-1,Math.ceil(Math.max(ay,by,cy)));if(minX>maxX||minY>maxY)continue;
      const normals=e.vertexNormalsModel,base=m.color;let colors=[];for(let i=0;i<3;i++){const n=e.vertexNormalsLength===3?normals[i]:e.normalModel;const light=m.isMeshBasicMaterial?1:ambient+Math.max(0,n.dot(this.light))*power;colors.push([srgb(base.r*light),srgb(base.g*light),srgb(base.b*light)]);}
      const d0x=(by-cy)/det,d0y=(cx-bx)/det,d1x=(cy-ay)/det,d1y=(ax-cx)/det;const originX=minX+.5-cx,originY=minY+.5-cy;let row0=(by-cy)*originX/det+(cx-bx)*originY/det,row1=(cy-ay)*originX/det+(ax-cx)*originY/det;
      const alpha=m.opacity??1;for(let y=minY;y<=maxY;y++){let u=row0,v=row1;for(let x=minX;x<=maxX;x++){const q=1-u-v;if(u>=-.00001&&v>=-.00001&&q>=-.00001){const z=u*a.z+v*b.z+q*c.z,index=y*w+x;if(z<depth[index]){const pi=index*4;const red=u*colors[0][0]+v*colors[1][0]+q*colors[2][0],green=u*colors[0][1]+v*colors[1][1]+q*colors[2][1],blue=u*colors[0][2]+v*colors[1][2]+q*colors[2][2];pixels[pi]=pixels[pi]*(1-alpha)+red*alpha;pixels[pi+1]=pixels[pi+1]*(1-alpha)+green*alpha;pixels[pi+2]=pixels[pi+2]*(1-alpha)+blue*alpha;if(alpha>.95)depth[index]=z;}}u+=d0x;v+=d1x;}row0+=d0y;row1+=d1y;}
    }this.context.putImageData(this.image,0,0);
  }
}

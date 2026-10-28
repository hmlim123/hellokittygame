// Transient DOM effects work with both the WebGL and software renderers.
export class DiscoveryEffects{
 constructor(root,{reduced=false}={}){this.root=root;this.reduced=reduced;this.groups=[];}
 burst(x,y,kind='charm'){
  if(this.reduced)return;
  const group=document.createElement('div');group.className='discovery-burst';group.style.left=x+'px';group.style.top=y+'px';
  const art=questArt(kind);if(art){const img=document.createElement('img');img.src=art;img.alt='';img.className='floating-charm';group.append(img);}
  const count=kind==='moonflower'?20:12;
  for(let i=0;i<count;i++){
   const spark=document.createElement('i'),a=i*Math.PI*2/count,r=40+(i%3)*20;
   spark.className=i%3===0?'heart-spark':'star-spark';spark.style.setProperty('--dx',Math.cos(a)*r+'px');spark.style.setProperty('--dy',Math.sin(a)*r-35+'px');spark.style.setProperty('--turn',(i%2?45:-45)+'deg');spark.style.animationDelay=(i%3)*.04+'s';group.append(spark);
  }
  this.root.append(group);this.groups.push({el:group,time:1.6});
  while(this.groups.length>3)this.groups.shift().el.remove();
 }
 update(dt){for(const g of this.groups)g.time-=dt;this.groups=this.groups.filter(g=>{if(g.time>0)return true;g.el.remove();return false;});}
 clear(){for(const g of this.groups)g.el.remove();this.groups=[];}
}
export function questArt(id){return ['rose','honey','sky','momo','cloud','gate','moonflower'].includes(id)?`./assets/quest/${id}.svg?v=encounters-4`:null;}

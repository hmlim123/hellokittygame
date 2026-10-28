export const PICNIC_SPOTS=[
 {id:'blanket',item:'teddy',name:'Cozy blanket',icon:'🧺'},
 {id:'plate',item:'strawberry',name:'Little plate',icon:'🍽'},
 {id:'vase',item:'flowers',name:'Flower vase',icon:'🏺'},
 {id:'heart',item:'letter',name:'Heart mat',icon:'♡'}
];
export function createPicnic(){return {placed:{},complete:false};}
export function placePicnic(state,item,spot){
 if(state.complete||!PICNIC_SPOTS.some(s=>s.item===item)||Object.values(state.placed).includes(item))return {accepted:false};
 const target=PICNIC_SPOTS.find(s=>s.id===spot);
 if(!target||target.item!==item)return {accepted:false,hint: PICNIC_SPOTS.find(s=>s.item===item).name};
 state.placed[spot]=item;state.complete=Object.keys(state.placed).length===PICNIC_SPOTS.length;
 return {accepted:true,complete:state.complete};
}
// Tap-to-place is also the keyboard path; dragging uses this same state transition.
export function bindPicnicBoard(root,{onPlace,onComplete}){
 let state=createPicnic(),selected=null,drag=null,suppressClick=false;
 const items=[...root.querySelectorAll('[data-picnic-item]')],slots=[...root.querySelectorAll('[data-picnic-slot]')];
 const status=root.querySelector('[data-picnic-status]');
 function select(id){selected=id;items.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.picnicItem===id)));status.textContent='Now choose its cozy spot on the blanket.';}
 function place(spot){
  if(!selected){status.textContent='Choose a gift first, then choose its spot.';return;}
  const result=placePicnic(state,selected,spot);
  if(!result.accepted){status.textContent=result.hint?`Try the ${result.hint.toLowerCase()} for this gift. There’s no rush.`:'Choose another gift.';return;}
  items.forEach(b=>{b.disabled=Object.values(state.placed).includes(b.dataset.picnicItem);b.setAttribute('aria-pressed','false');});
  const dest=slots.find(b=>b.dataset.picnicSlot===spot),source=items.find(b=>b.dataset.picnicItem===selected);
  dest.querySelector('.placed-item').textContent=source.querySelector('[aria-hidden]').textContent;dest.classList.add('placed');dest.setAttribute('aria-label',dest.dataset.label+', gift placed');
  selected=null;status.textContent=`${Object.keys(state.placed).length} of 4 gifts in their cozy places.`;onPlace(Object.keys(state.placed).length);
  if(result.complete)onComplete();
 }
 for(const b of items){
  b.onclick=()=>{if(suppressClick){suppressClick=false;return;}select(b.dataset.picnicItem);};
  b.onpointerdown=e=>{if(e.button!==0||b.disabled)return;drag={id:b.dataset.picnicItem,x:e.clientX,y:e.clientY,moved:false,ghost:null};b.setPointerCapture(e.pointerId);};
  b.onpointermove=e=>{
   if(!drag)return;
   if(Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>8){drag.moved=true;if(!drag.ghost){drag.ghost=document.createElement('span');drag.ghost.className='picnic-drag-ghost';drag.ghost.textContent=b.querySelector('[aria-hidden]').textContent;document.body.append(drag.ghost);}drag.ghost.style.left=e.clientX+'px';drag.ghost.style.top=e.clientY+'px';}
  };
  b.onpointerup=e=>{if(!drag)return;const d=drag;drag=null;d.ghost?.remove();if(d.moved){suppressClick=true;setTimeout(()=>suppressClick=false,0);select(d.id);const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-picnic-slot]');if(target&&root.contains(target))place(target.dataset.picnicSlot);}};
  b.onpointercancel=()=>{drag?.ghost?.remove();drag=null;};
 }
 slots.forEach(b=>b.onclick=()=>place(b.dataset.picnicSlot));
 return {reset(){drag?.ghost?.remove();drag=null;selected=null;suppressClick=false;state=createPicnic();for(const b of items){b.disabled=false;b.setAttribute('aria-pressed','false');}for(const b of slots){b.classList.remove('placed');b.querySelector('.placed-item').textContent='';b.setAttribute('aria-label',b.dataset.label);}status.textContent='Drag a gift to its spot, or tap a gift and then a spot.';},get state(){return state;}};
}

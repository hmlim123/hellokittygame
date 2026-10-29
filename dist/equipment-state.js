export const EQUIPMENT_KEY='kitty-nancy-equipment-v1';
export const OUTFITS=[
 {id:'classic',name:'Rose dress',color:'#e896b0',accent:'#d9789d',detail:'Your classic pink dress.',unlock:()=>true},
 {id:'sailor',name:'Sky sailor',color:'#91bbd3',accent:'#628fae',detail:'A blue dress with a sailor collar.',unlock:()=>true},
 {id:'picnic',name:'Honey picnic',color:'#e8ca7b',accent:'#c99d54',detail:'A sunny dress and a little cream apron.',unlock:s=>s.charms?.includes('honey')||false,hint:'Find the honey charm in the garden.'},
 {id:'moonlight',name:'Moonlight dress',color:'#bba7dd',accent:'#987abf',detail:'A lavender dress with little gold stars.',unlock:s=>s.complete===true,hint:'Restore the moonflower to unlock.'},
 {id:'berry',name:'Berry sweetheart',color:'#df82a5',accent:'#bf6086',detail:'A berry pink dress with a cream collar and heart.',unlock:s=>s.ribbonReturned===true,hint:'Return Momo’s three lost ribbons.'},
 {id:'blossom',name:'Blossom keepsake',color:'#a7cdb8',accent:'#e99fba',detail:'A soft mint dress with a little cream flower.',unlock:s=>s.chapter?.flowersRevived===true,hint:'Help the thirsty flowers in Butterfly Glade.'},
];
export const HELD_ITEMS=[
 {id:'none',name:'Empty paws',detail:'Travel with nothing in your paws.'},
 {id:'flowers',name:'Little flowers',detail:'Carry your pink and yellow bouquet.'},
 {id:'teddy',name:'Cuddle teddy',detail:'Bring a little friend along.'},
 {id:'strawberry',name:'Sweet strawberry',detail:'A sweet little picnic treat.'},
 {id:'letter',name:'Love letter',detail:'Keep Nancy’s sealed envelope close.'}
];
export function normalizeEquipment(raw={},quest={},legacy={}){
 raw=raw&&typeof raw==='object'?raw:{};quest=quest&&typeof quest==='object'?quest:{};legacy=legacy&&typeof legacy==='object'?legacy:{};
 const outfit=OUTFITS.find(o=>o.id===raw.outfit&&o.unlock(quest))?.id||'classic';
 const item=HELD_ITEMS.some(i=>i.id===raw.item)?raw.item:HELD_ITEMS.some(i=>i.id===legacy.heldGift)?legacy.heldGift:'flowers';
 return {version:1,outfit,item};
}
export function equip(equipment,kind,id,quest={}){
 if(kind==='outfit'){
  if(!OUTFITS.some(o=>o.id===id&&o.unlock(quest)))return false;
 }else if(kind==='item'){
  if(!HELD_ITEMS.some(i=>i.id===id))return false;
 }else return false;
 equipment[kind]=id;return true;
}

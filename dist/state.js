// Stable IDs preserve every existing invitation and shelf position.
export const DOLLS = [
  {id:0,name:'Original Kitty',short:'Original Kitty',color:'#e896b0',accent:'#dc789d',tag:'Your familiar little friend',plush:undefined},
  {id:1,name:'Strawberry Cloud',short:'Strawberry Cloud',color:'#e790ac',accent:'#dc789d',tag:'A ribbon after the rain',plush:'cloud'},
  {id:2,name:'Moonlight Witch',short:'Moonlight Witch',color:'#b6a2da',accent:'#997bc5',tag:'A pocketful of starlight',plush:'witch'},
  {id:3,name:'Baby Blossom',short:'Baby Blossom',color:'#efb0c7',accent:'#d893b1',tag:'The sleepiest little cloud',plush:'baby'},
  {id:4,name:'Rose Kitten',short:'Rose Kitten',color:'#f3d9df',accent:'#d99eb3',tag:'A garden full of small surprises',plush:'kitten'},
  {id:5,name:'Silver Bunny',short:'Silver Bunny',color:'#dddfe5',accent:'#aeb5c5',tag:'An invitation from the moon',plush:'bunny'}
];
export function inviteDoll(state,id){
  if(!DOLLS.some(d=>d.id===id)||state.owned.includes(id))return null;
  state.owned.push(id);state.owned.sort((a,b)=>a-b);
  const slot=state.slots.indexOf(null);if(slot!==-1)state.slots[slot]=id;
  return DOLLS[id];
}
export const THEMES={rose:{name:'Rose milk',wall:'#f0d5d8',rug:'#d49aab',accent:'#df9cae'},lavender:{name:'Lavender',wall:'#ddd4ec',rug:'#b2a1ca',accent:'#b8a5d3'},peach:{name:'Peach cream',wall:'#f0ddc7',rug:'#d8b39a',accent:'#dfb69b'},mint:{name:'Mint tea',wall:'#d8e4d6',rug:'#a7b9a0',accent:'#adc2ab'}};
export function normalizeState(raw={},legacy={}){
  raw=raw||{};legacy=legacy||{};
  const ids=[...(Array.isArray(raw.owned)?raw.owned:[]),...(Array.isArray(legacy.owned)?legacy.owned:[])];
  const owned=[...new Set([0,...ids.filter(n=>Number.isInteger(n)&&n>=0&&n<6)])].sort();
  const slots=Array(6).fill(null),seen=new Set();
  if(Array.isArray(raw.slots))raw.slots.slice(0,6).forEach((id,i)=>{if(owned.includes(id)&&!seen.has(id)){slots[i]=id;seen.add(id)}});
  for(const id of owned)if(!seen.has(id)){slots[slots.indexOf(null)]=id;seen.add(id)}
  return {owned,slots,selected:owned.includes(raw.selected)?raw.selected:0,theme:Object.hasOwn(THEMES,raw.theme)?raw.theme:'rose',night:raw.night===true,adventureRewarded:raw.adventureRewarded===true,best:Number.isFinite(raw.best)?Math.max(0,raw.best):0,rounds:Number.isInteger(raw.rounds)?Math.max(0,raw.rounds):0};
}
export function placeDoll(state,id,index){
  if(!state.owned.includes(id)||!Number.isInteger(index)||index<0||index>5)return false;
  const old=state.slots.indexOf(id),other=state.slots[index];
  state.slots[index]=id;if(old!==-1&&old!==index)state.slots[old]=other;
  return true;
}
export function nextDoll(state){return DOLLS.find(d=>!state.owned.includes(d.id))||null;}
export function rewardDoll(state){const doll=nextDoll(state);if(doll){state.owned.push(doll.id);const slot=state.slots.indexOf(null);if(slot!==-1)state.slots[slot]=doll.id;}state.rounds++;return doll;}
export function createHunt({relaxed=false}={}){return {active:true,paused:false,hits:0,time:45,complete:false,relaxed:relaxed===true};}
export function catchBow(hunt){if(!hunt?.active||hunt.paused)return false;hunt.hits++;if(hunt.hits>=8){hunt.active=false;hunt.complete=true;}return true;}
export function tickHunt(hunt,dt){if(!hunt?.active||hunt.paused||hunt.relaxed)return;hunt.time=Math.max(0,hunt.time-Math.max(0,Number.isFinite(dt)?dt:0));if(hunt.time===0)hunt.active=false;}

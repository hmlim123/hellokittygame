export const DOLLS = [
  {id:0,name:'Classic sweetheart',short:'Classic',color:'#e896b0',accent:'#dc789d',tag:'The original little love'},
  {id:1,name:'Strawberry milk',short:'Strawberry',color:'#eda5b8',accent:'#df7799',tag:'Sweet as a pink daydream'},
  {id:2,name:'Lavender cloud',short:'Lavender',color:'#b6a2da',accent:'#997bc5',tag:'For the softest kind of days'},
  {id:3,name:'Honey sunshine',short:'Honey',color:'#eaca77',accent:'#d9a84c',tag:'A pocketful of golden happy'},
  {id:4,name:'Blue daydream',short:'Daydream',color:'#94bdc9',accent:'#639eaf',tag:'A little sky to keep close'},
  {id:5,name:'Little angel',short:'Angel',color:'#ddcdb6',accent:'#bca78c',tag:'A whole lot of love, with a bow'}
];
export const THEMES={rose:{name:'Rose milk',wall:'#f0d5d8',rug:'#d49aab',accent:'#df9cae'},lavender:{name:'Lavender',wall:'#ddd4ec',rug:'#b2a1ca',accent:'#b8a5d3'},peach:{name:'Peach cream',wall:'#f0ddc7',rug:'#d8b39a',accent:'#dfb69b'},mint:{name:'Mint tea',wall:'#d8e4d6',rug:'#a7b9a0',accent:'#adc2ab'}};
export function normalizeState(raw={},legacy={}){
  raw=raw||{};legacy=legacy||{};
  const ids=[...(Array.isArray(raw.owned)?raw.owned:[]),...(Array.isArray(legacy.owned)?legacy.owned:[])];
  const owned=[...new Set([0,...ids.filter(n=>Number.isInteger(n)&&n>=0&&n<6)])].sort();
  const slots=Array(6).fill(null),seen=new Set();
  if(Array.isArray(raw.slots))raw.slots.slice(0,6).forEach((id,i)=>{if(owned.includes(id)&&!seen.has(id)){slots[i]=id;seen.add(id)}});
  for(const id of owned)if(!seen.has(id)){slots[slots.indexOf(null)]=id;seen.add(id)}
  return {owned,slots,selected:owned.includes(raw.selected)?raw.selected:0,theme:Object.hasOwn(THEMES,raw.theme)?raw.theme:'rose',night:raw.night===true,best:Number.isFinite(raw.best)?Math.max(0,raw.best):0,rounds:Number.isInteger(raw.rounds)?Math.max(0,raw.rounds):0};
}
export function placeDoll(state,id,index){
  if(!state.owned.includes(id)||!Number.isInteger(index)||index<0||index>5)return false;
  const old=state.slots.indexOf(id),other=state.slots[index];
  state.slots[index]=id;if(old!==-1&&old!==index)state.slots[old]=other;
  return true;
}
export function nextDoll(state){return DOLLS.find(d=>!state.owned.includes(d.id))||null;}
export function rewardDoll(state){const doll=nextDoll(state);if(doll){state.owned.push(doll.id);const slot=state.slots.indexOf(null);if(slot!==-1)state.slots[slot]=doll.id;}state.rounds++;return doll;}
export function createHunt(){return {active:true,paused:false,hits:0,time:45,complete:false};}
export function catchBow(hunt){if(!hunt?.active||hunt.paused)return false;hunt.hits++;if(hunt.hits>=8){hunt.active=false;hunt.complete=true;}return true;}
export function tickHunt(hunt,dt){if(!hunt?.active||hunt.paused)return;hunt.time=Math.max(0,hunt.time-Math.max(0,Number.isFinite(dt)?dt:0));if(hunt.time===0)hunt.active=false;}

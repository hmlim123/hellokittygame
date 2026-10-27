export const SURPRISES = [
  {icon:'🎀',name:'Little bow',note:'You make ordinary days feel special.'},
  {icon:'🍓',name:'Berry sweet',note:'A little sweetness, just because you are you.'},
  {icon:'🌷',name:'Tiny tulip',note:'You deserve a day full of lovely little things.'},
  {icon:'🌙',name:'Moon cuddle',note:'A soft place to land after a long day.'},
  {icon:'⭐',name:'Pocket star',note:'A tiny reminder of how much you shine.'},
  {icon:'🧸',name:'Forever friend',note:'There is always room for one more cuddle.'},
  {icon:'💌',name:'Love letter',note:'This whole little world was made with love for you.'}
];
export function localDay(date=new Date()) {return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function normalizeCare(raw={}) {
  if(!raw||typeof raw!=='object')raw={};
  return {hearts:Number.isInteger(raw.hearts)?Math.min(999999,Math.max(0,raw.hearts)):0,lastDay:typeof raw.lastDay==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(raw.lastDay)?raw.lastDay:'',gifts:Array.isArray(raw.gifts)?[...new Set(raw.gifts.filter(id=>Number.isInteger(id)&&id>=0&&id<SURPRISES.length))]:[],visits:Number.isInteger(raw.visits)?Math.min(999999,Math.max(0,raw.visits)):0};
}
export function addCare(state,kind) {if(!['pet','treat'].includes(kind))return false;state.hearts=Math.min(999999,state.hearts+(kind==='pet'?1:2));return true;}
export function claimSurprise(state,day=localDay()) {
  if(day<=state.lastDay)return null;
  const id=state.gifts.length<SURPRISES.length?SURPRISES.findIndex((_,i)=>!state.gifts.includes(i)):state.visits%SURPRISES.length;
  if(!state.gifts.includes(id))state.gifts.push(id);
  state.lastDay=day;state.visits++;state.hearts=Math.min(999999,state.hearts+3);
  return {...SURPRISES[id],id};
}

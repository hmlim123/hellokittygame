export const MISSIONS=[
  {id:'bows',title:'Bow Hunt',icon:'🎀',description:'Find eight little bows around the room.',goal:8,seconds:45},
  {id:'strawberries',title:'Strawberry Picnic',icon:'🍓',description:'Gather six strawberries for a sweet little picnic.',goal:6,seconds:40},
  {id:'hearts',title:'Memory Hearts',icon:'♡',description:'Watch four hearts light up, then repeat their order.',goal:4,seconds:null}
];
export const KEEPSAKES={
 bows:{title:'A pocket full of happy',note:'A little reminder for Nancy: you are loved, in all the small moments too. ♡'},
 strawberries:{title:'The sweetest little moments',note:'For Nancy — a tiny picnic, a happy memory, and a little love to carry into your day. ♡'},
 hearts:{title:'A heart to keep',note:'Nancy, this little happy place was made just for you. There is always a little love waiting here. ♡'}
};
export function createMission(id,{relaxed=false,random=Math.random}={}){
 const m=MISSIONS.find(m=>m.id===id);if(!m)throw new Error('Unknown mission');
 return {id,goal:m.goal,active:true,paused:false,hits:0,time:m.seconds,complete:false,relaxed:relaxed||m.seconds===null,phase:id==='hearts'?'show':'play',clock:0,flash:-1,sequence:id==='hearts'?Array.from({length:4},()=>Math.min(3,Math.max(0,Math.floor(random()*4)))):[]};
}
export function tickMission(run,dt){
 if(!run?.active||run.paused)return;
 dt=Number.isFinite(dt)?Math.max(0,dt):0;
 if(run.phase==='show'){
  run.clock+=dt;const t=run.clock-.65,index=Math.floor(t/.8);
  run.flash=t>=0&&index<run.sequence.length&&t% .8<.5?run.sequence[index]:-1;
  if(t>=run.sequence.length*.8){run.phase='play';run.flash=-1;}
 }
 if(!run.relaxed&&run.time!==null){run.time=Math.max(0,run.time-dt);if(!run.time)run.active=false;}
}
export function replayMemory(run){
 if(!run?.active||run.paused||run.id!=='hearts')return false;
 run.hits=0;run.phase='show';run.clock=0;run.flash=-1;return true;
}
export function actMission(run,index){
 if(!run?.active||run.paused||run.phase!=='play'||!Number.isInteger(index)||index<0||index>3)return {accepted:false};
 if(run.id==='hearts'&&index!==run.sequence[run.hits]){replayMemory(run);return {accepted:true,mistake:true};}
 run.hits++;
 if(run.hits===run.goal){run.active=false;run.complete=true;}
 return {accepted:true,complete:run.complete};
}
export function normalizeJournal(raw={}){
 raw=raw&&typeof raw==='object'?raw:{};
 const completed={};for(const m of MISSIONS)completed[m.id]=Number.isInteger(raw.completed?.[m.id])?Math.max(0,Math.min(10000,raw.completed[m.id])):0;
 return {completed};
}
export function recordMission(journal,id){if(!MISSIONS.some(m=>m.id===id))return false;const first=journal.completed[id]===0;journal.completed[id]=Math.min(10000,journal.completed[id]+1);return first;}

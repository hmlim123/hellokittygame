// One short, interruptible welcome. Saved ownership is independent of this clock.
const ease=t=>t*t*(3-2*t);
const mix=(a,b,t)=>t>=1?[...b]:a.map((v,i)=>v+(b[i]-v)*t);
export class FriendArrival{
  constructor(destination,reduced=false){this.destination=destination;this.reduced=reduced;this.time=0;this.done=false;}
  advance(dt){
    this.time+=Number.isFinite(dt)?Math.max(0,dt):0;
    const t=this.reduced?5:this.time;
    let phase,position,scale;
    if(t<1.5){const p=t/1.5;phase='enter';position=mix([3.6,.12,2.3],[.85,.12,1.3],ease(p));position[1]+=Math.abs(Math.sin(p*Math.PI*5))*.045;scale=.9;}
    else if(t<3.8){phase='wave';position=[.85,.12,1.3];scale=.9;}
    else{const p=Math.min(1,(t-3.8)/1);phase=p===1?'done':'settle';position=mix([.85,.12,1.3],this.destination,ease(p));scale=.9+(.51-.9)*ease(p);}
    const justFinished=!this.done&&phase==='done';this.done=phase==='done';
    return {phase,position,scale,justFinished};
  }
}

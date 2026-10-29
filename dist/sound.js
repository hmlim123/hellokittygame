// Opt-in synthesized music box: no downloads, autoplay, or tracking.
export class RoomSound{
  constructor(){this.enabled=false;this.busy=false;this.context=null;this.timer=null;this.step=0;this.voices=new Set();}
  async toggle(){
    if(this.busy)return this.enabled;
    if(this.enabled){this.stop();return false;}
    this.busy=true;
    try{
      const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;
      if(!Audio)return false;
      this.context??=new Audio();await this.context.resume();this.enabled=true;
      this.musicNote();this.timer=setInterval(()=>this.musicNote(),650);return true;
    }catch{this.stop();return false;}finally{this.busy=false;}
  }
  note(freq,volume=.018,duration=.8,delay=0){
    if(!this.enabled||this.context.state!=='running'||this.voices.size>=12)return;
    const c=this.context,t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();
    o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    o.connect(g);g.connect(c.destination);this.voices.add(o);
    o.onended=()=>{this.voices.delete(o);o.disconnect();g.disconnect();};o.start(t);o.stop(t+duration+.02);
  }
  musicNote(){if(globalThis.document?.hidden)return;const melody=[523.25,659.25,783.99,659.25,587.33,698.46,659.25,523.25];this.note(melody[this.step++%melody.length],.009,1.1);}
  chime(kind){if(kind==='arrival'){[523.25,659.25,783.99].forEach((n,i)=>this.note(n,.025,.8,i*.13));}else this.note(880,.018,.3);}
  footstep(){if(globalThis.document?.hidden)return;this.note(145+(this.step%2)*18,.0045,.075);}
  stop(){this.enabled=false;clearInterval(this.timer);this.timer=null;for(const o of this.voices){try{o.stop();}catch{}}this.voices.clear();}
  suspend(){if(this.context&&this.enabled)this.context.suspend().catch(()=>{});}
  resume(){if(this.context&&this.enabled)this.context.resume().catch(()=>{});}
}

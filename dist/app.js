import {DOLLS,normalizeState,nextDoll,rewardDoll} from './state.js';
import {KittyRoom} from './scene.js';
import {loadBlenderKitty} from './blender-kitty.js';
import {RoomSound} from './sound.js';
import {MISSIONS,KEEPSAKES,createMission,tickMission,actMission,replayMemory,normalizeJournal,recordMission} from './missions.js';
import {GIFTS} from './gifts.js';

const $=id=>document.getElementById(id), KEY='kitty-room-3d-v1';
function read(key){try{return JSON.parse(localStorage.getItem(key)||'{}')||{};}catch{return {};}}
const state=normalizeState(read(KEY),read('kitty-picnic-v1'));
let room=null,hunt=null,ready=false,handled=false,toastLeft=0,celebrating=false,lastTouch=-Infinity;
const sound=new RoomSound(),preferences=read('kitty-room-preferences-v1');
$('relaxed').checked=preferences.relaxed===true;
$('relaxed').onchange=()=>{preferences.relaxed=$('relaxed').checked;try{localStorage.setItem('kitty-room-preferences-v1',JSON.stringify(preferences));}catch{say('This play pace will last for this visit.');}};
$('sound').onclick=async()=>{const on=await sound.toggle();$('sound').setAttribute('aria-pressed',String(on));$('sound').textContent=on?'♫ On':'♫ Off';$('sound').setAttribute('aria-label',on?'Turn sound off':'Turn sound on');};
// Keep personalization from old links as plain text, without another setup screen.
const recipient=new URLSearchParams(location.search).get('to')?.slice(0,32)||'Nancy';
document.querySelectorAll('[data-recipient]').forEach(el=>el.textContent=recipient);
$('roomMessage').textContent=`No rush, ${recipient}. This little happy place is yours. ♡`;
let journal=normalizeJournal(read('kitty-nancy-missions-v1'));
let heldGift=GIFTS.some(g=>g.id===preferences.heldGift)?preferences.heldGift:'flowers';
function renderAdventures(){
  $('missionCards').innerHTML=MISSIONS.map(m=>`<button data-mission="${m.id}" class="mission-card"><span aria-hidden="true">${m.icon}</span><strong>${m.title}</strong><small>${m.description}</small><em>${journal.completed[m.id]?`${journal.completed[m.id]} completed`:'A keepsake to discover'}</em></button>`).join('');
  $('giftChoices').innerHTML=GIFTS.map(g=>`<button data-gift="${g.id}" aria-pressed="${heldGift===g.id}"><span aria-hidden="true">${g.icon}</span><strong>${g.name}</strong></button>`).join('');
  $('keepsakes').replaceChildren();
  for(const m of MISSIONS){const card=document.createElement('article'),title=document.createElement('h4'),text=document.createElement('p');title.textContent=journal.completed[m.id]?KEEPSAKES[m.id].title:m.title+' keepsake';text.textContent=journal.completed[m.id]?KEEPSAKES[m.id].note.replaceAll('Nancy',recipient):`Complete ${m.title} to open this little note.`;card.className=journal.completed[m.id]?'':'locked';card.append(title,text);$('keepsakes').append(card);}
}
function selectTab(name,focus=false){
  for(const key of ['missions','gifts','nancy']){const on=name===key;$('tab-'+key).setAttribute('aria-selected',String(on));$('tab-'+key).tabIndex=on?0:-1;$('panel-'+key).hidden=!on;}
  if(focus)$('tab-'+name).focus();
}
function openAdventures(){if(!ready||hunt?.active||celebrating)return;renderAdventures();selectTab('missions');$('adventureModal').showModal();}
for(const key of ['missions','gifts','nancy'])$('tab-'+key).onclick=()=>selectTab(key);
document.querySelector('.adventure-tabs').onkeydown=e=>{const tabs=['missions','gifts','nancy'];let index=tabs.findIndex(t=>$('tab-'+t)===document.activeElement);if(index<0)return;if(e.key==='ArrowRight')index=(index+1)%3;else if(e.key==='ArrowLeft')index=(index+2)%3;else if(e.key==='Home')index=0;else if(e.key==='End')index=2;else return;e.preventDefault();selectTab(tabs[index],true);};
$('missionCards').onclick=e=>{const b=e.target.closest('[data-mission]');if(b)start(b.dataset.mission);};
$('giftChoices').onclick=e=>{const b=e.target.closest('[data-gift]');if(!b||!ready)return;heldGift=b.dataset.gift;preferences.heldGift=heldGift;room.setGift(heldGift);document.querySelectorAll('[data-gift]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.gift===heldGift)));try{localStorage.setItem('kitty-room-preferences-v1',JSON.stringify(preferences));$('giftFeedback').textContent=`${GIFTS.find(g=>g.id===heldGift).name}, ready for ${recipient}. ♡`;}catch{$('giftFeedback').textContent='Your choice will stay for this visit.';}};
for(const id of ['closeAdventures','backToKitty'])$(id).onclick=()=>$('adventureModal').close();
$('adventureModal').addEventListener('close',()=>$('startHunt').focus());
renderAdventures();

function save(){
  // Merge collections before writing, including progress earned in another tab.
  const old=normalizeState(read(KEY),read('kitty-picnic-v1'));
  const merged=normalizeState(state,{owned:old.owned});
  Object.assign(state,merged);
  try{localStorage.setItem(KEY,JSON.stringify(state));$('saveStatus').textContent='Your friends save here automatically.';}
  catch{$('saveStatus').textContent='Saving unavailable. Keep this tab open to keep playing.';}
}
function say(text){$('toast').textContent=text;$('toast').classList.add('visible');toastLeft=3.4;}
function portrait(d){return `<svg viewBox="0 0 80 95" aria-hidden="true"><ellipse cx="40" cy="77" rx="20" ry="13" fill="${d.color}"/><ellipse cx="29" cy="88" rx="10" ry="6" fill="#fffaf1"/><ellipse cx="51" cy="88" rx="10" ry="6" fill="#fffaf1"/><path d="M12 33 13 9q1-6 18 9M49 18Q66 3 67 9l1 24" fill="#fffaf1"/><ellipse cx="40" cy="41" rx="33" ry="27" fill="#fffaf1"/><g fill="#21171d"><ellipse cx="27" cy="42" rx="3" ry="4.5"/><ellipse cx="53" cy="42" rx="3" ry="4.5"/></g><ellipse cx="40" cy="51" rx="4" ry="2.7" fill="#edc462"/><g stroke="#33212c" stroke-width="1.8" stroke-linecap="round"><path d="m3 39 11 1M2 47h11M4 55l10-2m52-13 11-1m-10 8h11m-12 6 10 2"/></g><g fill="${d.accent}"><ellipse cx="55" cy="22" rx="9" ry="11" transform="rotate(-30 55 22)"/><ellipse cx="67" cy="26" rx="9" ry="11" transform="rotate(-30 67 26)"/><circle cx="61" cy="24" r="6"/></g></svg>`;}
function collection(){
  $('collectionCount').textContent=`${state.owned.length} of 6 friends`;
  $('collection').innerHTML=DOLLS.map(d=>{const owned=state.owned.includes(d.id);return `<button class="doll-card${owned?'':' locked'}" data-doll="${d.id}" aria-label="${d.name}${owned?'':', not collected'}" aria-pressed="${state.selected===d.id}" ${!ready||hunt?.active||celebrating?'disabled':''}>${portrait(d)}<span>${d.short}</span><small>${owned?'Your friend':'Play a mission to unlock'}</small></button>`;}).join('');
  document.querySelectorAll('[data-theme]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.theme===state.theme)));
}
$('collection').onclick=e=>{
  const b=e.target.closest('[data-doll]');if(!b||!ready||hunt?.active||celebrating)return;
  const id=Number(b.dataset.doll);
  if(!state.owned.includes(id)){say(`Complete a mission to meet ${nextDoll(state)?.name||'a new friend'}.`);return;}
  state.selected=id;save();room.setHero(id);room.inspectKitty();collection();say(`Hello, ${DOLLS[id].short}. ♡`);
};
document.querySelectorAll('[data-theme]').forEach(b=>b.onclick=()=>{
  state.theme=b.dataset.theme;room?.setTheme(state.theme);save();collection();
});
function controls(){
  const active=!!hunt?.active;
  $('wave').disabled=$('dance').disabled=!ready||active;
  $('startHunt').disabled=!ready||celebrating;
  $('wave').disabled=$('dance').disabled=!ready||active||celebrating;
  $('relaxed').disabled=active||celebrating;
  document.querySelectorAll('[data-theme]').forEach(b=>b.disabled=celebrating);
  $('huntButtonLabel').textContent=active?'Finish early':'Play a mission';
  $('huntButtonHint').textContent=active?'Your friends stay safe':'Missions & little gifts';
  $('resetCamera').disabled=active||celebrating;
  collection();
}
$('wave').onclick=()=>{if(!ready||hunt?.active||celebrating)return;room.react('wave');say('A little wave and a wink, just for you. ♡');};
$('dance').onclick=()=>{if(!ready||hunt?.active||celebrating)return;room.react('dance');say('A tiny dance makes a lovely little day. ♫');};
$('resetCamera').onclick=()=>{if(ready&&!hunt?.active&&!celebrating)room.inspectKitty();};
const targets=Array.from({length:4},(_,i)=>{
  const b=document.createElement('button');b.className='bow-target';b.hidden=true;
  b.setAttribute('aria-label',`Catch floating bow ${i+1}`);
  b.onclick=()=>collect(i);$('bowTargets').append(b);return b;
});
const lastCatch=Array(4).fill(-Infinity);
function collect(i){
  const now=performance.now();if(now-lastCatch[i]<220)return;
  const result=actMission(hunt,i);if(!result.accepted)return;lastCatch[i]=now;updateMissionUI();
  if(result.mistake){say('No rush. Watch the hearts and try that little pattern again.');$('hits').textContent='0';return;}
  room.celebrateCatch(room.bows[i].position.clone());sound.chime('catch');if(hunt.id!=='hearts')room.moveBow(i);
  $('hits').textContent=hunt.hits;
  if(hunt.complete)finish();
}
function start(id='bows'){
  if(!ready||celebrating)return;
  if(hunt?.active){hunt.active=false;finish();return;}
  if($('adventureModal').open)$('adventureModal').close();
  hunt=createMission(id,{relaxed:preferences.relaxed===true});handled=false;lastCatch.fill(-Infinity);room.react(null);room.showMission(id,true);
  $('huntHud').hidden=false;$('hits').textContent='0';$('missionGoal').textContent=hunt.goal;$('missionItem').textContent={bows:'bows',strawberries:'berries',hearts:'hearts'}[id];
  $('replayMemory').hidden=id!=='hearts';
  targets.forEach((b,i)=>{b.hidden=false;b.textContent=id==='hearts'?String(i+1):'';b.setAttribute('aria-label',id==='hearts'?`Heart ${i+1}`:`Collect ${id==='bows'?'bow':'strawberry'} ${i+1}`);});
  controls();updateMissionUI();say(id==='hearts'?'Watch the glowing hearts, then tap them in the same order.':hunt.relaxed?'A little adventure, at your own pace.':MISSIONS.find(m=>m.id===id).description);
}
function updateMissionUI(){
  if(!hunt)return;
  $('hits').textContent=hunt.hits;
  $('time').textContent=hunt.id==='hearts'?(hunt.phase==='show'?'Watch…':'Your turn'):hunt.relaxed?'No timer':'0:'+String(Math.ceil(hunt.time)).padStart(2,'0');
  $('sceneHint').textContent=hunt.id==='hearts'?(hunt.phase==='show'?(hunt.flash<0?'Watch the hearts. Your turn is coming.':`Watch heart ${hunt.flash+1}.`):`Your turn: repeat the ${hunt.goal} hearts. Watch again whenever you like.`):`Find ${hunt.goal} ${hunt.id==='bows'?'bows':'strawberries'}. A little friend is waiting.`;
  room.setMissionFlash(hunt.flash);
  targets.forEach((b,i)=>{b.classList.toggle('memory-lit',hunt.id==='hearts'&&hunt.flash===i);b.classList.toggle('memory-target',hunt.id==='hearts');b.setAttribute('aria-disabled',String(hunt.paused||hunt.phase==='show'));});
}
$('replayMemory').onclick=()=>{if(replayMemory(hunt)){lastCatch.fill(-Infinity);updateMissionUI();}};
function finish(){
  if(handled)return;handled=true;room.showHunt(false);room.inspectKitty();
  targets.forEach(b=>b.hidden=true);$('huntHud').hidden=$('pausePanel').hidden=true;
  $('sceneHint').textContent='Drag to look around · Pinch or scroll to zoom';
  if(hunt.complete){
    const points=hunt.id==='bows'?80+(hunt.relaxed?0:Math.ceil(hunt.time)*2):0;
    journal=normalizeJournal(read('kitty-nancy-missions-v1'));recordMission(journal,hunt.id);try{localStorage.setItem('kitty-nancy-missions-v1',JSON.stringify(journal));$('journalStatus').textContent='Your memories save in this browser.';}catch{$('journalStatus').textContent='These memories will last for this visit.';}renderAdventures();
    const doll=rewardDoll(state);state.best=Math.max(state.best,points);
    save();
    $('rewardEyebrow').textContent=doll?'A NEW LITTLE FRIEND':'ALL TOGETHER';
    $('rewardTitle').textContent=doll?`Hello, ${doll.short.toLowerCase()}.`:'A little adventure, a happy memory.';
    $('rewardText').textContent=doll?`${doll.name} is waiting on your shelf. Your mission keepsake is ready in “For ${recipient}”.`:`All six friends are home, ${recipient}. Your ${MISSIONS.find(m=>m.id===hunt.id).title} keepsake is ready in “For ${recipient}”.`;
    $('roomMessage').textContent=doll?`${recipient}, ${doll.short} is coming to say hello…`:'Your whole little family is home. ♡';
    if(doll){
      celebrating=true;controls();sound.chime('arrival');
      room.welcomeFriend(doll.id,state.slots,()=>{
        celebrating=false;controls();$('roomMessage').textContent=`${doll.short} found a happy place on your shelf. ♡`;
        $('rewardModal').showModal();
      });
      return;
    }
    room.updateShelf(state.slots);
  }else{
    $('rewardEyebrow').textContent='NO RUSH';$('rewardTitle').textContent='Lovely playing together.';
    $('rewardText').textContent=`You made ${hunt.hits} of ${hunt.goal} steps. Your friends are safe. Try again whenever you like, ${recipient}.`;
  }
  controls();$('rewardModal').showModal();
}
function pause(force){
  if(!hunt?.active)return;hunt.paused=typeof force==='boolean'?force:!hunt.paused;
  $('pausePanel').hidden=!hunt.paused;targets.forEach(b=>b.hidden=hunt.paused);
  if(hunt.paused)$('resume').focus();else $('pause').focus();
}
$('startHunt').onclick=()=>{if(hunt?.active)start();else openAdventures();};$('pause').onclick=()=>pause();$('resume').onclick=()=>pause(false);
for(const id of ['rewardDone','closeResult'])$(id).onclick=()=>$('rewardModal').close();
$('rewardModal').addEventListener('close',()=>$('startHunt').focus());
$('reload').onclick=()=>location.reload();
document.addEventListener('visibilitychange',()=>{if(document.hidden){pause(true);sound.suspend();}else sound.resume();});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&celebrating){e.preventDefault();room.finishArrival();return;}
  if(e.key==='Escape'&&hunt?.active){e.preventDefault();pause();}
  if(e.key===' '&&e.target.tagName==='CANVAS'&&hunt?.active){e.preventDefault();pause();}
});
addEventListener('storage',event=>{
  if(event.key==='kitty-nancy-missions-v1'){journal=normalizeJournal(read(event.key));renderAdventures();return;}
  if(event.key==='kitty-room-preferences-v1'){
    Object.assign(preferences,read(event.key));$('relaxed').checked=preferences.relaxed===true;
    heldGift=GIFTS.some(g=>g.id===preferences.heldGift)?preferences.heldGift:'flowers';room?.setGift(heldGift);renderAdventures();return;
  }
  if(event.key&&!['kitty-room-3d-v1','kitty-picnic-v1'].includes(event.key))return;
  const merged=normalizeState(read(KEY),{owned:[...state.owned,...normalizeState({},read('kitty-picnic-v1')).owned]});
  if(celebrating)room?.finishArrival();
  Object.assign(state,merged);room?.updateShelf(state.slots);room?.setHero(state.selected);room?.setTheme(state.theme);collection();
});
collection();
try{
  const asset=await loadBlenderKitty();
  room=new KittyRoom($('stage'),{asset,onKitty:(id,hero,part)=>{
    if(!hunt?.active&&!celebrating&&hero){
      const now=performance.now();if(now-lastTouch<650)return;lastTouch=now;
      room.react(part);
      if(part==='pet'){room.heartBurst();say('A gentle head pat. A little love back. ♡');}
      else if(part==='tilt')say('A bow, a little tilt, and a hello. ♡');
      else say(`${GIFTS.find(g=>g.id===heldGift).message} ${recipient}. ♡`);
    }
  },onFrame:(dt)=>{
    if(toastLeft>0){toastLeft-=dt;if(toastLeft<=0)$('toast').classList.remove('visible');}
    if(!room||!hunt?.active)return;
    tickMission(hunt,hunt.phase==='show'?Math.min(dt,.2):dt);updateMissionUI();
    if(!hunt.active){finish();return;}
    if(!hunt.paused)room.bows.forEach((b,i)=>{
      const p=room.project(b.position);targets[i].style.left=p.x+'px';targets[i].style.top=p.y+'px';targets[i].hidden=!p.visible;
    });
  }});
  room.updateShelf(state.slots);room.setHero(state.selected);room.setGift(heldGift);room.setTheme(state.theme);room.setNight(false);room.inspectKitty();
  $('loading').hidden=true;ready=true;controls();save();
  room.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();pause(true);$('webglError').hidden=false;});
}catch(error){console.error('Kitty room failed to start:',error);$('loading').hidden=true;$('webglError').hidden=false;}

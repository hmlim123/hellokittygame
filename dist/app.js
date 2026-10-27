import {DOLLS,THEMES,normalizeState,placeDoll,nextDoll,rewardDoll,createHunt,catchBow,tickHunt} from './state.js';
import {SURPRISES,localDay,normalizeCare,addCare,claimSurprise} from './care.js';
import {kittyReply,MOODS} from './chat.js';
import {KittyRoom} from './scene.js';
const $=id=>document.getElementById(id),key='kitty-room-3d-v1';
function read(k){try{return JSON.parse(localStorage.getItem(k)||'{}')}catch{return {}}}
const R=KittyRewards;let huntToken='';
const care=normalizeCare(read('kitty-care-v1'));let careLastAction=-10000;
const state=normalizeState(read(key),read('kitty-picnic-v1'));
let selected=state.selected,arranging=false,room=null,hunt=null,resultHandled=false,sound=false,audio=null,toastLeft=0,ready=false;
const params=new URLSearchParams(location.search);
const defaultNote="You make my world a little softer and a whole lot happier.\n\nI know there's always room for one more Hello Kitty, so I made you a tiny room for all the little things you love.\n\nEvery plushie, every bow, and every cozy corner comes with a little love from me. ♡";
let chatting=false,chatTurn=0;
let giftName=(params.get('to')||'Nancy').slice(0,32),giftNote=(params.get('note')||defaultNote).slice(0,600);
function save(){const merged=normalizeState(state,{owned:R.collection()});state.owned=merged.owned;state.slots=merged.slots;try{localStorage.setItem(key,JSON.stringify(state));$('saveStatus').textContent='✓ Your room saves itself';}catch{$('saveStatus').textContent='Saving unavailable in this browser';}}
function icon(id){const d=DOLLS[id];return `<svg viewBox="0 0 110 120" aria-hidden="true"><ellipse cx="55" cy="112" rx="31" ry="5" fill="#b08a70" opacity=".12"/><g stroke="#a58b7c" stroke-width="1.5" stroke-linejoin="round"><ellipse cx="38" cy="103" rx="13" ry="9" fill="#fffaf1"/><ellipse cx="72" cy="103" rx="13" ry="9" fill="#fffaf1"/><ellipse cx="27" cy="83" rx="7" ry="11" fill="#fffaf1"/><ellipse cx="83" cy="83" rx="7" ry="11" fill="#fffaf1"/><path d="M35 70Q55 63 75 70l7 29q-27 14-54 0Z" fill="${d.color}"/><path d="M17 37 18 10q3-6 18 11M74 21q16-16 19-11l1 27" fill="#fffaf1"/><path d="M17 37q0-18 38-18t39 18q12 39-39 39T17 37Z" fill="#fffaf1"/><path d="m15 43-11-3m10 13H3m12 8-10 4m90-22 11-3m-10 13h11m-12 8 10 4" fill="none" stroke="#84796c"/><ellipse cx="39" cy="48" rx="3" ry="4" fill="#4e443d" stroke="none"/><ellipse cx="71" cy="48" rx="3" ry="4" fill="#4e443d" stroke="none"/><ellipse cx="55" cy="58" rx="4" ry="2.8" fill="#e6c06a" stroke-width="1"/><ellipse cx="28" cy="58" rx="5" ry="2.4" fill="#f2d3ce" stroke="none"/><ellipse cx="82" cy="58" rx="5" ry="2.4" fill="#f2d3ce" stroke="none"/></g><g fill="${d.accent}" stroke="#b17b86" stroke-width="1.2"><path d="M79 20C60 4 55 16 65 29q8 6 16-2m3-7c19-16 24-4 14 9-8 6-16-2-16-2"/><ellipse cx="82" cy="23" rx="6" ry="7"/></g><path d="M55 83c-9-8-14 4 0 10 14-6 9-18 0-10" fill="#fff8ed"/></svg>`}
function renderCollection(){
  $('collection').innerHTML=DOLLS.map(d=>{const owned=state.owned.includes(d.id);return `<button class="doll-card ${owned?'':'locked'}" data-doll="${d.id}" aria-label="${d.name}${owned?', preview plushie':', locked. Play bow hunt to unlock'}" aria-pressed="${d.id===selected}">${icon(d.id)}<span class="doll-name">${owned?d.short:'Find her in a bow hunt'}</span>${owned?'':'<span class="lock-mark" aria-hidden="true">♡</span>'}</button>`}).join('');
  document.querySelectorAll('[data-doll]').forEach(b=>b.onclick=()=>chooseDoll(Number(b.dataset.doll)));
  $('collectionCount').textContent=`${state.owned.length} / 6`;$('selectedName').textContent=DOLLS[selected].name;$('selectedTag').textContent=DOLLS[selected].tag;
  $('bestScore').textContent=state.rounds?`${state.rounds} happy hunt${state.rounds===1?'':'s'} · best ${state.best} points`:'First little adventure awaits';
  $('playDescription').textContent=state.owned.length===6?'Your family is complete! Catch 8 bows and try for a faster finish.':'Find 8 floating bows in 45 seconds to unwrap a new plushie.';
}
function chooseDoll(id){if(!state.owned.includes(id)){const next=nextDoll(state);toast(`Play a bow hunt to unwrap ${next?.name||'a little surprise'}.`);return;}selected=id;state.selected=id;save();renderCollection();room?.setHero(id);if(arranging)toast(`Choose a shelf spot for ${DOLLS[id].short}.`);else toast(`Hello, ${DOLLS[id].name.toLowerCase()}. ♡`);tone(640+id*65);}
function applyGift(){$('roomOwner').textContent=(giftName||'Nancy')+'’s';$('chatName').textContent=giftName||'Nancy';$('dedication').textContent=giftName?`A LITTLE ROOM FOR ${giftName}`:'FOR MY FAVORITE COLLECTOR';$('noteTitle').textContent=giftName?`For ${giftName},`:'To my favorite person,';$('noteBody').textContent=giftNote;$('giftName').value=giftName;$('giftNote').value=giftNote;$('picnicLink').href='./picnic.html'+location.search;window.KittyRewardPanel?.links();}
function toast(text){$('toast').textContent=text;$('toast').classList.add('visible');toastLeft=3.3;$('announce').textContent=text;}
function tone(freq=700,duration=.12){if(!sound)return;try{if(!audio)audio=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume();const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.type='sine';oscillator.frequency.value=freq;gain.gain.setValueAtTime(.045,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);oscillator.connect(gain);gain.connect(audio.destination);oscillator.start();oscillator.stop(audio.currentTime+duration);}catch{}}
function arrange(on){if(hunt?.active){toast('Finish your little hunt before arranging the shelf.');return;}if(on&&chatting)setChat(false);arranging=on;room?.selectSlot(on);$('placement').hidden=!on;$('slotTargets').hidden=!on;$('arrange').hidden=on;$('sceneHint').textContent=on?'Tap a numbered spot to place your selected plushie.':'Drag to look around · Scroll or pinch to zoom';if(on){room.resetView();$('inspect').textContent='Meet Kitty ↗';toast('Pick a plushie, then choose her favorite spot.');}}
function place(index){if(!arranging)return;if(placeDoll(state,selected,index)){room.updateShelf(state.slots);save();toast(`A cozy new spot for ${DOLLS[selected].short}. ♡`);tone(780);}}
$('slotButtons').innerHTML=Array.from({length:6},(_,i)=>`<button data-place="${i}" aria-label="Place selected plushie in shelf spot ${i+1}">${i+1}</button>`).join('');
$('slotTargets').innerHTML=Array.from({length:6},(_,i)=>`<button class="slot-pin" data-pin="${i}" aria-label="Shelf position ${i+1}">${i+1}</button>`).join('');$('slotTargets').hidden=true;
document.querySelectorAll('[data-place]').forEach(b=>b.onclick=()=>place(Number(b.dataset.place)));document.querySelectorAll('[data-pin]').forEach(b=>b.onclick=()=>place(Number(b.dataset.pin)));
$('arrange').onclick=()=>arrange(true);$('finishArrange').onclick=()=>arrange(false);
$('bowTargets').innerHTML=Array.from({length:4},(_,i)=>`<button class="bow-target" data-bow="${i}" aria-label="Catch floating bow ${i+1}" hidden></button>`).join('');
const bowButtons=[...document.querySelectorAll('[data-bow]')],pinButtons=[...document.querySelectorAll('[data-pin]')],lastCatch=[-1000,-1000,-1000,-1000];
bowButtons.forEach((b,i)=>b.onclick=()=>collect(i));
function collect(i){const now=performance.now();if(now-lastCatch[i]<220||!catchBow(hunt))return;lastCatch[i]=now;room.burst(room.bows[i].position.clone());room.moveBow(i);tone(620+hunt.hits*70);$('hits').textContent=hunt.hits;$('announce').textContent=`${hunt.hits} of 8 bows collected.`;if(hunt.complete)finishHunt();}
function startHunt(){if(!ready||hunt?.active)return;if(chatting)setChat(false);arrange(false);hunt=createHunt();huntToken=R.roundId();resultHandled=false;room.showHunt(true);$('inspect').textContent='Meet Kitty ↗';$('sceneLabel').textContent='THE LITTLE BOW HUNT';$('huntHud').hidden=false;$('hits').textContent='0';$('time').textContent='0:45';$('startHunt').hidden=true;$('endHunt').hidden=false;$('arrange').disabled=true;$('sceneHint').textContent='Tap the floating 3D bows. Eight bows unlock a little friend.';bowButtons.forEach(b=>b.hidden=false);toast('Catch 8 floating bows. Ready, sweetheart?');tone(780);}
function resetHuntUI(){room.showHunt(false);bowButtons.forEach(b=>b.hidden=true);$('huntHud').hidden=true;$('pausePanel').hidden=true;$('startHunt').hidden=false;$('endHunt').hidden=true;$('arrange').disabled=false;$('sceneLabel').textContent='THE PLUSHIE ROOM';$('sceneHint').textContent='Drag to look around · Scroll or pinch to zoom';}
function finishHunt(){if(resultHandled)return;resultHandled=true;resetHuntUI();let doll=null;if(hunt.complete){const points=80+Math.ceil(hunt.time)*2;doll=rewardDoll(state);state.best=Math.max(state.best,points);save();if(doll){selected=doll.id;state.selected=selected;save();room.setHero(selected);room.updateShelf(state.slots);$('rewardArt').innerHTML=icon(selected);$('rewardEyebrow').textContent='A NEW LITTLE FRIEND';$('rewardTitle').textContent=DOLLS[selected].name;$('rewardText').textContent=`${DOLLS[selected].tag}. She is already waiting on your shelf. ${points} happy points!`;}else{$('rewardArt').innerHTML=icon(selected);$('rewardEyebrow').textContent='A WHOLE LOT OF HAPPY';$('rewardTitle').textContent='What a lovely little hunt.';$('rewardText').textContent=`${points} happy points! All six friends are home. There is always time for one more game.`;}$('rewardDone').textContent='Meet her in your room ♡';room.burst(room.hero.position.clone().add({x:0,y:2.8,z:0}));tone(1040,.3);}else{$('rewardArt').innerHTML=icon(selected);$('rewardEyebrow').textContent='A LITTLE MORE PRACTICE';$('rewardTitle').textContent='Another little adventure?';$('rewardText').textContent=`You found ${hunt.hits} of 8 bows. Your collection is safe. Try again whenever you like.`;$('rewardDone').textContent='Back to my cozy room ♡';}const adventure=R.record({id:huntToken,game:'hunt',catches:hunt.hits,completed:hunt.complete});$('rewardText').textContent+=' '+R.resultText(adventure);window.KittyRewardPanel?.refresh();renderCollection();$('rewardModal').showModal();}
function pauseHunt(force){if(!hunt?.active)return;hunt.paused=typeof force==='boolean'?force:!hunt.paused;$('pausePanel').hidden=!hunt.paused;bowButtons.forEach(b=>b.hidden=hunt.paused);if(hunt.paused)$('resume').focus();}
$('startHunt').onclick=startHunt;$('endHunt').onclick=()=>{if(!hunt?.active)return;hunt.active=false;finishHunt();};$('pause').onclick=()=>pauseHunt();$('resume').onclick=()=>pauseHunt(false);$('rewardDone').onclick=()=>{$('rewardModal').close();room.waveTime=1.6;};
function openModal(id){if(hunt?.active)pauseHunt(true);$(id).showModal();}
$('openNote').onclick=()=>openModal('noteModal');$('personalize').onclick=()=>{$('giftFeedback').textContent='';$('fallbackLink').hidden=true;openModal('giftModal');};document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
$('copyGift').onclick=async()=>{giftName=$('giftName').value.trim().slice(0,32)||'Nancy';giftNote=$('giftNote').value.trim().slice(0,600)||defaultNote;const url=new URL(location.href);url.search='';if(giftName)url.searchParams.set('to',giftName);if(giftNote!==defaultNote)url.searchParams.set('note',giftNote);history.replaceState(null,'',url);applyGift();try{await navigator.clipboard.writeText(url.href);$('giftFeedback').textContent='Copied with love! Her room is ready to send. ♡';}catch{$('fallbackLink').value=url.href;$('fallbackLink').hidden=false;$('fallbackLink').select();$('giftFeedback').textContent='Her link is ready. Copy it from the box below. ♡';}};
$('sound').onclick=()=>{sound=!sound;$('sound').setAttribute('aria-pressed',String(sound));$('sound').setAttribute('aria-label',sound?'Turn sound off':'Turn sound on');tone();};
document.querySelectorAll('[data-theme]').forEach(b=>b.onclick=()=>{state.theme=b.dataset.theme;const rewards=R.load();rewards.equipped.theme=null;R.save(rewards);window.KittyRewardPanel?.refresh();applyRewards();save();});
function updateSettings(){document.querySelectorAll('[data-theme]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.theme===state.theme)));$('themeName').textContent=THEMES[state.theme].name;$('night').setAttribute('aria-pressed',String(state.night));$('night').setAttribute('aria-label',state.night?'Switch to daylight':'Switch to evening');$('night').textContent=state.night?'☀':'☾';}
$('night').onclick=()=>{state.night=!state.night;room?.setNight(state.night);updateSettings();save();};
$('resetCamera').onclick=()=>{if(chatting)setChat(false);room?.resetView();$('inspect').textContent='Meet Kitty ↗';};$('rotateLeft').onclick=()=>room?.rotate(-.24);$('rotateRight').onclick=()=>room?.rotate(.24);$('inspect').onclick=()=>{if(!room)return;if(chatting){setChat(false);return;}if(room.inspect){room.resetView();$('inspect').textContent='Meet Kitty ↗';}else{room.inspectKitty();$('inspect').textContent='Back to room ↙';}};
function appendChat(speaker,text,user=false){const row=document.createElement('p');row.className='chat-line'+(user?' from-nancy':'');const label=document.createElement('strong');label.textContent=speaker;row.append(label,document.createTextNode(text));$('chatLog').append(row);while($('chatLog').children.length>20)$('chatLog').firstElementChild.remove();$('chatLog').scrollTop=$('chatLog').scrollHeight;}
function speak(message,showUser=true){if(!ready||!chatting)return;const value=String(message).trim().slice(0,200);if(!value)return;if(showUser)appendChat(giftName||'Nancy',value,true);const reply=kittyReply(value,giftName||'Nancy',chatTurn++);appendChat('Kitty',reply.text);$('kittyWords').textContent=reply.text;$('kittyMood').textContent=MOODS[reply.emotion];room.react(reply.emotion);tone(reply.emotion==='sleepy'?420:780,.13);}
function setChat(on){if(!ready)return;if(on&&hunt?.active){toast('Finish your bow hunt, then come say hello to Kitty. ♡');return;}if(on&&arranging)arrange(false);chatting=on;$(on?'careChatMount':'careHomeMount').append($('carePanel'));$('chatToggle').setAttribute('aria-expanded',String(on));$('chatPanel').hidden=!on;$('kittySpeech').hidden=!on;$('stage').classList.toggle('chatting',on);document.querySelector('.workspace').classList.toggle('chat-active',on);room.setChat(on);$('inspect').textContent=on?'Back to room ↙':'Meet Kitty ↗';$('sceneLabel').textContent=on?'A LITTLE TIME WITH KITTY':'THE PLUSHIE ROOM';$('sceneHint').textContent=on?'Say hello below · Watch Kitty react to you':'Drag to look around · Scroll or pinch to zoom';if(on){if(!$('chatLog').children.length)speak('Hi Kitty!',false);else room.react('wave');}}
function renderCare(){
  $('careHearts').textContent=`${care.hearts} happy heart${care.hearts===1?'':'s'}`;
  $('dailyGift').textContent=care.lastDay>=localDay()?"🎁 Today's gift ✓":'🎁 Daily surprise';
  $('careStickers').innerHTML=SURPRISES.map((gift,i)=>`<span class="care-sticker ${care.gifts.includes(i)?'':'locked'}" role="img" aria-label="${care.gifts.includes(i)?gift.name:'Surprise '+(i+1)+', not collected'}" title="${care.gifts.includes(i)?gift.name:'A little surprise for another day'}">${care.gifts.includes(i)?gift.icon:'♡'}</span>`).join('');
}
function saveCare(){try{localStorage.setItem('kitty-care-v1',JSON.stringify(care));}catch{$('careHint').textContent='Your browser could not save these little moments.';}renderCare();}
function careAction(kind){
  if(!ready)return;
  if(hunt?.active){toast('Finish your bow hunt, then enjoy a little treat together. ♡');return;}
  if(performance.now()-careLastAction<1100)return;careLastAction=performance.now();
  if(!chatting)setChat(true);
  let text,emotion='happy';
  if(kind==='daily'){
    const gift=claimSurprise(care);
    if(gift){text=`${gift.icon} For ${giftName}, a ${gift.name.toLowerCase()} sticker! ${gift.note} +3 happy hearts. ♡`;room.heartBurst();emotion='excited';}
    else{text=`Your little surprise is already on the shelf of treasures, ${giftName}. A new one will be ready tomorrow. Let's enjoy a cuddle today! ♡`;emotion='hug';}
  }else if(kind==='treat'){
    addCare(care,'treat');room.giveTreat();text=`Mmm… a sweet strawberry! Thank you, ${giftName}. Two happy hearts for our little snack time. 🍓`;
  }else{
    addCare(care,'pet');room.heartBurst();emotion='hug';text=`Aww, ${giftName}… those gentle head pats! One happy heart, and a little cuddle back. ♡`;
  }
  appendChat('Kitty',text);$('kittyWords').textContent=text;$('kittyMood').textContent=MOODS[emotion];room.react(emotion);saveCare();tone(880,.16);
}
$('petKitty').onclick=()=>careAction('pet');$('feedKitty').onclick=()=>careAction('treat');$('dailyGift').onclick=()=>careAction('daily');
renderCare();
$('chatToggle').onclick=()=>setChat(!chatting);$('closeChat').onclick=()=>setChat(false);
$('chatForm').onsubmit=e=>{e.preventDefault();const value=$('chatInput').value;if(!value.trim())return;speak(value);$('chatInput').value='';};
document.querySelectorAll('[data-chat]').forEach(b=>b.onclick=()=>speak(b.dataset.chat));
function syncAdventures(){const merged=normalizeState(state,{owned:R.collection()});state.owned=merged.owned;state.slots=merged.slots;room?.updateShelf(state.slots);renderCollection();applyRewards();}
function applyRewards(){const r=R.load();room?.setRewardGifts(r.equipped,state.theme);if(r.equipped.theme){$('themeName').textContent=R.SHOP.find(g=>g.id===r.equipped.theme).name;document.querySelectorAll('[data-theme]').forEach(b=>b.setAttribute('aria-pressed','false'));}else updateSettings();}
document.addEventListener('kitty-rewards-open',()=>pauseHunt(true));document.addEventListener('kitty-rewards-change',applyRewards);addEventListener('pageshow',syncAdventures);addEventListener('storage',syncAdventures);
$('reload').onclick=()=>location.reload();
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseHunt(true);});document.addEventListener('keydown',e=>{if(e.key===' '&&e.target.tagName==='CANVAS'&&hunt?.active){e.preventDefault();pauseHunt();}});
renderCollection();applyGift();updateSettings();
try{
  room=new KittyRoom($('stage'),{onSlot:place,onKitty:(id,isHero)=>{if(!arranging){if(isHero)careAction('pet');else chooseDoll(id);}},onGift:()=>{if(!hunt?.active)startHunt();},onFrame:(dt,t)=>{
    if(!room)return;if(toastLeft>0){toastLeft-=dt;if(toastLeft<=0)$('toast').classList.remove('visible');}
    if(hunt?.active){tickHunt(hunt,dt);$('time').textContent='0:'+String(Math.ceil(hunt.time)).padStart(2,'0');if(!hunt.active)finishHunt();}
    if(hunt?.active&&!hunt.paused)room.bows.forEach((b,i)=>{const p=room.project(b.position);bowButtons[i].style.left=p.x+'px';bowButtons[i].style.top=p.y+'px';bowButtons[i].hidden=!p.visible;});
    if(arranging)room.slotTargets.forEach((s,i)=>{const p=room.project(s.position);pinButtons[i].style.left=p.x+'px';pinButtons[i].style.top=p.y+'px';pinButtons[i].hidden=!p.visible;});
  }});
  room.updateShelf(state.slots);room.setHero(selected);room.setTheme(state.theme);room.setNight(state.night);applyRewards();$('loading').hidden=true;ready=true;$('startHunt').disabled=false;$('arrange').disabled=false;$('chatToggle').disabled=false;['petKitty','feedKitty','dailyGift'].forEach(id=>$(id).disabled=false);save();
  room.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();pauseHunt(true);$('webglError').hidden=false;});
}catch(error){console.error('3D room could not start:',error);$('loading').hidden=true;$('webglError').hidden=false;}

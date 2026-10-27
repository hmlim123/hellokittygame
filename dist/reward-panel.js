(function(){
'use strict';
const R=KittyRewards,$=id=>document.getElementById(id),isPicnic=location.pathname.endsWith('picnic.html');
const nav=document.createElement('nav');nav.className='adventure-nav';nav.setAttribute('aria-label','Nancy’s games');
nav.innerHTML=`<a data-adventure-link href="./" ${isPicnic?'':'aria-current="page"'}>⌂ Kitty’s room</a><a data-adventure-link href="./picnic.html" ${isPicnic?'aria-current="page"':''}>🍓 Plushie picnic</a><button id="navRewards">🎀 <span id="navBalance">0</span> bows · Gifts</button>`;
document.querySelector('.topbar').after(nav);
const mount=$('adventureRewards');
mount.innerHTML=`<section class="adventure-card" aria-label="Shared game rewards"><div class="adventure-title"><div><span class="adventure-kicker">TWO GAMES · ONE HAPPY COLLECTION</span><h2>Little adventures, lovely rewards.</h2></div><span class="adventure-wallet">🎀 <b id="bowBalance">0</b><small>bow tokens</small></span></div><p>Play a picnic or a bow hunt. Spend your earned bows on gifts for the 3D room.</p><div class="adventure-progress"><span id="adventureLevel"></span><span id="adventureNext"></span></div><progress id="milestoneProgress" max="1" value="0" aria-label="Progress toward next play milestone"></progress><div class="adventure-bottom"><span id="adventureStats"></span><button id="openRewards" class="adventure-button">Visit the gift shop ↗</button></div><small class="adventure-save" id="adventureSave">Games, gifts, and plushies share a save in this browser.</small></section>`;
const dialog=document.createElement('dialog');dialog.id='adventureShop';dialog.className='adventure-modal';dialog.setAttribute('aria-labelledby','shopTitle');
dialog.innerHTML=`<button class="adventure-close" id="closeRewards" aria-label="Close gift shop">×</button><span class="adventure-kicker">EARNED WITH LITTLE MOMENTS OF PLAY</span><h2 id="shopTitle">Nancy’s little gift shop</h2><p class="adventure-explain">Picnic: 1 bow per plushie (up to 15), plus 3 for finishing. Bow hunt: 1 per bow, plus 4 for finding all eight. Your first completed game each day gives 5 extra. Catch at least one friend to earn rewards.</p><div class="shop-summary"><strong id="shopBalance"></strong><span>No purchases. No missed-day penalties.</span></div><div id="shopItems" class="shop-grid"></div><h3>A scrapbook of happy moments</h3><p class="adventure-explain">Complete either game to unlock each milestone, a keepsake note, and bonus bows.</p><div id="milestoneItems" class="milestone-grid"></div><p id="milestoneNote" class="milestone-note" hidden></p><p id="shopFeedback" class="shop-feedback" role="status" aria-live="polite"></p><a class="adventure-room-link" data-adventure-link href="./">See your gifts in Kitty’s room ↗</a>`;
document.body.append(dialog);
function links(){document.querySelectorAll('[data-adventure-link]').forEach(a=>{const u=new URL(a.getAttribute('href'),location.href);u.search=location.search;a.href=u.href;});const name=new URLSearchParams(location.search).get('to')||'Nancy';$('shopTitle').textContent=`${name.slice(0,32)}’s little gift shop`;}
function refresh(){
 const s=R.load(),next=R.MILESTONES.find(m=>!s.milestones.includes(m.rounds)),last=R.MILESTONES.filter(m=>s.milestones.includes(m.rounds)).at(-1);
 $('bowBalance').textContent=$('navBalance').textContent=s.balance;
 $('shopBalance').textContent=`🎀 ${s.balance} bow tokens`;
 $('adventureLevel').textContent=last?`${last.icon} ${last.name}`:'🌱 A new little adventure';
 $('adventureNext').textContent=next?`${s.rounds} / ${next.rounds} games · +${next.bonus} bows next`:'All six keepsakes collected ♡';
 $('milestoneProgress').max=next?.rounds||35;$('milestoneProgress').value=s.rounds;
 $('adventureStats').textContent=`${s.picnics} picnic${s.picnics===1?'':'s'} · ${s.hunts} bow hunt${s.hunts===1?'':'s'} · ${s.owned.length} / ${R.SHOP.length} gifts`;
 $('shopItems').innerHTML=R.SHOP.map(g=>{const owned=s.owned.includes(g.id),active=s.equipped[g.type]===g.id;return `<article class="shop-item ${active?'equipped':''}"><span class="shop-icon" aria-hidden="true">${g.icon}</span><h4>${g.name}</h4><p>${g.description}</p><button data-reward="${g.id}" ${!owned&&s.balance<g.cost?'disabled':''}>${active?'Put away':owned?'Use in room':`Unlock · ${g.cost} bows`}</button><small>${active?'Using in your room':owned?'Yours to keep':s.balance<g.cost?`${g.cost-s.balance} more bows to go`:'Ready to unwrap'}</small></article>`;}).join('');
 $('milestoneItems').innerHTML=R.MILESTONES.map(m=>`<button data-keepsake="${m.rounds}" ${s.milestones.includes(m.rounds)?'':'disabled'}><span>${m.icon}</span><b>${m.name}</b><small>${m.rounds} game${m.rounds===1?'':'s'} · +${m.bonus} bows</small><small>${s.milestones.includes(m.rounds)?'Read your keepsake ♡':'Waiting to be unlocked'}</small></button>`).join('');
 links();
}
function open(){document.dispatchEvent(new Event('kitty-rewards-open'));refresh();$('shopFeedback').textContent='';dialog.showModal();}
$('navRewards').onclick=$('openRewards').onclick=open;$('closeRewards').onclick=()=>dialog.close();
$('shopItems').onclick=e=>{const b=e.target.closest('[data-reward]');if(!b)return;const s=R.load(),g=R.SHOP.find(x=>x.id===b.dataset.reward);let message;
 if(s.owned.includes(g.id)){R.equip(s,g.id);message=s.equipped[g.type]===g.id?`${g.name} is ready in your room.`:`${g.name} is tucked away safely.`;}
 else {const result=R.purchase(s,g.id);if(result!=='purchased'){refresh();$('shopFeedback').textContent='Keep playing for a few more bows. ♡';return;}message=`Unwrapped ${g.name}! It is ready in your room.`;}
 const saved=R.save(s);refresh();$('shopFeedback').textContent=saved?message:'Your browser could not save this gift. Please try again.';document.dispatchEvent(new Event('kitty-rewards-change'));
};
$('milestoneItems').onclick=e=>{const b=e.target.closest('[data-keepsake]');if(!b||b.disabled)return;const m=R.MILESTONES.find(x=>x.rounds===Number(b.dataset.keepsake));$('milestoneNote').hidden=false;$('milestoneNote').textContent=`${m.icon} ${m.note}`;};
addEventListener('storage',refresh);addEventListener('pageshow',refresh);rootRefresh();
function rootRefresh(){refresh();window.KittyRewardPanel={refresh,links,show:open};}
})();

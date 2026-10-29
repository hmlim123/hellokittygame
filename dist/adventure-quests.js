export const EXTRA_QUESTS={ribbons:{title:'Momo’s lost ribbons',reward:'Berry sweetheart outfit'},picnic:{title:'A picnic for Momo',reward:'A picnic basket in Kitty’s room'},lanterns:{title:'Lanterns for the garden',reward:'A moon lantern in Kitty’s room'}};
export function questJournal(s){
 return [
 {id:'moonflower',title:'Restore the moonflower',done:s.complete,progress:s.complete?'Moonflower restored':`${s.charms.length} / 3 charms · ${s.guardian?'guardian befriended':'help the cloud guardian'}`,reward:'Moonlight dress and a room friend'},
 {id:'ribbons',...EXTRA_QUESTS.ribbons,done:s.ribbonReturned,progress:s.ribbonReturned?'Returned to Momo':s.ribbons.length===3?'Return the ribbons to Momo by the village fountain':`Find the pink ribbons around the village: ${s.ribbons.length} / 3`},
 {id:'picnic',...EXTRA_QUESTS.picnic,done:s.picnicDelivered,progress:s.picnicDelivered?'Picnic delivered':s.berries.length===2?'Equip Sweet strawberry in Items, then walk up to Momo':`Pick berries from the two bushes in the southern garden: ${s.berries.length} / 2`},
 {id:'lanterns',...EXTRA_QUESTS.lanterns,done:s.lanternsBlessed,progress:s.lanternsBlessed?'The lanterns are glowing':!s.complete?'Restore the moonflower first':s.litLanterns.length===2?'Return to the moonflower shrine':`Visit both lanterns beyond the moon gate: ${s.litLanterns.length} / 2`}
 ];
}
export function renderQuestJournal(container,s,onTrack){
 container.replaceChildren();for(const q of questJournal(s)){
  const card=document.createElement('article'),title=document.createElement('h3'),progress=document.createElement('p'),reward=document.createElement('small');card.className='quest-card'+(q.done?' quest-done':'');card.dataset.quest=q.id;title.textContent=(q.done?'✓ ':'')+q.title;progress.textContent=q.progress;reward.textContent='Reward · '+q.reward;card.append(title,progress,reward);
  if(onTrack&&!q.done){const button=document.createElement('button');button.textContent=s.trackedQuest===q.id?'Following this quest':'Follow quest';button.setAttribute('aria-pressed',String(s.trackedQuest===q.id));button.onclick=()=>onTrack(q.id);card.append(button);}
  container.append(card);
 }
}

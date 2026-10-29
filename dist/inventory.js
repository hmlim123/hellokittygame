import {OUTFITS,HELD_ITEMS} from './equipment-state.js?v=wardrobe-6';
const $=id=>document.getElementById(id);
export class InventoryUI{
 constructor(onEquip){
  this.tab='clothes';this.cards={outfit:new Map(),item:new Map()};
  for(const [kind,options,grid] of [['outfit',OUTFITS,'outfitGrid'],['item',HELD_ITEMS,'itemGrid']])for(const option of options){
   const button=document.createElement('button'),img=document.createElement('img'),name=document.createElement('strong'),status=document.createElement('small');button.type='button';button.setAttribute('aria-label',option.name);button.dataset[kind]=option.id;
   const path=kind==='item'&&option.id==='teddy'?'./assets/quest/momo.svg':`./assets/inventory/${option.id}.svg`;
   img.alt='';img.src=globalThis.KITTY_ART_URLS?.[path]||path+'?v=wardrobe-6';
   name.textContent=option.name;button.append(img,name,status);button.onclick=()=>onEquip(kind,option.id);$(grid).append(button);this.cards[kind].set(option.id,{button,status});
  }
  const tabs=['clothes','items','quest'];
  for(const tab of tabs){const button=$('inventoryTab-'+tab);button.onclick=()=>this.select(tab);button.onkeydown=e=>{let i=tabs.indexOf(tab);if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();i=e.key==='Home'?0:e.key==='End'?2:(i+(e.key==='ArrowRight'?1:2))%3;this.select(tabs[i]);$('inventoryTab-'+tabs[i]).focus();}};}
  this.select(this.tab);
 }
 select(tab){
  this.tab=tab;
  for(const id of ['clothes','items','quest']){const active=id===tab,button=$('inventoryTab-'+id);button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;$('inventoryPanel-'+id).hidden=!active;}
  $('previewPane').hidden=tab==='quest';$('equipmentLayout').classList.toggle('quest-view',tab==='quest');
 }
 render(equipment,quest){
  for(const option of OUTFITS){const {button,status}=this.cards.outfit.get(option.id),owned=option.unlock(quest);button.disabled=!owned;button.setAttribute('aria-pressed',String(equipment.outfit===option.id));status.textContent=!owned?option.hint:equipment.outfit===option.id?'Wearing now':'Equip outfit';button.title=owned?option.detail:option.hint;}
  for(const option of HELD_ITEMS){const {button,status}=this.cards.item.get(option.id);button.setAttribute('aria-pressed',String(equipment.item===option.id));status.textContent=equipment.item===option.id?'Equipped':'Equip item';button.title=option.detail;}
  const outfit=OUTFITS.find(o=>o.id===equipment.outfit),item=HELD_ITEMS.find(i=>i.id===equipment.item);
  $('equippedOutfit').textContent=outfit.name;$('equippedItem').textContent=item.name;$('inventoryStatus').textContent=`Wearing ${outfit.name} · ${item.name}`;
 }
}

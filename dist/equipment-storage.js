import {normalizeAdventure} from './adventure-state.js?v=adventure-7';
import {EQUIPMENT_KEY,normalizeEquipment,equip} from './equipment-state.js?v=adventure-7';
export function readWardrobe(storage,fallback={}){
 const read=(key,otherwise={})=>{try{const value=storage.getItem(key);return value===null?otherwise:JSON.parse(value);}catch{return otherwise;}};
 const quest=normalizeAdventure(read('kitty-nancy-adventure-v1',fallback.quest||{}));
 const equipment=normalizeEquipment(read(EQUIPMENT_KEY,fallback.equipment||{}),quest,read('kitty-room-preferences-v1'));
 return {quest,equipment};
}
export function saveEquipmentChoice(storage,kind,id,fallback={}){
 const {quest,equipment}=readWardrobe(storage,fallback);
 if(!equip(equipment,kind,id,quest))return {accepted:false};
 try{storage.setItem(EQUIPMENT_KEY,JSON.stringify(equipment));return {accepted:true,equipment,quest,saved:true};}
 catch{return {accepted:true,equipment,quest,saved:false};}
}

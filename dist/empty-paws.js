import {EQUIPMENT_KEY} from './equipment-state.js';
export const EMPTY_PAWS_KEY='kitty-nancy-empty-paws-v1';
// Retire the previous automatic bouquet once; retain every other choice and
// allow flowers to be chosen normally after this cosmetic migration.
export function startEmptyPaws(storage,equipment){
 try {
  if(storage?.getItem(EMPTY_PAWS_KEY)==='1')return equipment;
  const next=equipment.item==='flowers'?{...equipment,item:'none'}:equipment;
  if(storage){storage.setItem(EQUIPMENT_KEY,JSON.stringify(next));storage.setItem(EMPTY_PAWS_KEY,'1');}
  return next;
 }catch{return equipment.item==='flowers'?{...equipment,item:'none'}:equipment;}
}

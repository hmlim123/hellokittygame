/** The five editable Blender plush editions, plus the original game character. */
export const PLUSH_STYLES = [
 {id:'classic',name:'Original Kitty',detail:'Your familiar little friend.',file:'hello-kitty.glb'},
 {id:'cloud',name:'Strawberry Cloud',detail:'Cream plush and a strawberry pink bow.',file:'plush/cloud.glb'},
 {id:'witch',name:'Moonlight Witch',detail:'A soft lavender hat and a little velvet cape.',file:'plush/witch.glb'},
 {id:'baby',name:'Baby Blossom',detail:'A duckling bib, pink romper and little pacifier.',file:'plush/baby.glb'},
 {id:'kitten',name:'Rose Kitten',detail:'A soft kitten hood and heart-shaped eye sparkles.',file:'plush/kitten.glb'},
 {id:'bunny',name:'Silver Bunny',detail:'Smooth ivory fabric, long ears and silver ribbons.',file:'plush/bunny.glb'},
];
export function normalizePlush(value){return PLUSH_STYLES.some(s=>s.id===value&&value!=='classic')?value:undefined;}

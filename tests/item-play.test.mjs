import test from 'node:test';
import assert from 'node:assert/strict';
import {createPicnic,placePicnic} from '../dist/item-play.js';
import {LOVE_LETTER} from '../dist/letter.js';
test('picnic accepts matched gifts, gives helpful wrong-slot feedback, and completes only once',()=>{
 const s=createPicnic();assert.equal(placePicnic(s,'teddy','plate').accepted,false);assert.deepEqual(s.placed,{});
 for(const [item,spot] of [['teddy','blanket'],['strawberry','plate'],['flowers','vase']])assert.equal(placePicnic(s,item,spot).accepted,true);
 assert.equal(s.complete,false);assert.equal(placePicnic(s,'teddy','blanket').accepted,false);
 assert.equal(placePicnic(s,'letter','heart').complete,true);assert.equal(placePicnic(s,'letter','heart').accepted,false);
 assert.deepEqual(createPicnic(),{placed:{},complete:false});
});
test('picnic rejects unknown items and spots without changing the activity',()=>{
 const s=createPicnic();assert.equal(placePicnic(s,'bad','plate').accepted,false);assert.equal(placePicnic(s,'letter','bad').accepted,false);assert.deepEqual(s.placed,{});
});
test('the letter is reserved for the user message, with no invented draft',()=>{
 assert.equal(typeof LOVE_LETTER.pending,'boolean');
 if(LOVE_LETTER.pending){assert.deepEqual(LOVE_LETTER.paragraphs,[]);assert.equal(LOVE_LETTER.signature,'');}
 else{assert.ok(LOVE_LETTER.paragraphs.length>0);assert.ok(LOVE_LETTER.paragraphs.every(p=>typeof p==='string'));}
});

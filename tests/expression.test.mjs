import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {soften,blinkAmount,expressionTarget} from '../dist/expression.js';
import {updateFace} from '../dist/models.js';

test('expression easing is continuous and independent of frame rate',()=>{
  let low=0,high=0;for(let i=0;i<15;i++)low=soften(low,1,1/15);for(let i=0;i<60;i++)high=soften(high,1,1/60);
  assert.ok(Math.abs(low-high)<1e-10);assert.ok(soften(.8,0,1/60)>0.7);assert.equal(soften(.8,0,0),.8);
});
test('blink closes then opens gradually and smiling eyes relax after the reaction',()=>{
  assert.equal(blinkAmount(0),0);assert.equal(blinkAmount(.085),1);assert.equal(blinkAmount(.24),0);
  assert.ok(blinkAmount(.04)>0&&blinkAmount(.04)<1);assert.ok(blinkAmount(.16)>0&&blinkAmount(.16)<1);
  assert.ok(expressionTarget('happy',true,1.9).joy>.8);assert.equal(expressionTarget('happy',false).joy,0);assert.ok(expressionTarget('happy',false).smile>0);
});
test('all facial markings remain outside the head and use finite smooth geometry',()=>{
  const part=()=>({geometry:new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(new Float32Array(198),3))});
  const face={left:part(),right:part(),mouth:part()};
  for(const emotion of ['happy','wave','excited','hug','sleepy','curious'])for(const blink of [0,.5,1]){
    updateFace(face,expressionTarget(emotion,true,1.8),blink);
    for(const mesh of Object.values(face)){
      if(mesh.visible===false)continue;const p=mesh.geometry.attributes.position;
      for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);assert.ok(Number.isFinite(x+y+z));const skin=.43*Math.sqrt(1-(x/.78)**2-(y/.58)**2);assert.ok(z>skin+.01);}
    }
  }
});

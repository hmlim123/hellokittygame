import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import{DOLLS,normalizeState}from'../dist/state.js';
test('the shelf maps stable old invitation IDs to the five real Blender editions',()=>{assert.deepEqual(DOLLS.slice(1).map(d=>d.plush),['cloud','witch','baby','kitten','bunny']);assert.deepEqual(normalizeState({owned:[0,2,5],slots:[5,0,2],selected:5}).owned,[0,2,5]);});
test('each lightweight shelf model comes from its actual character source and contains no animation rig',async()=>{
 for(const d of DOLLS){const style=d.plush||'classic',bytes=await readFile(new URL('../dist/assets/shelf/'+style+'.glb',import.meta.url));const doc=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));assert.ok(bytes.length<400000,style+' shelf payload');assert.ok(!doc.animations?.length);const node=doc.nodes.find(n=>n.extras?.shelf_style===style);assert.ok(node,style+' is not its actual source model');assert.equal(doc.meshes.length,1);
 const meta=JSON.parse(await readFile(new URL(d.plush?'../dist/assets/plush/'+style+'-source.json':'../dist/assets/kitty-source.json',import.meta.url)));assert.equal(node.extras.source_sha256,meta.source_sha256);
 }
});

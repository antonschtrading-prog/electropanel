'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

test('deleting a circuit snapshots fire-control links before their mutation',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
 const start=source.indexOf('function removeLine(id){');
 const end=source.indexOf('\nfunction safeText(',start);
 assert.ok(start>=0&&end>start,'circuit deletion handler must exist');
 const body=source.slice(start,end);
 const checkpoint=body.indexOf('checkpoint();');
 const fireDelete=body.indexOf('epFireControlCircuitDeleteV1(state,id)');
 assert.ok(checkpoint>=0&&fireDelete>=0,'both snapshot and fire cleanup are required');
 assert.ok(checkpoint<fireDelete,'snapshot must precede fire-control cleanup so undo restores linked scenarios');
 assert.ok(body.indexOf("if(!state.lines.some(l=>l.id===id))return false")<checkpoint,'missing circuit must not create an undo checkpoint');
});

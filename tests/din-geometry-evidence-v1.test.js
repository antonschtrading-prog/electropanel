'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epDinGeometryCheck}=require('../din-geometry-evidence-v1');
const d=[{id:'A',xMm:0,widthMm:17.5},{id:'B',xMm:17.5,widthMm:18}];
test('exact widths fit without false collision',()=>{const r=epDinGeometryCheck(d,36);assert.equal(r.status,'UNKNOWN');assert.equal(r.verified,false)});
test('overlap blocks',()=>assert.equal(epDinGeometryCheck([{...d[0]},{...d[1],xMm:17}],36).status,'BLOCKED'));
test('overflow blocks',()=>assert.equal(epDinGeometryCheck(d,35).status,'BLOCKED'));
test('duplicate IDs block',()=>assert.equal(epDinGeometryCheck([d[0],d[0]],36).status,'BLOCKED'));
test('bad rail blocks',()=>assert.equal(epDinGeometryCheck(d,0).status,'BLOCKED'));

'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {epUniversalCabinetOptionsV1}=require('../universal-cabinet-options-v1.js');
const {epCabinetSpaceDiagramV1:draw}=require('../cabinet-space-diagram-v1.js');
test('SVG depicts declared useful width, depth unknown, wiring, side corridors and terminals',()=>{
 const report=epUniversalCabinetOptionsV1({lines:[{id:'L1',modules:3}]},null,
  {wiringCorridorMm:50,terminalReserveMm:60,sideWiringCorridorMm:30});
 const option=report.options.find(x=>x.id==='1x4');
 const svg=draw(option);
 assert.match(svg,/<svg/);assert.match(svg,/НЕ ДЛЯ МОНТАЖА/);
 assert.match(svg,/глубина неизвестна/);assert.match(svg,/DIN 1/);
 assert.match(svg,/фиолетовый/);assert.match(svg,/346.0 × 410.0/);
 assert.doesNotMatch(svg,/manufacturerDrawing:true|engineeringApproved:true/);
});
test('blocked layout and incomplete envelope cannot render an approved drawing',()=>{
 assert.doesNotMatch(draw({status:'BLOCKED'}),/<svg/);
 assert.doesNotMatch(draw({status:'REVIEW_REQUIRED',envelope:{}}),/<svg/);
});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epLoadCurrentV1:calc,epApplyLoadCurrentV1:apply}=require('../load-current-v1');
const {epLoadCurrentHtmlV1:html}=require('../load-current-ui-v1');
const single={mode:'single_phase',powerKw:'2.3',voltageV:'230',powerFactor:'1',efficiency:'1',demandFactor:'1'};
const three={mode:'three_phase',powerKw:'6.9',voltageV:'400',powerFactor:'1',efficiency:'1',demandFactor:'1'};
test('single phase resistive load calculates ten amps',()=>{
 const r=calc(single);assert.equal(r.status,'CALCULATED');assert.equal(r.ibA,10);
 assert.equal(r.formula,'P*1000*kd/(Uln*cosPhi*eta)');
});
test('three phase balanced load uses sqrt three and line-line voltage',()=>{
 const r=calc(three);assert.ok(Math.abs(r.ibA-9.959292)<0.00001);
 assert.match(r.formula,/sqrt\(3\)/);
});
test('cos phi, efficiency and demand factors are explicit',()=>{
 const r=calc({...single,powerFactor:'0,8',efficiency:'0.9',demandFactor:'0.5'});
 assert.ok(Math.abs(r.ibA-6.9444444444)<0.00001);
});
test('invalid values fail closed and never produce a current',()=>{
 for(const bad of [null,{}, {...single,voltageV:''},{...single,powerFactor:1.1},
  {...single,efficiency:0},{...single,demandFactor:0},{...single,mode:'DC'},
  {...single,powerKw:'1e3'},{...single,powerKw:'=1+1'},{...single,voltageV:Infinity},
  {...single,voltageV:true},{...single,powerKw:-1}]){
  const r=calc(bad);assert.equal(r.status,'BLOCKED');assert.equal(r.ibA,undefined);
 }
});
test('result outside supported engineering range blocks',()=>{
 assert.equal(calc({...single,powerKw:100000,voltageV:1,powerFactor:0.1,efficiency:0.1,demandFactor:1}).status,'BLOCKED');
});
test('apply records provenance and preserves Iz and Ik',()=>{
 const p={lines:[{id:'L1',phase:'L1',overloadInput:{izA:20},faultInput:{ikKa:6}}]};
 const before=JSON.stringify(p),r=apply(p,'L1',single);
 assert.equal(r.status,'REVIEW_REQUIRED');assert.equal(r.project.lines[0].overloadInput.ibA,10);
 assert.equal(r.project.lines[0].overloadInput.izA,20);
 assert.equal(r.project.lines[0].faultInput.ikKa,6);
 assert.equal(r.project.lines[0].calculationReview.required,true);
 assert.equal(r.project.lines[0].loadCurrentCalculation.inputs.voltageV,230);
 assert.equal(JSON.stringify(p),before);
});
test('duplicate circuit IDs cannot be updated',()=>{
 const p={lines:[{id:'L1'},{id:'L1'}]};assert.equal(apply(p,'L1',single).code,'LINE_NOT_UNIQUE');
});
test('rounds upward conservatively at 0.001 A',()=>{
 const r=calc({...single,powerKw:2.31});assert.equal(r.roundedIbA,10.044);
});
test('UI renders all required fields and escapes names',()=>{
 const p={lines:[{id:'L1',name:'<img src=x>',phase:'3Ф',power:4}]};
 const h=html(p,'L1');
 for(const name of ['mode','powerKw','voltageV','powerFactor','efficiency','demandFactor'])
  assert.match(h,new RegExp('name="'+name+'"'));
 assert.doesNotMatch(h,/<img/);assert.match(h,/&lt;img/);
 assert.match(h,/three_phase" selected/);
});
test('UI shows calculation provenance when available',()=>{
 const p=apply({lines:[{id:'L1',name:'Насос'}]},'L1',single).project;
 const h=html(p,'L1');assert.match(h,/10 А/);assert.match(h,/Uln/);
});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epVoltageDropDesignV1:calc,epApplyVoltageDropInputV1:apply}=require('../voltage-drop-design-v1');
const {epCircuitDesignReviewV1:review}=require('../circuit-design-review-v1');
const {epCircuitDesignReviewHtmlV1:html,epCircuitDesignReviewCsvV1:csv}=require('../circuit-design-review-ui-v1');
const base={phase:'L1',ibA:10,lengthM:100,voltageV:230,rOhmKm:2,xOhmKm:0,
 powerFactor:1,maxDropPercent:3,conductorBasisDocumented:true,
 routeLengthDocumented:true,neutralEquivalent:true};
test('single-phase voltage drop includes outgoing and return conductors',()=>{
 const r=calc(base);assert.equal(r.status,'PASS');
 assert.ok(Math.abs(r.dropV-4)<1e-12);
 assert.ok(Math.abs(r.dropPercent-4/230*100)<1e-12);
});
test('three-phase voltage drop uses sqrt three and line-to-line voltage',()=>{
 const r=calc({...base,phase:'3Ф',voltageV:400,neutralEquivalent:null});
 assert.equal(r.status,'PASS');
 assert.ok(Math.abs(r.dropV-Math.sqrt(3)*2)<1e-12);
});
test('reactance and nonunity power factor contribute to voltage drop',()=>{
 const r=calc({...base,rOhmKm:1,xOhmKm:1,powerFactor:0.8});
 assert.ok(Math.abs(r.dropV-2.8)<1e-12);
});
test('voltage drop above declared threshold fails, not unknown',()=>{
 const r=calc({...base,maxDropPercent:1});
 assert.equal(r.status,'FAIL');assert.ok(r.issues.includes('DROP_EXCEEDS_DECLARED_LIMIT'));
});
test('missing documented conductor, route or neutral blocks arithmetic',()=>{
 for(const update of [{conductorBasisDocumented:false},{routeLengthDocumented:false},
  {neutralEquivalent:false},{lengthM:''},{voltageV:0},{powerFactor:1.1},
  {maxDropPercent:101},{rOhmKm:-1},{ibA:null},{phase:'L4'}]){
  const r=calc({...base,...update});assert.equal(r.status,'UNKNOWN');assert.equal(r.dropPercent,undefined);
 }
});
test('apply voltage drop is immutable and retains unrelated line fields',()=>{
 const p={lines:[{id:'C1',phase:'L1',overloadInput:{ibA:10},faultInput:{ikKa:6}}]};
 const before=JSON.stringify(p),r=apply(p,'C1',base);
 assert.equal(r.status,'REVIEW_REQUIRED');assert.equal(JSON.stringify(p),before);
 assert.equal(r.project.lines[0].voltageDropDesignInput.lengthM,100);
 assert.equal(r.project.lines[0].faultInput.ikKa,6);
 assert.equal(r.project.lines[0].calculationReview.required,true);
});
test('apply rejects missing current and duplicate circuit ID',()=>{
 assert.equal(apply({lines:[{id:'C1',phase:'L1'}]},'C1',base).status,'BLOCKED');
 assert.equal(apply({lines:[{id:'C1'},{id:'C1'}]},'C1',base).code,'LINE_NOT_UNIQUE');
});
test('integrated review detects protection contradictions',()=>{
 const p={lines:[{id:'C1',phase:'L1',catalogSku:'MCB',overloadInput:{ibA:22,izA:20},
  faultInput:{ikKa:8},voltageDropDesignInput:base}]};
 const r=review(p,()=>({inA:16,icnKa:6}));
 assert.equal(r.status,'BLOCKED');assert.equal(r.rows[0].current,'FAIL');
 assert.equal(r.rows[0].breaking,'FAIL');
 assert.ok(r.issues.some(x=>x.code==='IB_IN_EXCEEDED'));
 assert.ok(r.issues.some(x=>x.code==='ICN_IK_EXCEEDED'));
});
test('integrated review leaves missing evidence unknown',()=>{
 const p={lines:[{id:'C1',phase:'L1',catalogSku:null}]};
 const r=review(p,()=>null);assert.equal(r.status,'UNKNOWN');
 assert.equal(r.rows[0].current,'UNKNOWN');assert.equal(r.rows[0].voltageDrop.status,'UNKNOWN');
});
test('review rejects duplicate line IDs',()=>{
 const r=review({lines:[{id:'C1'},{id:'C1'}]},()=>null);
 assert.equal(r.status,'BLOCKED');assert.equal(r.rows.length,1);
});
test('HTML escapes malicious circuit names and exposes edit fields',()=>{
 const p={lines:[{id:'C1',name:'<img src=x>',phase:'L1'}]};
 const h=html(p,()=>null,'C1');assert.doesNotMatch(h,/<img/);
 assert.match(h,/&lt;img/);assert.match(h,/data-drop-form="C1"/);
 for(const field of ['lengthM','voltageV','rOhmKm','xOhmKm','powerFactor','maxDropPercent'])
  assert.match(h,new RegExp('name="'+field+'"'));
});
test('CSV protects formula injection and includes headers',()=>{
 const report={rows:[{lineId:'=1+1',name:'@evil',voltageDrop:{}}]};
 const out=csv(report);assert.match(out,/"'=1\+1"/);assert.match(out,/"'@evil"/);
 assert.match(out,/Сечение мм2/);
});

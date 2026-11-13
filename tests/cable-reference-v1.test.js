'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epCableReferenceV1:check,epCableReferenceForCircuitV1:forLine,
 epApplyCableReferenceInputV1:apply}=require('../cable-reference-v1');
const {epCableReferenceHtmlV1:html}=require('../cable-reference-ui-v1');
const context={ibA:18,inA:20,installationMethod:'B1',material:'Cu',insulation:'PVC',
 loadedConductors:2,ambientAirC:30,ungrouped:true,otherDeratingPresent:false};
test('B1 selects first arithmetic candidate 2.5 mm2 for 18A and 20A',()=>{
 const r=check(context);assert.equal(r.status,'REFERENCE_ONLY');
 assert.equal(r.smallestReferenceCandidate.sectionMm2,2.5);
 assert.equal(r.candidates.find(x=>x.sectionMm2===1.5).status,'REJECTED');
 assert.equal(r.engineeringApproved,false);
});
test('C reference table differs from B1',()=>{
 const r=check({...context,installationMethod:'C',ibA:19,inA:19});
 assert.equal(r.smallestReferenceCandidate.sectionMm2,1.5);
});
test('unknown protective rating yields partial, never full approval',()=>{
 const r=check({...context,inA:null});assert.equal(r.smallestReferenceCandidate.status,'PARTIAL');
 assert.ok(r.issues.includes('PROTECTIVE_RATING_MISSING'));
});
test('all nonmatching reference contexts fail closed',()=>{
 for(const update of [{material:'Al'},{insulation:'XLPE'},{loadedConductors:3},
  {ambientAirC:35},{ungrouped:false},{otherDeratingPresent:true}]){
  const r=check({...context,...update});assert.equal(r.status,'UNKNOWN');assert.equal(r.candidates,undefined);
 }
});
test('unsupported method and invalid Ib never return a section',()=>{
 assert.equal(check({...context,installationMethod:'D'}).status,'UNKNOWN');
 for(const ibA of [null,0,-1,'',false,'1e2','NaN'])
  assert.equal(check({...context,ibA}).status,'BLOCKED');
});
test('insufficient catalogue reference is blocked instead of invented',()=>{
 const r=check({...context,ibA:1000,inA:1000});
 assert.equal(r.status,'BLOCKED');assert.equal(r.smallestReferenceCandidate,null);
});
test('circuit binding uses selected catalogue In and explicit Ib',()=>{
 const p={lines:[{id:'L1',catalogSku:'A',overloadInput:{ibA:18},
  cableReferenceInput:{installationMethod:'B1',material:'Cu',insulation:'PVC',
   loadedConductors:2,ambientAirC:30,ungrouped:true,otherDeratingPresent:false}}]};
 const r=forLine(p,p.lines[0],()=>({inA:20}));
 assert.equal(r.smallestReferenceCandidate.sectionMm2,2.5);
});
test('applying reference context is immutable and demands explicit confirmation',()=>{
 const p={lines:[{id:'L1',overloadInput:{ibA:18}}]},old=JSON.stringify(p);
 assert.equal(apply(p,'L1',{installationMethod:'B1'}).status,'BLOCKED');
 const r=apply(p,'L1',{installationMethod:'B1',confirmContext:true});
 assert.equal(r.status,'REVIEW_REQUIRED');assert.equal(r.project.lines[0].cableReferenceInput.material,'Cu');
 assert.equal(JSON.stringify(p),old);
});
test('UI escapes circuit names and exposes method confirmation',()=>{
 const p={lines:[{id:'L1',name:'<img src=x>',overloadInput:{ibA:18}}]};
 const h=html(p,'L1',()=>null);
 assert.doesNotMatch(h,/<img/);assert.match(h,/&lt;img/);
 assert.match(h,/data-cable-reference-form="L1"/);assert.match(h,/name="confirmContext"/);
});

test('mixed decimal and integer cable sizes are ordered numerically',()=>{
 const r=check({...context,ibA:10,inA:10});
 assert.deepEqual(r.candidates.map(x=>x.sectionMm2),[1.5,2.5,4,6,10,16]);
 assert.equal(r.smallestReferenceCandidate.sectionMm2,1.5);
});

test('manual cable section selection is separate from the reference candidate',()=>{
 const {epApplyCableSectionV1}=require('../cable-reference-v1');
 const p={lines:[{id:'L1',cableReferenceInput:{installationMethod:'B1'}}]};
 const before=JSON.stringify(p);
 assert.equal(epApplyCableSectionV1(p,'L1','2.5').project.lines[0].cableDesignInput.sectionMm2,2.5);
 assert.equal(JSON.stringify(p),before);
 assert.equal(epApplyCableSectionV1(p,'L1','999').status,'BLOCKED');
 assert.equal(epApplyCableSectionV1({lines:[{id:'L1'}]},'L1','2.5').status,'BLOCKED');
});
test('cable section editor presents manual selection without silent auto-selection',()=>{
 const p={lines:[{id:'L1',cableReferenceInput:{installationMethod:'B1'}}]};
 const h=html(p,'L1',()=>null);
 assert.match(h,/data-cable-section-form="L1"/);
 assert.match(h,/name="sectionMm2"/);
 assert.doesNotMatch(h,/value="2.5" selected/);
});

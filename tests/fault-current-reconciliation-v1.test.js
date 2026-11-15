'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epFaultCurrentConsistencyV1:compare,epCircuitDesignReviewV1:review}=require('../circuit-design-review-v1.js');
function line(ik=3,point='B1',model='THREE_PHASE_POSITIVE_SEQUENCE'){
 return {id:'L1',phase:'3Ф',catalogSku:'TEST',modules:3,device:'3P C16',
  overloadInput:{ibA:8,izA:25},
  faultInput:{ikKa:ik,comparisonPoint:point,purpose:'MAX_PROSPECTIVE',faultModel:model,voltageV:400},
  maximumFaultInput:{comparisonPoint:'B1',model:'THREE_PHASE_POSITIVE_SEQUENCE'}};
}
const maximum=(current)=>({ikMaxKa:current,engineeringApproved:false});
test('same-point same-model underdeclared manual maximum is blocking',()=>{
 const r=compare(line(3),maximum(4));
 assert.equal(r.scope,'SAME_POINT_SAME_FAULT_MODEL');
 assert.equal(r.status,'BLOCKED');
 assert.equal(r.differenceKa,1);
 assert.ok(r.issues.some(x=>x.code==='MANUAL_IK_UNDERSTATES_SAME_POINT_MAX'));
 assert.equal(r.engineeringApproved,false);
});
test('manual higher Ik does not silently overwrite computed Ik',()=>{
 const a=line(5),before=JSON.stringify(a),r=compare(a,maximum(4));
 assert.equal(r.status,'UNKNOWN');
 assert.equal(r.manualIkKa,5);
 assert.equal(r.computedIkKa,4);
 assert.ok(r.issues.some(x=>x.code==='MANUAL_IK_GREATER_THAN_CALCULATED_MAX'));
 assert.equal(JSON.stringify(a),before);
});
test('matching numerical values still require engineering review',()=>{
 const r=compare(line('4,00'),maximum(4));
 assert.equal(r.status,'UNKNOWN');
 assert.equal(r.scope,'SAME_POINT_SAME_FAULT_MODEL');
 assert.ok(r.issues.some(x=>x.code==='MANUAL_IK_NUMERICALLY_MATCHES_UNVERIFIED'));
});
test('different points, fault models, or purpose must not be compared',()=>{
 for(const mutate of [
  x=>x.maximumFaultInput.comparisonPoint='BUS',
  x=>x.faultInput.faultModel='SINGLE_PHASE_L_N',
  x=>x.faultInput.purpose='MIN_L_PE',
  x=>x.faultInput.comparisonPoint='',
  x=>delete x.faultInput.purpose
 ]){
  const x=line(2);mutate(x);
  const r=compare(x,maximum(9));
  assert.equal(r.scope,'UNRELATED_OR_UNDECLARED');
  assert.equal(r.status,'UNKNOWN');
  assert.equal(r.differenceKa,null);
  assert.equal(r.issues.length,0);
 }
});
test('missing or malformed numbers cannot produce numeric success',()=>{
 for(const ik of [null,undefined,'abc',0,-3,true,{},'1e6']){
  const x=line();x.faultInput.ikKa=ik;
  const r=compare(x,maximum(10));
  assert.equal(r.status,'UNKNOWN');
  assert.equal(r.differenceKa,null);
 }
});
test('core circuit review carries same-point fault mismatch as a blocking issue',()=>{
 const fault=require('../fault-route-design-v2.js');
 global.epMaximumFaultCurrentV2=fault.epMaximumFaultCurrentV2;
 const p={earthing:'TN-S',lines:[line(2)],branchDevices:[{id:'BD1',circuitId:'L1',modules:3,label:'3P C16'}]};
 p.lines[0].maximumFaultInput={...p.lines[0].maximumFaultInput,uLLV:400,cmax:1.1,
  sourceROhm:0.04,sourceXOhm:0.03,networkSource:'declared grid equivalent',
  segments:[{lengthM:30,r1OhmKm:0.4,x1OhmKm:0.08,
   source:'declared cable',temperatureBasisConfirmed:true}]};
 const device={kind:'MCB',sku:'TEST',label:'3P C16',poles:3,modules:3,inA:16,
  icnKa:6,icnVoltageV:400,icnStandard:'IEC 60898-1',verificationStatus:'VERIFIED'};
 const before=JSON.stringify(p);
 const r=review(p,()=>device);
 assert.ok(r.rows[0].maximumFault.ikMaxKa>4);
 assert.equal(r.rows[0].faultCurrentComparison.status,'BLOCKED');
 assert.ok(r.issues.some(x=>x.code==='MANUAL_IK_UNDERSTATES_SAME_POINT_MAX'));
 assert.equal(r.engineeringApproved,false);
 assert.equal(JSON.stringify(p),before);
});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fault=require('../fault-route-design-v2.js');
const {epCircuitDesignReviewV1}=require('../circuit-design-review-v1.js');
global.epMaximumFaultCurrentV2=fault.epMaximumFaultCurrentV2;
const rated={kind:'MCB',sku:'A',poles:3,inA:16,icnKa:6,icnVoltageV:400,
 icnStandard:'IEC 60898-1',modules:3,label:'3P C16',verificationStatus:'VERIFIED'};
function p(){
 return {title:'Maximum current test',earthing:'TN-S',
  lines:[{id:'L1',phase:'3Ф',catalogSku:'A',device:'3P C16',modules:3,
   overloadInput:{ibA:8,izA:25},faultInput:{ikKa:2,voltageV:400,source:'separate study'},
   maximumFaultInput:{model:'THREE_PHASE_POSITIVE_SEQUENCE',uLLV:400,cmax:1.1,
    sourceROhm:0.04,sourceXOhm:0.03,networkSource:'transformer equivalent',
    segments:[{lengthM:30,r1OhmKm:0.4,x1OhmKm:0.08,source:'line impedance',
     temperatureBasisConfirmed:true}]}}],
  branchDevices:[{id:'Q1',circuitId:'L1',modules:3,label:'3P C16'}],sharedDevices:[]};
}
test('circuit review retains independent manual Ik and computed Ikmax',()=>{
 const project=p(),r=epCircuitDesignReviewV1(project,()=>rated);
 const row=r.rows[0];
 assert.equal(row.ikKa,2);
 assert.ok(row.maximumFault.ikMaxKa>4);
 assert.equal(row.maximumFault.numericComparison,'BELOW_OR_EQUAL_ICN');
 assert.ok(row.reasons.some(x=>x.code==='MAX_FAULT_AND_MANUAL_IK_INDEPENDENT'));
 assert.equal(r.engineeringApproved,false);
});
test('computed Ikmax over Icn blocks even when manual Ik is lower',()=>{
 const project=p(),a={...rated,icnKa:4};
 const r=epCircuitDesignReviewV1(project,()=>a);
 assert.equal(r.status,'BLOCKED');
 assert.ok(r.issues.some(x=>x.code==='MAX_FAULT_EXCEEDS_ICN'&&x.level==='BLOCKED'));
 assert.equal(r.rows[0].breaking,'PASS','manual numeric comparison remains separate');
 assert.equal(r.rows[0].maximumFault.thresholdStatus,'FAIL');
});
test('stale maximum-current basis remains a review item in project core',()=>{
 const project=p();const out=fault.epApplyMaximumFaultV2(project,'L1',project.lines[0].maximumFaultInput,()=>rated);
 assert.ok(out.project);out.project.lines[0].cableDesignInput={sectionMm2:4};
 const r=epCircuitDesignReviewV1(out.project,()=>rated);
 assert.ok(r.issues.some(x=>x.code==='MAX_FAULT_BASIS_STALE'));
 assert.equal(r.rows[0].maximumFault.thresholdStatus,'UNKNOWN');
});

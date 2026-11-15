'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
global.epDeviceSupplyValidateV1=require('../device-supply-v1.js').epDeviceSupplyValidateV1;
global.epDeviceFaultSupplyFingerprintV1=require('../device-fault-scenarios-v1.js').epDeviceFaultSupplyFingerprintV1;
global.epTransformerSourceV1=require('../transformer-source-v1.js').epTransformerSourceV1;
global.epMaximumFaultCurrentV2=require('../fault-route-design-v2.js').epMaximumFaultCurrentV2;
const incoming=require('../incoming-maximum-fault-v1.js');
const branch=require('../calculated-device-fault-bridge-v1.js');
global.epIncomingMaximumAuditV1=incoming.epIncomingMaximumAuditV1;
global.epCalculatedDeviceFaultAuditV1=branch.epCalculatedDeviceFaultAuditV1;
const {epFaultSourceConvergenceV1:audit,epFaultSourceConvergenceHtmlV1:html}=
 require('../fault-source-convergence-v1.js');
const source={sourceModel:'DECLARED_RX',uLLV:400,cmax:1.1,sourceROhm:.04,
 sourceXOhm:.03,networkSource:'same network document and identical impedance'};
const verified=()=>({sku:'SKU',kind:'MCB',poles:3,icnKa:25,icnVoltageV:400,
 icnStandard:'IEC 60898-1',verificationStatus:'VERIFIED'});
const project=()=>{
 const p={earthing:'TN-S',lines:[{id:'L1',phase:'3Ф',catalogSku:'SKU',
 maximumFaultInput:{...source,model:'THREE_PHASE_POSITIVE_SEQUENCE',comparisonPoint:'BRANCH:B1',
 segments:[{lengthM:30,r1OhmKm:.4,x1OhmKm:.08,source:'R/X cable basis',temperatureBasisConfirmed:true}]}}],
 branchDevices:[{id:'B1',circuitId:'L1'}],sharedDevices:[],
 deviceSupplyV1:{version:1,incomingDevices:[{id:'Q0',label:'In',catalogSku:'SKU'}],
 links:[{from:'SOURCE:MAIN',to:'INCOMING:Q0',conductors:['L1','L2','L3','N']},
 {from:'INCOMING:Q0',to:'BRANCH:B1',conductors:['L1','L2','L3','N']}]}};
 p.incomingMaximumStudiesV1=incoming.epIncomingMaximumDeclareV1(p,'INCOMING:Q0',source,verified);
 p.calculatedDeviceFaultBindingsV1=branch.epCalculatedDeviceFaultBindV1(p,'BRANCH:B1',verified);
 return p;
};
test('same declared input network RX and phase model produces conditional ordered result',()=>{
 const p=project(),before=JSON.stringify(p),r=audit(p,verified);
 assert.equal(r.rows.length,1);assert.equal(r.rows[0].sourceConditions,'DECLARED_SAME_SOURCE');
 assert.ok(r.rows[0].branchIkMaxKa<r.rows[0].incomingIkMaxKa);
 assert.equal(r.status,'UNKNOWN');assert.equal(r.engineeringApproved,false);
 assert.equal(JSON.stringify(p),before);
});
test('changed source document does not trigger fake mismatch across different bases',()=>{
 const p=project();p.lines[0].maximumFaultInput.networkSource='different upstream source';
 p.calculatedDeviceFaultBindingsV1=branch.epCalculatedDeviceFaultBindV1(p,'BRANCH:B1',verified);
 const r=audit(p,verified);
 assert.equal(r.rows[0].sourceConditions,'NOT_COMPARABLE');
 assert.ok(r.issues.some(x=>x.code==='FAULT_SOURCE_COMMON_BASIS_NOT_CONFIRMED'));
 assert.equal(r.status,'UNKNOWN');
});
test('changed cmax suppresses comparison and cannot imply selectivity',()=>{
 const p=project();p.lines[0].maximumFaultInput.cmax=1.05;
 p.calculatedDeviceFaultBindingsV1=branch.epCalculatedDeviceFaultBindV1(p,'BRANCH:B1',verified);
 const r=audit(p,verified);
 assert.equal(r.rows[0].sourceConditions,'NOT_COMPARABLE');
 assert.equal(r.selectivityStatus,'NOT_ASSESSED');
});
test('stale branch model or supply route is a blocker, not an accepted comparison',()=>{
 const p=project();p.lines[0].maximumFaultInput.segments[0].lengthM=40;
 const r=audit(p,verified);assert.equal(r.status,'BLOCKED');
 assert.ok(r.issues.some(x=>x.code==='FAULT_SOURCE_PAIR_STUDY_STALE'));
});
test('a contradictory imported numerical result is rejected under exact same source',()=>{
 const p=project(),prior=global.epIncomingMaximumAuditV1;
 global.epIncomingMaximumAuditV1=()=>({rows:[{deviceNodeId:'INCOMING:Q0',
  ikMaxKa:0.5,sourcePathStale:false}],issues:[],status:'UNKNOWN'});
 try{
  const r=audit(p,verified);
  assert.equal(r.status,'BLOCKED');
  assert.ok(r.issues.some(x=>x.code==='FAULT_SOURCE_DOWNSTREAM_IK_EXCEEDS_UPSTREAM_SAME_SOURCE'));
 }finally{global.epIncomingMaximumAuditV1=prior;}
});
test('different source transformer model is never compared with declared R/X',()=>{
 const p=project();p.incomingMaximumStudiesV1[0].maximumFaultInput.sourceModel='TRANSFORMER_WITH_UPSTREAM';
 const r=audit(p,verified);assert.equal(r.rows[0].sourceConditions,'NOT_COMPARABLE');
});
test('missing apparatus study remains unresolved without fabricated numerical results',()=>{
 const p=project();p.incomingMaximumStudiesV1=[];
 const r=audit(p,verified);assert.equal(r.rows[0].incomingIkMaxKa,null);
 assert.ok(r.issues.some(x=>x.code==='FAULT_SOURCE_PAIR_STUDY_MISSING'));
});
test('HTML output is escaped and report is a declared scope only',()=>{
 const h=html({status:'UNKNOWN',rows:[{incomingId:'<img onerror=1>',branchId:'BRANCH:X',
 incomingIkMaxKa:null,branchIkMaxKa:3,sourceConditions:'NOT_COMPARABLE',status:'UNKNOWN'}]});
 assert.ok(h.includes('&lt;img onerror=1&gt;'));assert.ok(!h.includes('<img onerror=1>'));
});

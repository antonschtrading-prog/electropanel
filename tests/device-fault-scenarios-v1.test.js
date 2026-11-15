'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
global.epDeviceSupplyValidateV1=require('../device-supply-v1.js').epDeviceSupplyValidateV1;
const api=require('../device-fault-scenarios-v1.js');
const {epDeviceFaultDeclareV1:declare,epDeviceFaultAuditV1:audit,
 epDeviceFaultClearV1:clear,epDeviceFaultNormalizeV1:normalize}=api;
const project=()=>({lines:[{id:'L1',phase:'L1',catalogSku:'SKU-B'}],
 sharedDevices:[],branchDevices:[{id:'B1',circuitId:'L1'}],
 deviceSupplyV1:{version:1,incomingDevices:[{id:'Q0',label:'Ввод',catalogSku:'SKU-A'}],
 links:[{from:'SOURCE:MAIN',to:'INCOMING:Q0',conductors:['L1','N']},
 {from:'INCOMING:Q0',to:'BRANCH:B1',conductors:['L1','N']}]}});
const facts={kind:'MCB',icnKa:6,icnVoltageV:230,icnStandard:'IEC 60898-1',
 verificationStatus:'VERIFIED'};
const lookup=()=>facts;
const save=(p,id='INCOMING:Q0',ik=5,u=230)=>declare(p,id,ik,u,'Fault calculation F-1','2026 rev A');
test('declaration binds a local fault scenario to its actual upstream path',()=>{
 const p=project(),before=JSON.stringify(p),out=save(p);
 assert.equal(out[0].deviceNodeId,'INCOMING:Q0');assert.equal(out[0].articleSkuSnapshot,'SKU-A');
 assert.ok(out[0].supplyFingerprint.includes('SOURCE:MAIN'));
 assert.equal(JSON.stringify(p),before);
 p.deviceFaultScenariosV1=out;
 const r=audit(p,lookup);assert.equal(r.rows[0].numericalComparison,'PRELIMINARY_NUMERIC_WITHIN_ICN');
 assert.equal(r.status,'UNKNOWN');assert.equal(r.ready_for_installation,false);
});
test('Ik exceeding matching verified Icn blocks instead of passing',()=>{
 const p=project();p.deviceFaultScenariosV1=save(p,'INCOMING:Q0',8);
 const r=audit(p,lookup);assert.equal(r.status,'BLOCKED');
 assert.equal(r.rows[0].numericalComparison,'DECLARED_IK_EXCEEDS_ICN');
});
test('missing article verification never produces positive numeric comparison',()=>{
 const p=project();p.deviceFaultScenariosV1=save(p);
 assert.equal(audit(p,()=>({...facts,verificationStatus:'DRAFT'})).rows[0].numericalComparison,'NOT_ASSESSED');
});
test('Icu cannot be substituted for missing Icn',()=>{
 const p=project();p.deviceFaultScenariosV1=save(p);
 const r=audit(p,()=>({...facts,icnKa:undefined,icuKa:50}));
 assert.equal(r.rows[0].numericalComparison,'NOT_ASSESSED');
 assert.ok(r.issues.some(x=>x.code==='DEVICE_FAULT_ICN_UNDECLARED'));
});
test('different voltage or missing standard prevents unsafe comparison',()=>{
 const p=project();p.deviceFaultScenariosV1=save(p);
 for(const change of [{icnVoltageV:400},{icnStandard:null}]){
  const r=audit(p,()=>({...facts,...change}));
  assert.equal(r.rows[0].numericalComparison,'NOT_ASSESSED');
 }
});
test('topology reparenting invalidates saved fault location evidence',()=>{
 const p=project();p.deviceFaultScenariosV1=save(p,'BRANCH:B1');
 p.deviceSupplyV1.links[1].from='SOURCE:MAIN';
 const r=audit(p,lookup);assert.equal(r.status,'BLOCKED');
 assert.ok(r.issues.some(x=>x.code==='DEVICE_FAULT_SUPPLY_PATH_CHANGED'));
});
test('incoming article substitution invalidates saved evidence',()=>{
 const p=project();p.deviceFaultScenariosV1=save(p);
 p.deviceSupplyV1.incomingDevices[0].catalogSku='SKU-C';
 const r=audit(p,lookup);assert.equal(r.status,'BLOCKED');
 assert.ok(r.issues.some(x=>x.code==='DEVICE_FAULT_SELECTED_ARTICLE_CHANGED'));
});
test('branch circuit article change is independently detected',()=>{
 const p=project();p.deviceFaultScenariosV1=save(p,'BRANCH:B1');
 p.lines[0].catalogSku='SKU-D';
 assert.ok(audit(p,lookup).issues.some(x=>x.code==='DEVICE_FAULT_SELECTED_ARTICLE_CHANGED'));
});
test('broken path cannot capture a new scenario',()=>{
 const p=project();p.deviceSupplyV1.links=[];
 assert.throws(()=>save(p),/DEVICE_FAULT_SUPPLY_PATH_INCOMPLETE/);
});
test('malformed positive values, empty source and unknown nodes are rejected',()=>{
 const p=project();
 for(const [ik,u,doc,rev] of [[0,230,'D','R'],[-1,230,'D','R'],
 [6,0,'D','R'],[6,230,'','R'],[6,230,'D','']])
  assert.throws(()=>declare(p,'INCOMING:Q0',ik,u,doc,rev),/DEVICE_FAULT_/);
 assert.throws(()=>declare(p,'GROUP:GHOST',6,230,'D','R'),/DEVICE_FAULT_NODE_INVALID/);
});
test('duplicate scenario per device and arbitrary serialized flags are rejected',()=>{
 const p=project(),one=save(p)[0];
 assert.throws(()=>normalize(p,[one,one]),/DEVICE_FAULT_SCENARIO_DUPLICATED/);
 assert.throws(()=>normalize(p,[{...one,engineeringApproved:true}]),/DEVICE_FAULT_INVALID_ENTRY/);
});
test('clear leaves original unchanged and does not mutate other locations',()=>{
 const p=project();p.deviceFaultScenariosV1=save(p);
 p.deviceFaultScenariosV1=save(p,'BRANCH:B1');
 const before=JSON.stringify(p),out=clear(p,'INCOMING:Q0');
 assert.equal(out.length,1);assert.equal(out[0].deviceNodeId,'BRANCH:B1');
 assert.equal(JSON.stringify(p),before);
});
test('source missing, unsupported article kinds and no scenarios remain unknown or blocked',()=>{
 const p=project();assert.ok(audit(p,lookup).issues.some(x=>x.code==='DEVICE_FAULT_LOCATION_STUDY_MISSING'));
 p.deviceFaultScenariosV1=save(p);
 assert.equal(audit(p,()=>({...facts,kind:'RCD'})).status,'BLOCKED');
});
test('HTML renders user-provided data safely',()=>{
 const p=project();p.lines[0].id='<img src=x onerror=alert(1)>';
 const html=api.epDeviceFaultHtmlV1(p,lookup);
 assert.ok(!html.includes('<img src=x onerror=alert(1)>'));
 assert.equal(api.epDeviceFaultAuditV1(p,lookup).engineeringApproved,false);
});
test('missing supply module cannot be mistaken for a verified fault study',()=>{
 const p=project();delete p.deviceSupplyV1;
 assert.equal(audit(p,lookup).status,'UNKNOWN');
 assert.ok(audit(p,lookup).issues.some(x=>x.code==='DEVICE_FAULT_TOPOLOGY_UNDECLARED'));
});

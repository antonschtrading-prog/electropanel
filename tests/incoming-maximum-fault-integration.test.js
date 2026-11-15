'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
global.epDeviceSupplyValidateV1=require('../device-supply-v1.js').epDeviceSupplyValidateV1;
global.epDeviceFaultSupplyFingerprintV1=require('../device-fault-scenarios-v1.js').epDeviceFaultSupplyFingerprintV1;
global.epTransformerSourceV1=require('../transformer-source-v1.js').epTransformerSourceV1;
global.epMaximumFaultCurrentV2=require('../fault-route-design-v2.js').epMaximumFaultCurrentV2;
const adapter=require('../incoming-maximum-fault-v1.js');
global.epIncomingMaximumNormalizeV1=adapter.epIncomingMaximumNormalizeV1;
global.epIncomingMaximumAuditV1=adapter.epIncomingMaximumAuditV1;
global.epEngineeringIssueRegisterV1=require('../engineering-issue-register-v1.js').epEngineeringIssueRegisterV1;
const {epRestoreProjectExtensionsV2:restore}=require('../project-state-v2.js');
const {epEngineeringBundleV1:bundle}=require('../engineering-bundle-v1.js');
const {epEngineeringPrintV1:print}=require('../engineering-print-v1.js');
const project=()=>({title:'Incoming source equivalent',earthing:'TN-S',lines:[],
 branchDevices:[],sharedDevices:[],feedLinks:[],groupInputLinks:[],
 deviceSupplyV1:{version:1,incomingDevices:[{id:'QF0',label:'Main',catalogSku:'S'}],
 links:[{from:'SOURCE:MAIN',to:'INCOMING:QF0',conductors:['L1','L2','L3','N']}]}});
const lookup=()=>({sku:'S',kind:'MCB',poles:3,icnKa:25,icnVoltageV:400,
 icnStandard:'IEC 60898-1',verificationStatus:'VERIFIED'});
const source=()=>({sourceModel:'DECLARED_RX',uLLV:400,cmax:1.1,sourceROhm:0.03,
 sourceXOhm:0.04,networkSource:'Supply design R/X equivalent for QF0'});
test('incoming source maximum fault supports project import, print and common issue register',()=>{
 const raw=project();raw.incomingMaximumStudiesV1=adapter.epIncomingMaximumDeclareV1(
  raw,'INCOMING:QF0',source(),lookup);
 const before=JSON.stringify(raw),target=project();
 restore(raw,target);assert.deepEqual(target.incomingMaximumStudiesV1,raw.incomingMaximumStudiesV1);
 assert.equal(JSON.stringify(raw),before);
 const b=bundle(target,lookup);
 assert.equal(b.sections.incomingMaximum.rows.length,1);
 assert.ok(b.sections.incomingMaximum.rows[0].ikMaxKa>0);
 assert.ok(b.sections.issueRegister.entries.some(x=>x.code==='INCOMING_MAX_NETWORK_ASSUMPTIONS_REQUIRE_REVIEW'));
 assert.match(print(b),/Ток КЗ на вводных аппаратах из R\/X и трансформатора/);
 assert.equal(b.ready_for_installation,false);
});
test('topology changed before import is auditable, not silently recalculated',()=>{
 const raw=project();raw.incomingMaximumStudiesV1=adapter.epIncomingMaximumDeclareV1(
  raw,'INCOMING:QF0',source(),lookup);
 raw.deviceSupplyV1.links[0].conductors=['L1','L2','L3'];
 const target=project();restore(raw,target);
 const b=bundle(target,lookup);
 assert.equal(b.statuses.incomingMaximum,'BLOCKED');
 assert.ok(b.sections.issueRegister.entries.some(x=>x.code==='INCOMING_MAX_STUDY_STALE'));
});
test('historical source study stays auditable if an incoming feed was removed',()=>{
 const raw=project();raw.incomingMaximumStudiesV1=adapter.epIncomingMaximumDeclareV1(
  raw,'INCOMING:QF0',source(),lookup);
 raw.deviceSupplyV1.links=[];
 const target=project();restore(raw,target);
 const b=bundle(target,lookup);
 assert.equal(b.statuses.incomingMaximum,'BLOCKED');
 assert.equal(b.sections.incomingMaximum.rows[0].sourcePathStale,true);
});
test('tampered input and duplicate incoming studies never import',()=>{
 const raw=project();raw.incomingMaximumStudiesV1=adapter.epIncomingMaximumDeclareV1(
  raw,'INCOMING:QF0',source(),lookup);
 const first=raw.incomingMaximumStudiesV1[0];
 for(const list of [
  [{...first,engineeringApproved:true}],
  [first,first],
  [{...first,maximumFaultInput:{...first.maximumFaultInput,comparisonPoint:'INCOMING:GHOST'}}],
  [{...first,maximumFaultInput:{...first.maximumFaultInput,segments:[{lengthM:1}]}}]
 ]){
  assert.throws(()=>restore({...raw,incomingMaximumStudiesV1:list},project()),/INCOMING_MAX_/);
 }
});
test('older project without current study remains valid and does not invent source impedance',()=>{
 const raw=project(),target=project();restore(raw,target);
 const b=bundle(target,lookup);
 assert.equal(b.sections.incomingMaximum.rows.length,0);
 assert.ok(b.sections.incomingMaximum.issues.some(x=>x.code==='INCOMING_MAX_STUDY_UNDECLARED'));
});

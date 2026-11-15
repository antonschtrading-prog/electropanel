'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
global.epDeviceSupplyValidateV1=require('../device-supply-v1.js').epDeviceSupplyValidateV1;
global.epDeviceFaultSupplyFingerprintV1=require('../device-fault-scenarios-v1.js').epDeviceFaultSupplyFingerprintV1;
global.epTransformerSourceV1=require('../transformer-source-v1.js').epTransformerSourceV1;
global.epMaximumFaultCurrentV2=require('../fault-route-design-v2.js').epMaximumFaultCurrentV2;
const api=require('../incoming-maximum-fault-v1.js');
const p=()=>({earthing:'TN-S',lines:[],branchDevices:[],sharedDevices:[],
 deviceSupplyV1:{version:1,incomingDevices:[{id:'Q0',label:'Main',catalogSku:'SKU'}],
 links:[{from:'SOURCE:MAIN',to:'INCOMING:Q0',conductors:['L1','L2','L3','N']}]}});
const article=(icnKa=16)=>({sku:'SKU',kind:'MCB',poles:3,icnKa,icnVoltageV:400,
 icnStandard:'IEC 60898-1',verificationStatus:'VERIFIED'});
const rx=()=>({sourceModel:'DECLARED_RX',uLLV:400,cmax:1.1,
 sourceROhm:.04,sourceXOhm:.03,networkSource:'Upstream RX calculation for input'});
const transformer=()=>({sourceModel:'TRANSFORMER_WITH_UPSTREAM',uLLV:400,cmax:1.1,
 transformer:{ratedPowerKva:1000,ratedVoltageV:400,ukPercent:6,
 loadLossW:9000,upstreamROhm:0.001,upstreamXOhm:0.002,
 source:'Transformer nameplate and losses',upstreamSource:'Network impedance calculation',
 lossBasisConfirmed:true}});
test('incoming R/X calculation reuses existing fault maximum engine without artificial cable',()=>{
 const project=p(),before=JSON.stringify(project);
 const records=api.epIncomingMaximumDeclareV1(project,'INCOMING:Q0',rx(),()=>article());
 assert.equal(JSON.stringify(project),before);assert.equal(records.length,1);
 assert.deepEqual(records[0].maximumFaultInput.segments,[]);
 project.incomingMaximumStudiesV1=records;
 const a=api.epIncomingMaximumAuditV1(project,()=>article());
 assert.equal(a.rows.length,1);
 assert.ok(Math.abs(a.rows[0].ikMaxKa-(1.1*400/(Math.sqrt(3)*.05)/1000))<1e-10);
 assert.equal(a.engineeringApproved,false);assert.equal(a.status,'UNKNOWN');
});
test('incoming transformer source calculations use existing uk/loss equivalent',()=>{
 const project=p(),records=api.epIncomingMaximumDeclareV1(project,
  'INCOMING:Q0',transformer(),()=>article(25));
 project.incomingMaximumStudiesV1=records;
 const a=api.epIncomingMaximumAuditV1(project,()=>article(25));
 assert.equal(a.rows[0].model,'TRANSFORMER_WITH_UPSTREAM');
 assert.ok(a.rows[0].ikMaxKa>0);assert.ok(a.rows[0].transformer.transformerZOhm>0);
 assert.equal(a.ready_for_installation,false);
});
test('known Ik above Icn blocks even with otherwise complete calculations',()=>{
 const project=p();project.incomingMaximumStudiesV1=api.epIncomingMaximumDeclareV1(
  project,'INCOMING:Q0',rx(),()=>article(4));
 const a=api.epIncomingMaximumAuditV1(project,()=>article(4));
 assert.equal(a.status,'BLOCKED');
 assert.ok(a.issues.some(i=>i.code==='INCOMING_MAX_ICN_NUMERIC_EXCEEDED'));
});
test('changed input article invalidates saved source study',()=>{
 const project=p();project.incomingMaximumStudiesV1=api.epIncomingMaximumDeclareV1(
  project,'INCOMING:Q0',rx(),()=>article());
 project.deviceSupplyV1.incomingDevices[0].catalogSku='OTHER';
 const a=api.epIncomingMaximumAuditV1(project,()=>article());
 assert.equal(a.status,'BLOCKED');assert.equal(a.rows[0].ikMaxKa,null);
 assert.ok(a.issues.some(i=>i.code==='INCOMING_MAX_STUDY_STALE'));
});
test('changed incoming upstream conductors invalidate existing study',()=>{
 const project=p();project.incomingMaximumStudiesV1=api.epIncomingMaximumDeclareV1(
  project,'INCOMING:Q0',rx(),()=>article());
 project.deviceSupplyV1.links[0].conductors=['L1','L2','L3'];
 assert.equal(api.epIncomingMaximumAuditV1(project,()=>article()).rows[0].sourcePathStale,true);
});
test('invalid transformer losses, voltage mismatch and unsupported source model cannot be saved',()=>{
 for(const change of [
  x=>x.transformer.loadLossW=100000,
  x=>x.transformer.ratedVoltageV=380,
  x=>x.sourceModel='UNSUPPORTED']){
  const project=p(),input=transformer();change(input);
  assert.throws(()=>api.epIncomingMaximumDeclareV1(project,'INCOMING:Q0',input,()=>article()),/INCOMING_MAX_/);
 }
});
test('absent or malformed source R/X rejects prospective current',()=>{
 for(const change of [
  x=>x.sourceROhm=-1,x=>x.sourceXOhm='abc',x=>x.cmax=2,x=>x.uLLV=0]){
  const project=p(),input=rx();change(input);
  assert.throws(()=>api.epIncomingMaximumDeclareV1(project,'INCOMING:Q0',input,()=>article()),/INCOMING_MAX_DECLARED_MODEL_INVALID/);
 }
});
test('cannot assert a calculation at a non-existing incoming device',()=>{
 const project=p();assert.throws(()=>api.epIncomingMaximumDeclareV1(
  project,'INCOMING:Q1',rx(),()=>article()),/INCOMING_MAX_DEVICE_NOT_FOUND/);
});
test('duplicate record, forged approval and invented segments are rejected',()=>{
 const project=p(),one=api.epIncomingMaximumDeclareV1(
  project,'INCOMING:Q0',rx(),()=>article())[0];
 for(const list of [[one,one],[{...one,engineeringApproved:true}],
  [{...one,maximumFaultInput:{...one.maximumFaultInput,segments:[{lengthM:10}]}}]])
  assert.throws(()=>api.epIncomingMaximumNormalizeV1(project,list),/INCOMING_MAX_/);
});
test('historical study preserves raw source even when supply path is stale',()=>{
 const project=p();project.incomingMaximumStudiesV1=api.epIncomingMaximumDeclareV1(
  project,'INCOMING:Q0',rx(),()=>article());
 const old=JSON.stringify(project.incomingMaximumStudiesV1);
 project.deviceSupplyV1.links[0].conductors=['L1','L2','L3'];
 assert.equal(JSON.stringify(project.incomingMaximumStudiesV1),old);
 assert.equal(api.epIncomingMaximumAuditV1(project,()=>article()).status,'BLOCKED');
});
test('clear one incoming study leaves unrelated device and project unchanged',()=>{
 const project=p();project.incomingMaximumStudiesV1=api.epIncomingMaximumDeclareV1(
  project,'INCOMING:Q0',rx(),()=>article());
 const before=JSON.stringify(project),out=api.epIncomingMaximumClearV1(project,'INCOMING:Q0');
 assert.deepEqual(out,[]);assert.equal(JSON.stringify(project),before);
});
test('HTML escapes incoming device names',()=>{
 const project=p();project.deviceSupplyV1.incomingDevices[0].label='<svg onload=alert(1)>';
 const h=api.epIncomingMaximumHtmlV1(project,()=>article());
 assert.ok(h.includes('&lt;svg onload=alert(1)&gt;'));
 assert.ok(!h.includes('<svg onload=alert(1)>'));
});

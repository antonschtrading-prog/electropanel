'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const power=require('../device-supply-v1.js');
const fault=require('../device-fault-scenarios-v1.js');
const coord=require('../device-coordination-evidence-v1.js');
global.epDeviceSupplyValidateV1=power.epDeviceSupplyValidateV1;
global.epDeviceFaultNodeV1=fault.epDeviceFaultNodeV1;
global.epDeviceFaultSupplyFingerprintV1=fault.epDeviceFaultSupplyFingerprintV1;
global.epDeviceFaultNormalizeV1=fault.epDeviceFaultNormalizeV1;
global.epDeviceFaultAuditV1=fault.epDeviceFaultAuditV1;
global.epCoordNormalizeV1=coord.epCoordNormalizeV1;
global.epCoordAuditV1=coord.epCoordAuditV1;
global.epEngineeringIssueRegisterV1=require('../engineering-issue-register-v1.js').epEngineeringIssueRegisterV1;
const {epRestoreProjectExtensionsV2:restore}=require('../project-state-v2.js');
const {epEngineeringBundleV1:bundle}=require('../engineering-bundle-v1.js');
const {epEngineeringPrintV1:print}=require('../engineering-print-v1.js');
const project=()=>({title:'Pair study',lines:[{id:'L1',phase:'L1',catalogSku:'SKU-B'}],
 branchDevices:[{id:'BD1',circuitId:'L1'}],sharedDevices:[],feedLinks:[],groupInputLinks:[],
 deviceSupplyV1:{version:1,incomingDevices:[{id:'Q0',label:'Input',catalogSku:'SKU-A'}],
 links:[{from:'SOURCE:MAIN',to:'INCOMING:Q0',conductors:['L1','N']},
 {from:'INCOMING:Q0',to:'BRANCH:BD1',conductors:['L1','N']}]}});
const catalogue=id=>({kind:'MCB',icnKa:id==='SKU-A'?10:6,icnVoltageV:230,
 icnStandard:'IEC 60898-1',verificationStatus:'VERIFIED'});
const prepare=()=>{
 const p=project();
 p.deviceFaultScenariosV1=fault.epDeviceFaultDeclareV1(p,'BRANCH:BD1',5,230,
  'Network fault study N-10','revision 2026/A');
 p.deviceCoordinationEvidenceV1=coord.epCoordDeclareV1(p,'INCOMING:Q0',
  'BRANCH:BD1','SELECTIVITY_LIMIT',230,6,'Maker','Table S6','rev A',
  'page 27','https://example.org/table.pdf');
 return p;
};
test('source-backed selectivity declaration roundtrip is preserved, still not assessed',()=>{
 const raw=prepare(),before=JSON.stringify(raw),target=project();
 restore(raw,target);assert.deepEqual(target.deviceCoordinationEvidenceV1,raw.deviceCoordinationEvidenceV1);
 assert.deepEqual(target.deviceFaultScenariosV1,raw.deviceFaultScenariosV1);
 assert.equal(JSON.stringify(raw),before);
 const b=bundle(target,catalogue);
 assert.equal(b.sections.deviceCoordinationEvidence.rows.length,1);
 assert.equal(b.sections.deviceFaultScenarios.rows.length,1);
 assert.equal(b.sections.deviceCoordinationEvidence.rows[0].numeric,'WITHIN_DECLARED_LIMIT_UNVERIFIED');
 assert.equal(b.sections.deviceCoordinationEvidence.selectivityStatus,'NOT_ASSESSED');
 assert.ok(b.sections.issueRegister.entries.some(x=>x.code==='COORD_SELECTIVITY_CURVE_AND_SETTINGS_REVIEW_REQUIRED'));
 const report=print(b);assert.match(report,/Изготовитель: документированные пары/);
 assert.match(report,/Table S6/);assert.equal(b.ready_for_installation,false);
});
test('changed supply route retains historical source record but blocks its applicability',()=>{
 const raw=prepare();raw.deviceSupplyV1.links[1].from='SOURCE:MAIN';
 const target=project();target.deviceSupplyV1=raw.deviceSupplyV1;
 restore(raw,target);
 const b=bundle(target,catalogue);
 assert.equal(b.statuses.deviceCoordinationEvidence,'BLOCKED');
 assert.equal(b.statuses.deviceFaultScenarios,'BLOCKED');
 assert.ok(b.sections.issueRegister.entries.some(x=>x.code==='COORD_PAIR_NO_LONGER_DECLARED'));
});
test('evidence with untrusted approval token is rejected at import',()=>{
 const raw=prepare();
 raw.deviceCoordinationEvidenceV1[0].selectivityApproved=true;
 assert.throws(()=>restore(raw,project()),/COORD_RECORD_INVALID/);
});
test('unknown manufacturer source version and untrusted URL cannot be imported',()=>{
 const raw=prepare();raw.deviceCoordinationEvidenceV1[0].sourceUrl='javascript:alert(1)';
 assert.throws(()=>restore(raw,project()),/COORD_URL_INVALID/);
});
test('new model remains backward compatible with projects not using coordination records',()=>{
 const p=project(),restored=restore(p,project());
 assert.equal(restored.deviceCoordinationEvidenceV1,undefined);
 assert.equal(bundle(restored,catalogue).sections.deviceCoordinationEvidence.rows.length,0);
});

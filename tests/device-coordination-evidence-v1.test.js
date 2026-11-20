'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
global.epDeviceSupplyValidateV1=require('../device-supply-v1.js').epDeviceSupplyValidateV1;
const fault=require('../device-fault-scenarios-v1.js');
global.epDeviceFaultNodeV1=fault.epDeviceFaultNodeV1;
global.epDeviceFaultSupplyFingerprintV1=fault.epDeviceFaultSupplyFingerprintV1;
const api=require('../device-coordination-evidence-v1.js');
const project=()=>({lines:[{id:'L1',catalogSku:'SKU-B',phase:'L1'}],
 branchDevices:[{id:'B1',circuitId:'L1'}],sharedDevices:[],
 deviceSupplyV1:{version:1,incomingDevices:[{id:'Q0',label:'Ввод',catalogSku:'SKU-A'}],
 links:[{from:'SOURCE:MAIN',to:'INCOMING:Q0',conductors:['L1','N']},
 {from:'INCOMING:Q0',to:'BRANCH:B1',conductors:['L1','N']}]}});
const declare=(p,type='SELECTIVITY_LIMIT',limit=8,url='https://example.org/table.pdf')=>
 api.epCoordDeclareV1(p,'INCOMING:Q0','BRANCH:B1',type,230,limit,
  'Manufacturer','Document-ID','rev 2026','table 5',url);
const withStudy=p=>{p.deviceFaultScenariosV1=fault.epDeviceFaultDeclareV1(p,'BRANCH:B1',5,230,'Fault study','A');return p;};
test('exact article-pair records and source provenance are immutable and not approval',()=>{
 const p=withStudy(project()),before=JSON.stringify(p),x=declare(p);
 assert.equal(x[0].upstreamSkuSnapshot,'SKU-A');
 assert.equal(x[0].downstreamSkuSnapshot,'SKU-B');
 assert.ok(x[0].supplyFingerprint.includes('INCOMING:Q0'));
 assert.equal(JSON.stringify(p),before);
 p.deviceCoordinationEvidenceV1=x;
 const a=api.epCoordAuditV1(p,()=>({kind:'MCB',verificationStatus:'VERIFIED'}));
 assert.equal(a.rows[0].numeric,'WITHIN_DECLARED_LIMIT_UNVERIFIED');
 assert.equal(a.selectivityStatus,'NOT_ASSESSED');
 assert.equal(a.backupStatus,'NOT_ASSESSED');
 assert.equal(a.engineeringApproved,false);
});
test('manufacturer backup and selectivity are separate records',()=>{
 const p=project();p.deviceCoordinationEvidenceV1=declare(p);
 p.deviceCoordinationEvidenceV1=declare(p,'BACKUP_BREAKING_CAPACITY',10);
 assert.equal(p.deviceCoordinationEvidenceV1.length,2);
 assert.ok(p.deviceCoordinationEvidenceV1.some(x=>x.evidenceType==='SELECTIVITY_LIMIT'));
 assert.ok(p.deviceCoordinationEvidenceV1.some(x=>x.evidenceType==='BACKUP_BREAKING_CAPACITY'));
});
test('duplicate same-kind evidence and forged approval flags are rejected',()=>{
 const p=project(),one=declare(p)[0];
 assert.throws(()=>api.epCoordNormalizeV1(p,[one,one]),/COORD_PAIR_EVIDENCE_DUPLICATED/);
 assert.throws(()=>api.epCoordNormalizeV1(p,[{...one,approved:true}]),/COORD_RECORD_INVALID/);
});
test('missing manufacturer metadata, invalid URL and negative limits are rejected',()=>{
 const p=project();
 for(const uri of ['http://example.org/a','javascript:alert(1)','https://a.org/a b'])
  assert.throws(()=>declare(p,'SELECTIVITY_LIMIT',8,uri),/COORD_URL_INVALID/);
 for(const value of [0,-5,NaN,Infinity,1001])
  assert.throws(()=>declare(p,'SELECTIVITY_LIMIT',value),/COORD_VALUES_INVALID/);
 assert.throws(()=>api.epCoordDeclareV1(p,'INCOMING:Q0','BRANCH:B1','SELECTIVITY_LIMIT',230,5,
  'Manufacturer','','rev','page','https://x.org'),/COORD_SOURCE_INCOMPLETE/);
});
test('unrelated pair cannot be declared as a manufacturer-tested pair',()=>{
 const p=project();
 assert.throws(()=>api.epCoordDeclareV1(p,'SOURCE:MAIN','BRANCH:B1','SELECTIVITY_LIMIT',230,5,
  'Maker','D','rev','page','https://x.org'),/COORD_EXPLICIT_PROTECTION_PAIR_REQUIRED/);
});
test('non-overcurrent or unverified catalogue device has no approval claim',()=>{
 const p=withStudy(project());p.deviceCoordinationEvidenceV1=declare(p);
 const a=api.epCoordAuditV1(p,()=>({kind:'RCD',verificationStatus:'DRAFT'}));
 assert.equal(a.status,'BLOCKED');assert.ok(a.issues.some(x=>x.code==='COORD_KIND_NOT_OVERCURRENT'));
});
test('documented limit exceeded is blocked, within is only unverified',()=>{
 const p=withStudy(project());p.deviceCoordinationEvidenceV1=declare(p,'SELECTIVITY_LIMIT',4);
 const a=api.epCoordAuditV1(p,()=>({kind:'MCB',verificationStatus:'VERIFIED'}));
 assert.equal(a.status,'BLOCKED');
 assert.equal(a.rows[0].numeric,'DECLARED_FAULT_ABOVE_CLAIMED_LIMIT');
});
test('changed upstream SKU and feed route invalidate prior record',()=>{
 for(const edit of [
  p=>p.deviceSupplyV1.incomingDevices[0].catalogSku='CHANGED',
  p=>{p.deviceSupplyV1.links[1].from='SOURCE:MAIN';}
 ]){
  const p=withStudy(project());p.deviceCoordinationEvidenceV1=declare(p);edit(p);
  const a=api.epCoordAuditV1(p,()=>({kind:'MCB',verificationStatus:'VERIFIED'}));
  assert.equal(a.status,'BLOCKED');
  assert.ok(a.issues.some(x=>['COORD_PATH_CHANGED','COORD_ARTICLE_CHANGED','COORD_PAIR_NO_LONGER_DECLARED'].includes(x.code)));
 }
});
test('historical evidence survives structural import validation for stale audit',()=>{
 const p=withStudy(project());const old=declare(p)[0];
 p.deviceSupplyV1.links[1].from='SOURCE:MAIN';
 assert.equal(api.epCoordNormalizeV1(p,[old]).length,1);
 assert.ok(api.epCoordAuditV1({...p,deviceCoordinationEvidenceV1:[old]},()=>null).issues.some(x=>x.code==='COORD_PAIR_NO_LONGER_DECLARED'));
});
test('outdated local short-circuit study is never used in coordination comparison',()=>{
 const p=withStudy(project());p.deviceCoordinationEvidenceV1=declare(p);
 p.lines[0].catalogSku='REPLACED';
 const a=api.epCoordAuditV1(p,()=>({kind:'MCB',verificationStatus:'VERIFIED'}));
 assert.equal(a.rows[0].numeric,'NOT_ASSESSED');
 assert.ok(a.issues.some(x=>x.code==='COORD_LOCAL_FAULT_STUDY_STALE'));
});
test('absence of local study keeps numeric comparison not assessed',()=>{
 const p=project();p.deviceCoordinationEvidenceV1=declare(p);
 const a=api.epCoordAuditV1(p,()=>({kind:'MCB',verificationStatus:'VERIFIED'}));
 assert.equal(a.rows[0].numeric,'NOT_ASSESSED');
 assert.ok(a.issues.some(x=>x.code==='COORD_LOCAL_FAULT_STUDY_REQUIRED'));
});
test('clear one evidence type preserves other type and source record',()=>{
 const p=project();p.deviceCoordinationEvidenceV1=declare(p);
 p.deviceCoordinationEvidenceV1=declare(p,'BACKUP_BREAKING_CAPACITY');
 const before=JSON.stringify(p);
 const r=api.epCoordClearV1(p,'INCOMING:Q0','BRANCH:B1','SELECTIVITY_LIMIT');
 assert.equal(r.length,1);assert.equal(r[0].evidenceType,'BACKUP_BREAKING_CAPACITY');
 assert.equal(JSON.stringify(p),before);
});
test('HTML metadata is escaped; never treat record label as code',()=>{
 const p=project();p.deviceSupplyV1.incomingDevices[0].label='<img src=x onerror=alert(1)>';
 const h=api.epCoordHtmlV1(p,()=>null);
 assert.ok(!h.includes('<img src=x onerror=alert(1)>'));
 assert.equal(api.epCoordAuditV1(p,()=>null).engineeringApproved,false);
});

test('cross-brand pairs, mismatched rating voltage and mixed standards request review',()=>{
 const p=withStudy(project());p.deviceCoordinationEvidenceV1=declare(p);
 const first={kind:'MCB',verificationStatus:'VERIFIED',maker:'Maker A',
  icnVoltageV:230,icnStandard:'IEC 60898-1'};
 const second={kind:'MCB',verificationStatus:'VERIFIED',maker:'Maker B',
  icnVoltageV:400,icnStandard:'IEC 60947-2'};
 const a=api.epCoordAuditV1(p,sku=>sku==='SKU-A'?first:second);
 for(const code of ['COORD_CROSS_MANUFACTURER_PAIR_SOURCE_REVIEW_REQUIRED',
  'COORD_ARTICLE_VOLTAGE_SCOPE_REVIEW_REQUIRED',
  'COORD_MIXED_ARTICLE_STANDARDS_REVIEW_REQUIRED'])
  assert.ok(a.issues.some(x=>x.code===code),code);
 assert.equal(a.selectivityStatus,'NOT_ASSESSED');
});

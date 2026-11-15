'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {EP_CATALOG}=require('../catalog.js');
const {epManufacturerFactsCandidateV1:check}=require('../manufacturer-facts-reconciliation-v1.js');
const {epProtectiveDeviceShortlistV1:shortlist}=require('../protective-device-shortlist-v1.js');
const {epProtectionWorkbenchV1:work}=require('../protection-workbench-v1.js');
global.epManufacturerFactsCandidateV1=check;
global.epProtectiveDeviceShortlistV1=shortlist;
const line=()=>({id:'L1',catalogSku:'SE-A9F74116',phase:'L1',modules:1,
 device:'iC60N C16',overloadInput:{ibA:10,izA:20},
 faultInput:{ikKa:2,voltageV:230}});
const source=(key='SE-A9F74116',override={})=>[{
 id:key,device:{...EP_CATALOG[key],...override}}];
test('matching published primary facts keep article a numerical potential, not verified protection',()=>{
 const a=source(),r=shortlist(line(),a),c=r.candidates[0];
 assert.equal(c.status,'POTENTIAL');
 assert.equal(c.manufacturerEvidence.status,'FACTS_MATCH');
 assert.ok(c.caution.includes('MANUFACTURER_SOURCE_I2T_UNDOCUMENTED'));
 assert.equal(c.engineeringApproved,false);
});
test('wrong published rated current blocks a candidate even if Ib/In/Iz arithmetic passes',()=>{
 const a=source('SE-A9F74116',{inA:20});
 const c=shortlist(line(),a).candidates[0];
 assert.equal(c.status,'REJECTED');
 assert.ok(c.reasons.includes('MANUFACTURER_SOURCE_CONFLICT'));
});
test('wrong manufacturer SKU with identical electrical values is rejected',()=>{
 const c=shortlist(line(),source('SE-A9F74116',{sku:'ANOTHER'})).candidates[0];
 assert.equal(c.status,'REJECTED');
 assert.ok(c.manufacturerEvidence.conflictingFields.includes('sku'));
});
test('unknown catalogue source stays an incomplete evidence caveat, not source-certified',()=>{
 const p={...line(),catalogSku:'IEK-MVA20-1-016-C',device:'ВА47-29 C16'};
 const c=shortlist(p,source('IEK-MVA20-1-016-C')).candidates[0];
 assert.equal(c.status,'POTENTIAL');
 assert.ok(c.caution.includes('MANUFACTURER_PRIMARY_SOURCE_NOT_INDEXED'));
 assert.equal(c.manufacturerEvidence.status,'NOT_INDEXED');
});
test('workbench cannot display source conflict as a usable selected article',()=>{
 const x=line(),r=work({lines:[x]},
  ()=>({...EP_CATALOG[x.catalogSku],inA:20}),
  source(x.catalogSku,{inA:20}),x.id);
 assert.equal(r.selected.status,'BLOCKED');
 assert.ok(r.selected.reasons.includes('MANUFACTURER_SOURCE_CONFLICT'));
});
test('published data match does not imply missing thermal or ADS evidence exists',()=>{
 const a=check('SE-A9F74316',EP_CATALOG['SE-A9F74316']);
 assert.equal(a.status,'FACTS_MATCH');
 for(const claim of ['I2T_LET_THROUGH_BANDS','OPERATING_I2','TRIP_UPPER_ENVELOPE'])
  assert.ok(a.unavailableClaims.includes(claim));
 assert.equal(a.engineeringApproved,false);
});

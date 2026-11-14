'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {EP_CATALOG}=require('../catalog.js');
const {epCatalogDinBridgeV1}=require('../catalog-din-bridge-v1.js');
const {epCatalogEvidenceAuditV1}=require('../catalog-evidence-audit-v1.js');
const {epDraftBomV1}=require('../draft-bom-v1.js');
function project(id){
 return {lines:[{id:'L1',catalogSku:id,modules:1,phase:'L1'}],branchDevices:[{id:'BD1',circuitId:'L1',modules:1}],sharedDevices:[]};
}
test('Icu-only CHINT entry must not be converted to Icn in DIN projection',()=>{
 const d=EP_CATALOG['CH-814014'],r=epCatalogDinBridgeV1(d);
 assert.equal(r.record.electrical.icuKa,6);
 assert.equal(r.record.electrical.icuVoltageV,230);
 assert.equal(r.record.electrical.icnKa,null);
 assert.equal(r.record.engineeringApproved,false);
});
test('provenance explicitly flags Icu without Icn as unresolved',()=>{
 const d=EP_CATALOG['CH-814014'];
 const r=epCatalogEvidenceAuditV1(project('CH-814014'),()=>d);
 assert.equal(r.items[0].icuKa,6);
 assert.equal(r.items[0].icnKa,null);
 assert.ok(r.issues.some(x=>x.code==='CATALOG_ICU_NOT_ICN'));
 assert.equal(r.engineeringApproved,false);
});
test('BOM retains distinct Icu and Icn for same real selected device',()=>{
 const d=EP_CATALOG['CH-814014'];
 const r=epDraftBomV1(project('CH-814014'),()=>d);
 assert.equal(r.items.length,1);
 assert.equal(r.items[0].icuKa,6);
 assert.equal(r.items[0].icnKa,null);
 assert.equal(r.items[0].icuVoltageV,230);
 assert.equal(r.engineeringApproved,false);
});
test('Eaton explicitly rated Icn survives all three outputs with no invented Icu',()=>{
 const d=EP_CATALOG['EA-286533'];
 const b=epCatalogDinBridgeV1(d);
 const a=epCatalogEvidenceAuditV1(project('EA-286533'),()=>d);
 const m=epDraftBomV1(project('EA-286533'),()=>d);
 assert.equal(b.record.electrical.icnKa,6);
 assert.equal(b.record.electrical.icuKa,null);
 assert.equal(a.items[0].icnKa,6);
 assert.equal(a.items[0].icuKa,null);
 assert.equal(m.items[0].icnKa,6);
 assert.equal(m.items[0].icuKa,null);
 assert.equal(m.ready_for_installation,false);
});

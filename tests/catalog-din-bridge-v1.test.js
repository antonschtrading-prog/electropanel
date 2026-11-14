'use strict';
const assert=require('node:assert/strict');
const test=require('node:test');
const {EP_CATALOG}=require('../catalog.js');
const {epCatalogDinBridgeV1,epCatalogDinBridgeAuditV1}=require('../catalog-din-bridge-v1.js');
const sch=EP_CATALOG['SE-A9F74116'];
test('catalogue seeds remain unverified and never approved',()=>{
 const r=epCatalogDinBridgeV1(sch);
 assert.equal(r.record.verificationStatus,'UNVERIFIED');
 assert.equal(r.record.engineeringApproved,false);
 assert.equal(r.record.visual.verified,false);
 assert.equal(r.record.geometry.heightMm,null);
});
test('every seed can be reviewed without invented dimensions',()=>{
 const a=epCatalogDinBridgeAuditV1(EP_CATALOG);
 assert.equal(a.records.length,3);
 for(const r of a.records){assert.equal(r.record.geometry.depthMm,null);assert.equal(r.record.ready_for_installation,false);}
});
test('reject invalid widths and module envelopes',()=>{
 assert.ok(epCatalogDinBridgeV1({...sch,widthMm:-1}).issues.some(x=>x.code==='CATALOG_WIDTH_INVALID'));
 assert.ok(epCatalogDinBridgeV1({...sch,widthMm:50,modules:1}).issues.some(x=>x.code==='CATALOG_MODULE_ENVELOPE_CONFLICT'));
});
test('reject duplicate manufacturer article',()=>{
 const a=epCatalogDinBridgeAuditV1({one:sch,two:{...sch}});
 assert.ok(a.issues.some(x=>x.code==='DUPLICATE_MANUFACTURER_ARTICLE'));
});
test('reject malformed records and missing identity',()=>{
 assert.equal(epCatalogDinBridgeV1(null).status,'BLOCKED');
 assert.ok(epCatalogDinBridgeV1({...sch,sku:''}).issues.some(x=>x.code==='CATALOG_IDENTITY_INCOMPLETE'));
});

test('reject credentialed, non-HTTPS and malformed catalogue evidence URLs',()=>{
 const bad=['https://user:secret@example.com/data','http://example.com/data','javascript:alert(1)','https://','https://example.com@other.example/data'];
 for(const source of bad){
  const r=epCatalogDinBridgeV1({...sch,source});
  if(source==='https://example.com@other.example/data')assert.equal(r.status,'BLOCKED');
  else assert.equal(r.status,'BLOCKED');
  assert.ok(r.issues.some(x=>x.code==='CATALOG_SOURCE_INVALID'));
  assert.equal(r.record.evidence,null);
 }
});
test('reject invalid pole and current data without approval',()=>{
 for(const change of [{poles:0},{poles:1.5},{inA:0},{inA:Infinity}]){
  const r=epCatalogDinBridgeV1({...sch,...change});
  assert.equal(r.status,'BLOCKED');
  assert.equal(r.engineeringApproved,false);
 }
});
test('catalogue audit propagates blocking status from invalid source',()=>{
 const a=epCatalogDinBridgeAuditV1({bad:{...sch,source:'http://example.com'}});
 assert.equal(a.status,'BLOCKED');
 assert.ok(a.issues.some(x=>x.code==='CATALOG_SOURCE_INVALID'));
});

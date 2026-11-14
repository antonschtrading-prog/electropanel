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

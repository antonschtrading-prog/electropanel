'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epCatalogEvidenceAuditV1:a}=require('../catalog-evidence-audit-v1.js');
test('unknown SKU blocks',()=>{
 const r=a({lines:[{id:'1',catalogSku:'x'}]},()=>null);
 assert.equal(r.status,'BLOCKED');
});
test('known SKU remains unverified',()=>{
 const r=a({lines:[{id:'1',catalogSku:'x'}]},()=>({maker:'A',series:'B',source:'https://example.org'}));
 assert.equal(r.status,'UNKNOWN');assert.equal(r.engineeringApproved,false);
});
test('missing SKU is not invented',()=>{
 const r=a({lines:[{id:'1'}]},()=>({}));
 assert.equal(r.issues[0].code,'CATALOG_SKU_MISSING');
});
test('missing datasheet source flagged',()=>{
 const r=a({lines:[{id:'1',catalogSku:'x'}]},()=>({maker:'A',series:'B'}));
 assert.ok(r.issues.some(x=>x.code==='CATALOG_EVIDENCE_INCOMPLETE'));
});
test('lookup failure blocks',()=>{
 const r=a({lines:[{id:'1',catalogSku:'x'}]},()=>{throw Error('bad');});
 assert.equal(r.status,'BLOCKED');
});

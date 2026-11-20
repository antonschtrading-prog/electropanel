'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epCatalogEvidence}=require('../catalog-evidence-v1');
const x={maker:'Maker',series:'Series',sku:'SKU',source:'https://example.org/datasheet',poles:1,modules:1,inA:16,widthMm:18,appearanceEvidence:{kind:'original-stylized'}};
test('documented data is not automatically verified',()=>{const r=epCatalogEvidence(x);assert.equal(r.status,'DOCUMENTED_UNVERIFIED');assert.equal(r.verified,false)});
test('missing datasheet source is flagged',()=>assert.equal(epCatalogEvidence({...x,source:''}).status,'INCOMPLETE'));
test('noninteger poles rejected',()=>assert.ok(epCatalogEvidence({...x,poles:1.5}).issues.some(i=>i.code==='POLES_NOT_INTEGER')));
test('licensed image requires provenance',()=>assert.ok(epCatalogEvidence({...x,appearanceEvidence:{kind:'licensed-image'}}).issues.some(i=>i.code==='APPEARANCE_RIGHTS_MISSING')));
test('bad article rejected',()=>assert.equal(epCatalogEvidence(null).status,'BLOCKED'));

'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {epProjectCatalogV1,epProjectCatalogHtmlV1}=require('../project-catalog-workbench-v1');
const article=()=>({id:'M-001',sku:'001',maker:'Maker',series:'Series',kind:'MCB',modules:1,widthMm:18,poles:1,inA:16,source:'https://example.org/article'});
test('valid project article is searchable and retained',()=>{const r=epProjectCatalogV1({catalogArticles:[article()]});assert.equal(r.lookup('M-001').inA,16);assert.equal(r.lookup('M-001').sourceType,'PROJECT_DECLARATION');});
test('seed cannot be overwritten',()=>{const r=epProjectCatalogV1({catalogArticles:[article()]},{'M-001':{sku:'seed'}});assert.equal(r.lookup('M-001').sku,'seed');assert.equal(r.status,'BLOCKED');});
test('invalid electrical values are rejected',()=>{const a=article();a.widthMm=-1;const r=epProjectCatalogV1({catalogArticles:[a]});assert.equal(r.lookup('M-001'),null);});
test('source required and does not silently verify',()=>{const a=article();a.source='';const r=epProjectCatalogV1({catalogArticles:[a]});assert.equal(r.lookup('M-001'),null);assert.equal(r.status,'UNKNOWN');});
test('HTML escapes source fields',()=>{const a=article();a.maker='<script>alert(1)</script>';const html=epProjectCatalogHtmlV1({catalogArticles:[a]});assert.doesNotMatch(html,/<script>/);});

test('source URL must be HTTPS without embedded credentials',()=>{
 for(const source of ['javascript:alert(1)','https://user:pass@example.org/a','http://example.org/a','https://']){
  const a=article();a.source=source;const r=epProjectCatalogV1({catalogArticles:[a]});assert.equal(r.lookup('M-001'),null,source);
 }
});
test('manufacturer SKU is unique across distinct catalogue IDs',()=>{
 const a=article(),b={...article(),id:'M-002'};
 const r=epProjectCatalogV1({catalogArticles:[a,b]});
 assert.equal(r.lookup('M-001').sku,'001');assert.equal(r.lookup('M-002'),null);
 assert.equal(r.issues[0].code,'DUPLICATE_MANUFACTURER_SKU');
});

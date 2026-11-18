'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {EP_CATALOG}=require('../catalog.js');
const {auditArticle,auditCatalog,REQUIRED_KINDS}=require('../catalog-intake/evidence-audit-v1.js');
test('all existing articles are accounted for without modifying the catalogue',()=>{
 const snapshot=JSON.stringify(EP_CATALOG),result=auditCatalog();
 assert.equal(result.entries.length,Object.keys(EP_CATALOG).length);
 assert.equal(JSON.stringify(EP_CATALOG),snapshot);
 assert.equal(result.engineeringApproved,false);
 assert.ok(result.entries.every(x=>x.status==='REQUIRES_INDEPENDENT_SOURCE_REVIEW'));
});
test('V1 category gaps are explicit, not populated with fictitious SKUs',()=>{
 const report=auditCatalog();
 assert.deepEqual(REQUIRED_KINDS,['MCB','RCD','RCBO','METER','RELAY','CONTACTOR']);
 assert.equal(report.counts.MCB,11);
 for(const kind of ['RCD','RCBO','METER','RELAY','CONTACTOR'])
  assert.ok(report.missingKinds.includes(kind));
});
test('Icu is never treated as Icn',()=>{
 const issues=auditArticle('CH-814014',EP_CATALOG['CH-814014']);
 assert.ok(issues.some(x=>x.code==='ICU_NOT_SUBSTITUTE_FOR_ICN'));
});
test('unreviewed sources and unknown body dimensions stay visible',()=>{
 const issues=auditArticle('SE-A9F74116',EP_CATALOG['SE-A9F74116']);
 assert.ok(issues.some(x=>x.code==='REVIEW_DATE_MISSING'));
 assert.ok(issues.some(x=>x.code==='BODY_GEOMETRY_INCOMPLETE'));
});
test('rejects invented zero, negative, string and nonfinite dimensions',()=>{
 const base={maker:'Example',series:'X',sku:'X',kind:'MCB',poles:1,modules:1,widthMm:18,
  source:'https://example.org',sourceReviewedAt:'2026-11-18',sourceType:'TEST'};
 for(const value of [0,-1,'18',Infinity,NaN]){
  const issues=auditArticle('X',{...base,widthMm:value});
  assert.ok(issues.some(x=>x.code==='INVALID_NUMERIC_VALUE'));
 }
});
test('does not promote Icn without voltage and standard context',()=>{
 const a={maker:'X',series:'Y',sku:'Z',kind:'MCB',poles:1,modules:1,widthMm:18,
  icnKa:6,source:'https://example.org',sourceReviewedAt:'2026-11-18',sourceType:'TEST'};
 assert.ok(auditArticle('X',a).some(x=>x.code==='ICN_CONTEXT_INCOMPLETE'));
});
test('reports invalid records instead of crashing',()=>{
 assert.deepEqual(auditArticle('X',null),[{code:'INVALID_ARTICLE',field:null}]);
 assert.equal(auditCatalog({'X':null}).entries.length,1);
});

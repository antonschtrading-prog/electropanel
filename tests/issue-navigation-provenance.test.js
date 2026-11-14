'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epEngineeringIssueRegisterV1,epEngineeringIssueRegisterHtmlV1,epEngineeringIssueRegisterCsvV1}=
 require('../engineering-issue-register-v1.js');
const project={lines:[{id:'L1'}],sharedDevices:[{id:'R1'}],catalogArticles:[{id:'SKU1'}]};
function report(){
 return epEngineeringIssueRegisterV1({sections:{
  catalogueIntegrity:{issues:[{code:'CATALOG_DIMENSIONS_OR_RATING_INVALID',level:'BLOCKED',recordIndex:2}]},
  crossView:{issues:[{code:'SCHEMATIC_CIRCUIT_PHASE_STALE',level:'BLOCKED',lineId:'L1'},
                    {code:'SCHEMATIC_GROUP_POLES_STALE',level:'BLOCKED',lineId:'R1'},
                    {code:'OUTPUT_BOM_WIDTH_STALE',level:'BLOCKED',lineId:'SKU1'}]}
 }},project);
}
test('only real circuit IDs are actionable navigation targets',()=>{
 const entries=report().entries;
 const circuit=entries.find(x=>x.code==='SCHEMATIC_CIRCUIT_PHASE_STALE');
 assert.equal(circuit.circuitId,'L1');assert.equal(circuit.objectId,null);
 const group=entries.find(x=>x.code==='SCHEMATIC_GROUP_POLES_STALE');
 assert.equal(group.circuitId,null);assert.equal(group.objectId,'R1');
 const article=entries.find(x=>x.code==='OUTPUT_BOM_WIDTH_STALE');
 assert.equal(article.circuitId,null);assert.equal(article.objectId,'SKU1');
});
test('catalogue record index survives in issue register',()=>{
 const entry=report().entries.find(x=>x.code==='CATALOG_DIMENSIONS_OR_RATING_INVALID');
 assert.equal(entry.recordIndex,2);
});
test('issue register shows group and article identifiers without broken focus controls',()=>{
 const html=epEngineeringIssueRegisterHtmlV1(report(),'L1');
 assert.match(html,/data-issue-focus="L1"/);
 assert.doesNotMatch(html,/data-issue-focus="R1"/);
 assert.doesNotMatch(html,/data-issue-focus="SKU1"/);
 assert.match(html,/>R1<\/td>/);
 assert.match(html,/>SKU1<\/td>/);
});
test('CSV contains separate object identifier column',()=>{
 const csv=epEngineeringIssueRegisterCsvV1(report());
 assert.match(csv,/"Цепь";"Объект"/);
 assert.match(csv,/"SCHEMATIC_GROUP_POLES_STALE";"";"R1"/);
 assert.match(csv,/"SCHEMATIC_CIRCUIT_PHASE_STALE";"L1";""/);
});
test('HTML-unsafe catalogue identifiers remain escaped in issue register',()=>{
 const p={lines:[]};
 const r=epEngineeringIssueRegisterV1({sections:{crossView:{issues:[{code:'TEST',level:'BLOCKED',lineId:'<img src=x onerror=1>'}]}}},p);
 const html=epEngineeringIssueRegisterHtmlV1(r);
 assert.doesNotMatch(html,/<img src=/);
 assert.match(html,/&lt;img src=/);
});
test('CSV-unsafe identifiers are prefixed against formula execution',()=>{
 const p={lines:[]};
 const r=epEngineeringIssueRegisterV1({sections:{crossView:{issues:[{code:'TEST',level:'BLOCKED',lineId:'=1+1'}]}}},p);
 assert.match(epEngineeringIssueRegisterCsvV1(r),/"'=1\+1"/);
});
test('legacy issue register calls without project still preserve their navigation keys',()=>{
 const r=epEngineeringIssueRegisterV1({sections:{crossView:{issues:[{code:'TEST',level:'BLOCKED',lineId:'L1'}]}}});
 assert.equal(r.entries.find(x=>x.code==='TEST').circuitId,'L1');
});

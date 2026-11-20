'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epEngineeringBundleV1}=require('../engineering-bundle-v1.js');
const {epEngineeringPrintV1}=require('../engineering-print-v1.js');
const base=()=>({title:'Review board',railCount:1,railCapacity:12,
 lines:[{id:'L1',phase:'L1',catalogSku:'CH-814014',modules:1,
  articleReplacementReview:{required:true,from:'EA-286533',to:'CH-814014',
   warnings:['ICU_IS_NOT_ICN','BODY_GEOMETRY_INCOMPLETE'],engineeringApproved:true}}],
 branchDevices:[{id:'BD1',circuitId:'L1',modules:1}],sharedDevices:[]});
test('pending substitution is independently visible in export and never approved',()=>{
 const project=base(),before=JSON.stringify(project);
 const r=epEngineeringBundleV1(project,()=>null),audit=r.sections.replacementReview;
 assert.equal(audit.rows.length,1);
 assert.equal(audit.status,'UNKNOWN');
 assert.equal(audit.rows[0].from,'EA-286533');
 assert.equal(audit.rows[0].to,'CH-814014');
 assert.equal(audit.engineeringApproved,false);
 assert.equal(r.engineeringApproved,false);
 assert.equal(JSON.stringify(project),before);
 const html=epEngineeringPrintV1(r);
 assert.match(html,/Изменения аппаратов/);
 assert.match(html,/ICU_IS_NOT_ICN/);
 assert.match(html,/BODY_GEOMETRY_INCOMPLETE/);
 assert.match(html,/EA-286533/);
});
test('a stale replacement-to-current mapping is blocking in bundle',()=>{
 const project=base();project.lines[0].catalogSku='HA-MBN116';
 const r=epEngineeringBundleV1(project,()=>null);
 assert.equal(r.sections.replacementReview.status,'BLOCKED');
 assert.ok(r.sections.replacementReview.issues.some(x=>x.code==='REPLACEMENT_CURRENT_ARTICLE_MISMATCH'&&x.level==='BLOCKED'));
 assert.ok(r.blockedSections.includes('replacementReview'));
 assert.equal(r.overallStatus,'BLOCKED');
});
test('report markup escapes untrusted replacement warning text',()=>{
 const project=base();
 project.lines[0].articleReplacementReview.warnings.push('<script>alert(1)</script>');
 const html=epEngineeringPrintV1(epEngineeringBundleV1(project,()=>null));
 assert.doesNotMatch(html,/<script>/);
 assert.match(html,/&lt;script&gt;/);
});
test('projects without substitution history retain an empty unknown audit',()=>{
 const project=base();delete project.lines[0].articleReplacementReview;
 const r=epEngineeringBundleV1(project,()=>null);
 assert.equal(r.sections.replacementReview.rows.length,0);
 assert.equal(r.sections.replacementReview.status,'UNKNOWN');
});

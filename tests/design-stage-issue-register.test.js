'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
global.epDesignStageScopeV1=require('../design-stage-scope-v1.js').epDesignStageScopeV1;
const {epEngineeringIssueRegisterV1:report,epEngineeringIssueRegisterHtmlV1:html}=
 require('../engineering-issue-register-v1.js');
const names=['designWorkQueue','designReview','cableReference','designEvidence',
 'dossier','bom','board','layoutAlternatives','protection','crossView',
 'wiringTrace','neutralSegregation','neutralWireIsolation','singleLine','engineering'];
const b=()=>({sections:Object.fromEntries(names.map(x=>[x,{issues:[]}]))});
const p=()=>({designStageV1:'PRELIMINARY',lines:[{id:'L1'}]});
test('optional manufacturer provenance stays accessible but does not count as design failure',()=>{
 const bundle=b();bundle.sections.engineering.issues=[
  {code:'CATALOG_SOURCE_REVIEW_NOT_RECORDED',level:'UNKNOWN'},
  {code:'CATALOG_USER_DECLARATION_NOT_INDEPENDENTLY_VERIFIED',level:'UNKNOWN'},
  {code:'IN_GT_IZ',level:'BLOCKED',lineId:'L1'}];
 const x=report(bundle,p());
 assert.equal(x.counts.DEFERRED,2);
 assert.equal(x.counts.BLOCKED,1);
 assert.equal(x.entries[0].code,'IN_GT_IZ');
 assert.equal(x.deferred.length,2);
 assert.equal(x.status,'BLOCKED');
});
test('unknown route study on early-stage panel is deferred, not a missing prerequisite',()=>{
 const bundle=b();bundle.sections.engineering.issues=[
  {code:'FAULT_ROUTE_INPUT_MISSING',level:'UNKNOWN'},
  {code:'MAX_FAULT_INPUT_MISSING',level:'UNKNOWN'}];
 const x=report(bundle,p());
 assert.equal(x.counts.UNKNOWN,0);assert.equal(x.counts.DEFERRED,2);
 assert.equal(x.ready_for_installation,false);
});
test('detailed-stage route study still appears as unresolved if appropriate',()=>{
 const bundle=b();bundle.sections.engineering.issues=[
  {code:'FAULT_ROUTE_INPUT_MISSING',level:'UNKNOWN'}];
 const project=p();project.designStageV1='DETAILED';
 const x=report(bundle,project);
 assert.equal(x.counts.UNKNOWN,1);assert.equal(x.counts.DEFERRED,0);
});
test('selectivity and external network evidence are only required when requested',()=>{
 const bundle=b();bundle.sections.engineering.issues=[
  {code:'PROTECTION_MATRIX_COORDINATION_MANUFACTURER_SOURCE_REQUIRED',level:'UNKNOWN'},
  {code:'PROTECTION_MATRIX_INCOMING_MAX_STUDY_REQUIRED',level:'UNKNOWN'}];
 assert.equal(report(bundle,p()).counts.DEFERRED,2);
 const project=p();project.designRequirementsV1={selectivity:true,externalNetwork:true};
 const x=report(bundle,project);
 assert.equal(x.counts.UNKNOWN,2);assert.equal(x.counts.DEFERRED,0);
});
test('an actual electrical contradiction is never postponed on any stage',()=>{
 for(const stage of ['PRELIMINARY','BOARD_DESIGN','DETAILED']){
  const bundle=b();bundle.sections.engineering.issues=[
   {code:'MAX_FAULT_INPUT_MISSING',level:'BLOCKED',lineId:'L1'}];
  const project=p();project.designStageV1=stage;
  const x=report(bundle,project);
  assert.equal(x.counts.BLOCKED,1);
 }
});
test('HTML shows deferred count and preserves safe output',()=>{
 const bundle=b();bundle.sections.engineering.issues=[
  {code:'CATALOG_SOURCE_REVIEW_NOT_RECORDED',level:'UNKNOWN'}];
 const x=report(bundle,p());
 assert.match(html(x),/отложено 1/);
});

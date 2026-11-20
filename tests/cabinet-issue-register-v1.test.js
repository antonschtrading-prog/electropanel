'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
global.epDraftBoardPlanV1=require('../draft-board-plan-v1').epDraftBoardPlanV1;
global.epDinPhysicalEnvelopeV1=require('../din-physical-envelope-v1').epDinPhysicalEnvelopeV1;
global.epCabinetFitAuditV1=require('../cabinet-geometry-v1').epCabinetFitAuditV1;
const {epEngineeringBundleV1}=require('../engineering-bundle-v1');
const {epEngineeringIssueRegisterV1}=require('../engineering-issue-register-v1');
const project=()=>({title:'Test',railCount:1,railCapacity:6,lines:[{id:'L1',modules:1}],
 sharedDevices:[],designStageV1:'PRELIMINARY'});
const cabinet=()=>({version:1,source:'USER_DECLARED',
 interior:{widthMm:300,heightMm:250,depthMm:120},
 zones:[{railIndex:0,xMm:20,yMm:30,widthMm:260,heightMm:100}]});
test('bundle keeps cabinet fit as a separate draft section',()=>{
 const r=epEngineeringBundleV1(project(),()=>null);
 assert.equal(r.statuses.cabinetFit,'NOT_CONFIGURED');
 assert.equal(r.sections.cabinetFit.engineeringApproved,false);
});
test('preliminary project defers undeclared cabinet instead of calling fit approved',()=>{
 const p=project(),b=epEngineeringBundleV1(p,()=>null);
 const r=epEngineeringIssueRegisterV1(b,p);
 assert.ok(r.deferred.some(x=>x.section==='cabinetFit'&&x.code==='CABINET_GEOMETRY_NOT_DECLARED'));
 assert.equal(r.entries.some(x=>x.code==='CABINET_GEOMETRY_NOT_DECLARED'),false);
});
test('an invalid cabinet is always a blocker in issue register',()=>{
 const p=project();p.cabinetGeometryV1=cabinet();
 p.cabinetGeometryV1.zones[0].widthMm=10;
 const r=epEngineeringIssueRegisterV1(epEngineeringBundleV1(p,()=>null),p);
 assert.ok(r.entries.some(x=>x.section==='cabinetFit'&&x.level==='BLOCKED'));
});
test('all reports remain draft and do not mutate input',()=>{
 const p=project();p.cabinetGeometryV1=cabinet();
 const before=JSON.stringify(p);
 const r=epEngineeringIssueRegisterV1(epEngineeringBundleV1(p,()=>null),p);
 assert.equal(r.engineeringApproved,false);
 assert.equal(JSON.stringify(p),before);
});

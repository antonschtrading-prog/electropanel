'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
global.epLoadCurrentV1=require('../load-current-v1.js').epLoadCurrentV1;
global.epProtectiveDeviceShortlistV1=require('../protective-device-shortlist-v1.js').epProtectiveDeviceShortlistV1;
global.epSingleLineDraftV1=require('../single-line-draft-v1.js').epSingleLineDraftV1;
global.epDraftBoardPlanV1=require('../draft-board-plan-v1.js').epDraftBoardPlanV1;
global.epDraftBomV1=require('../draft-bom-v1.js').epDraftBomV1;
const workflow=require('../project-automation-workflow-v1.js');
global.epWorkflowPreviewV1=workflow.epWorkflowPreviewV1;
global.epWorkflowConsumerAuditV1=workflow.epWorkflowConsumerAuditV1;
const bundle=require('../engineering-bundle-v1.js').epEngineeringBundleV1;
const print=require('../engineering-print-v1.js').epEngineeringPrintV1;
const sample=()=>({title:'Retail Board',railCount:1,railCapacity:12,
 lines:[{id:'C1',name:'Lighting',phase:'L1',power:2,modules:1}],
 loads:[{id:'X1',name:'Light',circuitId:'C1',powerKw:1.5}],
 branchDevices:[],sharedDevices:[]});
test('mismatched consumer power is traceable in engineering dossier without mutation',()=>{
 const p=sample(),before=JSON.stringify(p),b=bundle(p,()=>null);
 const a=b.sections.consumerReconciliation;
 assert.equal(a.status,'REVIEW');
 assert.equal(a.rows[0].comparison,'DIFFERENT_DECLARED_POWER');
 assert.equal(a.summary.powerDisagreements,1);
 assert.ok(a.auditIssues.some(x=>x.code==='WORKFLOW_CONSUMER_CIRCUIT_POWER_DIFFER'));
 assert.ok(b.sections.workflowPreview.issues.some(x=>x.code==='WORKFLOW_CONSUMER_CIRCUIT_POWER_DIFFER'));
 assert.deepEqual(a.issues,[],'do not duplicate issue-register entries');
 assert.equal(JSON.stringify(p),before);
 assert.equal(b.engineeringApproved,false);
 const h=print(b);
 assert.match(h,/Сверка мощностей потребителей и электрических линий/);
 assert.match(h,/DIFFERENT_DECLARED_POWER/);
 assert.match(h,/не автоматическое изменение данных/);
});
test('dossier prints honest unrepresented state on projects without consumers',()=>{
 const p=sample();p.loads=[];
 const b=bundle(p,()=>null);
 assert.equal(b.sections.consumerReconciliation.status,'REVIEW');
 assert.equal(b.sections.consumerReconciliation.summary.unrepresentedCircuits,1);
 assert.match(print(b),/NO_CONSUMERS_LINKED/);
});
test('consumer reconciliation CSV neutralizes formulas, retains counts and status',()=>{
 const a=workflow.epWorkflowConsumerAuditV1({
  lines:[{id:'=CMD',power:2}],
  loads:[{id:'L1',circuitId:'=CMD',powerKw:2}]});
 const csv=workflow.epWorkflowConsumerAuditCsvV1(a);
 assert.ok(csv.startsWith('\uFEFF'));
 assert.match(csv,/"'=CMD"/);
 assert.match(csv,/"MATCH"/);
 assert.match(csv,/"2"/);
});
test('large untrusted model is blocked without iterating an unbounded list',()=>{
 const p=sample();p.lines=Array.from({length:401},(_,i)=>({id:'L'+i,power:1}));
 const a=workflow.epWorkflowConsumerAuditV1(p);
 assert.equal(a.status,'BLOCKED');
 assert.equal(a.engineeringApproved,false);
});
test('unprovided consumer power is not guessed and is marked in report',()=>{
 const p=sample();p.loads[0].powerKw=null;
 const b=bundle(p,()=>null);
 assert.equal(b.sections.consumerReconciliation.rows[0].comparison,'INSUFFICIENT_DATA');
 assert.equal(b.sections.consumerReconciliation.rows[0].powerComplete,false);
 assert.match(print(b),/Не все мощности заданы/);
});

test('workflow controls expose an accessible consumer reconciliation export',()=>{
 const r=workflow.epWorkflowPreviewV1(sample(),()=>null,[],{
  singleVoltageV:230,threeVoltageV:400,powerFactor:0.9,efficiency:1,demandFactor:1
 });
 const html=workflow.epWorkflowHtmlV1(r,{});
 assert.match(html,/id="workflowConsumerCsvBtn"/);
 assert.match(html,/Сверка потребителей CSV/);
});

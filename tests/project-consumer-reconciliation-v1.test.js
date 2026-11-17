'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
global.epLoadCurrentV1=require('../load-current-v1.js').epLoadCurrentV1;
global.epProtectiveDeviceShortlistV1=require('../protective-device-shortlist-v1.js').epProtectiveDeviceShortlistV1;
global.epSingleLineDraftV1=require('../single-line-draft-v1.js').epSingleLineDraftV1;
global.epDraftBoardPlanV1=require('../draft-board-plan-v1.js').epDraftBoardPlanV1;
global.epDraftBomV1=require('../draft-bom-v1.js').epDraftBomV1;
const {epWorkflowConsumerAuditV1,epWorkflowPreviewV1,epWorkflowHtmlV1}=require('../project-automation-workflow-v1.js');
const project=()=>({title:'Shop',railCount:1,railCapacity:12,earthing:'TN-S',
 lines:[{id:'C1',name:'Lights',power:1.5,phase:'L1',modules:1},
        {id:'C2',name:'Sockets',power:2,phase:'L2',modules:1}],
 loads:[{id:'P1',name:'Light row',circuitId:'C1',powerKw:1.0},
        {id:'P2',name:'Light row 2',circuitId:'C1',powerKw:0.5},
        {id:'P3',name:'Sockets',circuitId:'C2',powerKw:2}],
 sharedDevices:[],branchDevices:[]});
const inputs={singleVoltageV:230,threeVoltageV:400,powerFactor:0.9,efficiency:1,demandFactor:1};
test('matched consumer sums are read-only and do not rewrite circuit power',()=>{
 const p=project(),before=JSON.stringify(p),r=epWorkflowConsumerAuditV1(p);
 assert.equal(r.status,'MATCHED');assert.equal(r.rows[0].comparison,'MATCH');
 assert.equal(r.rows[0].consumerPowerKw,1.5);
 assert.equal(r.summary.matchedConsumers,3);
 assert.equal(r.autoGroupApplied,false);
 assert.equal(JSON.stringify(p),before);
});
test('mismatch is advisory and original circuit calculation remains declared',()=>{
 const p=project();p.loads[0].powerKw=0.2;
 const r=epWorkflowConsumerAuditV1(p);
 assert.equal(r.status,'REVIEW');assert.equal(r.summary.powerDisagreements,1);
 assert.equal(r.rows[0].declaredPowerKw,1.5);
 const w=epWorkflowPreviewV1(p,()=>null,[],inputs);
 assert.ok(w.issues.some(x=>x.code==='WORKFLOW_CONSUMER_CIRCUIT_POWER_DIFFER'));
 assert.equal(w.rows[0].powerKw,1.5);
 assert.equal(w.issues.find(x=>x.code==='WORKFLOW_CONSUMER_CIRCUIT_POWER_DIFFER').level,'UNKNOWN');
 assert.match(epWorkflowHtmlV1(w,inputs),/расхождения заявленных мощностей/);
});
test('bad consumer identity and orphans block, without silently regrouping',()=>{
 const p=project();
 p.loads.push({id:'P1',name:'Duplicate',circuitId:'C1',powerKw:1});
 p.loads.push({id:'ORPHAN',name:'Orphan',circuitId:'missing',powerKw:1});
 const r=epWorkflowConsumerAuditV1(p);
 assert.equal(r.status,'BLOCKED');
 assert.equal(r.summary.duplicateConsumers,1);
 assert.equal(r.summary.orphanConsumers,1);
 const w=epWorkflowPreviewV1(p,()=>null,[],inputs);
 assert.equal(w.status,'BLOCKED');
 assert.equal(w.summary.unassignedLoads,1);
 assert.ok(w.issues.some(x=>x.code==='WORKFLOW_CONSUMERS_WITHOUT_CIRCUIT'));
});
test('missing power cannot produce false matching status',()=>{
 const p=project();p.loads[0].powerKw=null;
 const r=epWorkflowConsumerAuditV1(p);
 assert.equal(r.rows[0].comparison,'INSUFFICIENT_DATA');
 assert.equal(r.summary.invalidConsumerPower,1);
 assert.equal(r.status,'REVIEW');
});
test('empty links show no consumer coverage, not a match',()=>{
 const p=project();p.loads=[];
 const r=epWorkflowConsumerAuditV1(p);
 assert.equal(r.summary.unrepresentedCircuits,2);
 assert.ok(r.rows.every(x=>x.comparison==='NO_CONSUMERS_LINKED'));
});
test('duplicate or invalid circuit identities are rejected',()=>{
 const p=project();p.lines[1].id='C1';
 const r=epWorkflowConsumerAuditV1(p);
 assert.equal(r.status,'BLOCKED');
 assert.ok(r.issues.some(x=>x.code==='WORKFLOW_CIRCUIT_ID_INVALID_OR_DUPLICATE'));
});
test('malformed model returns blocked result instead of throwing',()=>{
 const r=epWorkflowConsumerAuditV1({lines:[],loads:null});
 assert.equal(r.status,'BLOCKED');assert.equal(r.engineeringApproved,false);
});
test('input power is not normalized, estimated or approved by the audit',()=>{
 const p=project();p.lines[0].power=null;
 const r=epWorkflowConsumerAuditV1(p);
 assert.equal(r.rows[0].comparison,'INSUFFICIENT_DATA');
 assert.equal(r.rows[0].declaredPowerKw,null);
 assert.equal(r.engineeringApproved,false);
 assert.equal(r.ready_for_installation,false);
});

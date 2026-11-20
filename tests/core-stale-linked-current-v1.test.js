'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
global.epLoadCurrentV1=require('../load-current-v1.js').epLoadCurrentV1;
global.epApplyLoadCurrentV1=require('../load-current-v1.js').epApplyLoadCurrentV1;
global.epProtectiveDeviceShortlistV1=require('../protective-device-shortlist-v1.js').epProtectiveDeviceShortlistV1;
global.epSingleLineDraftV1=require('../single-line-draft-v1.js').epSingleLineDraftV1;
global.epDraftBoardPlanV1=require('../draft-board-plan-v1.js').epDraftBoardPlanV1;
global.epDraftBomV1=require('../draft-bom-v1.js').epDraftBomV1;
const wf=require('../project-automation-workflow-v1.js');
const inputs=()=>({singleVoltageV:230,threeVoltageV:400,powerFactor:.9,efficiency:1,demandFactor:1});
const article={kind:'MCB',sku:'MCB-C16',maker:'Sample',series:'C',poles:1,modules:1,widthMm:18,inA:16,icnKa:6,icnVoltageV:230,icnStandard:'IEC 60898-1',verificationStatus:'VERIFIED'};
const catalogue=[{id:'MCB-C16',device:article}];
const base=()=>({title:'Shop',railCount:1,railCapacity:12,earthing:'TN-S',
 lines:[{id:'L1',name:'Lighting',phase:'L1',power:2,modules:1}],
 branchDevices:[{id:'B1',circuitId:'L1',modules:1}],
 loads:[{id:'LD1',circuitId:'L1',name:'Lighting',powerKw:2}],sharedDevices:[]});
function linked(){return wf.epWorkflowApplyCurrentsV1(base(),inputs()).project;}
function preview(p,params=inputs()){return wf.epWorkflowPreviewV1(p,()=>article,catalogue,params);}
test('matching linked Ib stays available to provisional shortlist',()=>{
 const r=preview(linked());assert.equal(r.summary.staleLinkedCurrents,0);
 assert.equal(r.rows[0].ibSource,'EXISTING');
 assert.equal(r.rows[0].calculationStatus,'CALCULATED');
});
test('changed power factor cannot silently shortlist from old linked current',()=>{
 const p=linked(),before=JSON.stringify(p);
 const r=preview(p,{...inputs(),powerFactor:.65});
 assert.equal(r.summary.staleLinkedCurrents,1);
 assert.equal(r.rows[0].ibSource,'STALE_LINKED_CURRENT');
 assert.equal(r.rows[0].calculationStatus,'STALE_REVIEW');
 assert.equal(r.rows[0].candidatesCount,0);
 assert.equal(r.rows[0].proposedSku,null);
 assert.equal(r.steps.find(x=>x.key==='LOADS').status,'PARTIAL');
 assert.ok(r.issues.some(x=>x.code==='WORKFLOW_LINKED_CURRENT_REVIEW_REQUIRED'));
 assert.equal(JSON.stringify(p),before);
});
test('user can explicitly recalculate linked Ib and clear mismatch in preview',()=>{
 const p=linked(),changed={...inputs(),powerFactor:.7};
 const stale=preview(p,changed);assert.equal(stale.summary.staleLinkedCurrents,1);
 const next=wf.epWorkflowApplyCurrentsV1(p,changed).project;
 const r=preview(next,changed);
 assert.equal(r.summary.staleLinkedCurrents,0);
 assert.equal(r.rows[0].ibSource,'EXISTING');
 assert.equal(r.rows[0].calculationStatus,'CALCULATED');
 assert.equal(next.lines[0].calculationReview.required,true);
});
test('explicit stale flag suppresses shortlist even with unchanged shared inputs',()=>{
 const p=linked();p.lines[0].loadCurrentCalculation.stale=true;
 const r=preview(p);
 assert.equal(r.rows[0].proposedSku,null);
 assert.equal(r.rows[0].ibSource,'STALE_LINKED_CURRENT');
});
test('manual engineer-defined Ib is not classified stale based on common factor edits',()=>{
 const p=linked();p.lines[0].loadCurrentCalculation.powerSource='manual';
 const r=preview(p,{...inputs(),powerFactor:.6});
 assert.equal(r.summary.staleLinkedCurrents,0);
 assert.equal(r.rows[0].ibSource,'EXISTING');
});
test('overwritten linked Ib is flagged even if user-controlled provenance was not cleared',()=>{
 const p=linked();p.lines[0].overloadInput.ibA=12;
 const r=preview(p);assert.equal(r.summary.staleLinkedCurrents,1);
 assert.equal(r.rows[0].proposedSku,null);
});
test('different circuit power makes saved linked Ib stale in preview',()=>{
 const p=linked();p.lines[0].power=4;
 const r=preview(p);assert.equal(r.summary.staleLinkedCurrents,1);
 assert.equal(r.rows[0].calculationStatus,'STALE_REVIEW');
});
test('without new shared inputs an already flagged stale calculation remains visible but not a candidate',()=>{
 const p=linked();p.lines[0].loadCurrentCalculation.stale=true;
 const r=preview(p,null);
 assert.equal(r.rows[0].ibSource,'STALE_LINKED_CURRENT');
 assert.equal(r.rows[0].proposedSku,null);
});
test('ordinary manually stated current without link provenance stays available',()=>{
 const p=base();p.lines[0].overloadInput={ibA:8};
 const r=preview(p,{...inputs(),powerFactor:.8});
 assert.equal(r.summary.staleLinkedCurrents,0);
 assert.equal(r.rows[0].ibSource,'EXISTING');
});

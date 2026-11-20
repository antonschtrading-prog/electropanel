'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {epWorkflowPreviewV1,epWorkflowArticleChoiceV1,epWorkflowCsvV1,epWorkflowHtmlV1}=require('../project-automation-workflow-v1');
const line={id:'L1',name:'Lighting',phase:'L1',power:1,catalogSku:'SKU-A',overloadInput:{ibA:6}};
const project=(branches)=>({lines:[{...line}],loads:[],sharedDevices:[],branchDevices:branches});
const preview=p=>epWorkflowPreviewV1(p,()=>null,[]);
test('conflicting branch article blocks engineering workflow without overwriting source',()=>{
 const p=project([{id:'Q1',circuitId:'L1',catalogSku:'SKU-B'}]);
 const before=JSON.stringify(p),report=preview(p);
 assert.equal(report.status,'BLOCKED');
 assert.equal(report.summary.articleConflicts,1);
 assert.equal(report.rows[0].selectedSku,'SKU-A');
 assert.equal(report.rows[0].branchSku,'SKU-B');
 assert.ok(report.issues.some(x=>x.code==='WORKFLOW_CIRCUIT_BRANCH_ARTICLE_CONFLICT'&&x.level==='BLOCKED'));
 assert.equal(JSON.stringify(p),before);
});
test('matching circuit and branch article has no cross-view conflict',()=>{
 const report=preview(project([{id:'Q1',circuitId:'L1',catalogSku:'SKU-A'}]));
 assert.equal(report.summary.articleConflicts,0);
 assert.equal(report.rows[0].articleConflict,false);
});
test('duplicate branch assignments block even when article values match',()=>{
 const report=preview(project([{id:'Q1',circuitId:'L1',catalogSku:'SKU-A'},{id:'Q2',circuitId:'L1',catalogSku:'SKU-A'}]));
 assert.equal(report.status,'BLOCKED');
 assert.equal(report.summary.duplicateBranchAssignments,1);
 assert.equal(report.rows[0].branchAssignments,2);
});
test('engineering CSV contains both article declarations and discrepancy',()=>{
 const csv=epWorkflowCsvV1(preview(project([{id:'Q1',circuitId:'L1',catalogSku:'SKU-B'}])));
 assert.match(csv,/Branch SKU/);
 assert.match(csv,/Article conflict/);
 assert.match(csv,/SKU-A/);
 assert.match(csv,/SKU-B/);
 assert.match(csv,/BLOCKED/);
});
test('engineering preview displays article conflict without offering an unsafe action',()=>{
 const html=epWorkflowHtmlV1(preview(project([{id:'Q1',circuitId:'L1',catalogSku:'SKU-B'}])));
 assert.match(html,/КОНФЛИКТ/);
 assert.match(html,/SKU-B/);
 assert.doesNotMatch(html,/data-workflow-article=/);
});
test('article assignment refuses a contradictory existing board device',()=>{
 const p=project([{id:'Q1',circuitId:'L1',catalogSku:'SKU-B'}]);
 assert.throws(()=>epWorkflowArticleChoiceV1(p,'L1','SKU-A',[]),/WORKFLOW_ARTICLE_BRANCH_MISMATCH/);
});
test('article assignment refuses duplicate board devices before shortlist',()=>{
 const p=project([{id:'Q1',circuitId:'L1',catalogSku:'SKU-A'},{id:'Q2',circuitId:'L1',catalogSku:'SKU-A'}]);
 assert.throws(()=>epWorkflowArticleChoiceV1(p,'L1','SKU-A',[]),/WORKFLOW_ARTICLE_DUPLICATE_BRANCH_ASSIGNMENT/);
});

test('orphan branch apparatus blocks workflow and remains available for repair',()=>{
 const p=project([{id:'Q404',circuitId:'MISSING',catalogSku:'SKU-B'}]);
 const report=preview(p);
 assert.equal(report.status,'BLOCKED');
 assert.equal(report.summary.orphanBranchDevices,1);
 assert.ok(report.issues.some(x=>x.code==='WORKFLOW_ORPHAN_BRANCH_DEVICE'));
 assert.equal(p.branchDevices[0].circuitId,'MISSING');
});

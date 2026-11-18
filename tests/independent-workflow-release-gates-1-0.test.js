'use strict';
// Independent release characterization: each test makes an observable discrepancy explicit.
// These tests are not fixes and are not permission to release inconsistent artifacts.
const {test}=require('node:test');
const assert=require('node:assert/strict');
global.epLoadCurrentV1=require('../load-current-v1.js').epLoadCurrentV1;
global.epApplyLoadCurrentV1=require('../load-current-v1.js').epApplyLoadCurrentV1;
global.epProtectiveDeviceShortlistV1=require('../protective-device-shortlist-v1.js').epProtectiveDeviceShortlistV1;
global.epSingleLineDraftV1=require('../single-line-draft-v1.js').epSingleLineDraftV1;
global.epDraftBoardPlanV1=require('../draft-board-plan-v1.js').epDraftBoardPlanV1;
global.epDraftBomV1=require('../draft-bom-v1.js').epDraftBomV1;
const {epWorkflowPreviewV1}=require('../project-automation-workflow-v1.js');
const {epSingleLineDraftV1}=require('../single-line-draft-v1.js');
const {epDraftBoardPlanV1}=require('../draft-board-plan-v1.js');
const {epDraftBomV1,epDraftBomCsvV1}=require('../draft-bom-v1.js');
const inputs={singleVoltageV:230,threeVoltageV:400,powerFactor:0.9,efficiency:1,demandFactor:1};
const lookup=sku=>({sku,kind:'MCB',maker:'Audit',series:'Fixture',modules:1,widthMm:18,poles:1,inA:16,icnKa:6,verificationStatus:'UNVERIFIED'});
const catalog=[{id:'A',device:lookup('A')},{id:'B',device:lookup('B')}];
function project(){return {railCount:1,railCapacity:8,lines:[{id:'L1',name:'Lighting',phase:'L1',power:1,modules:1,catalogSku:'A'}],
branchDevices:[{id:'Q1',circuitId:'L1',modules:1}],sharedDevices:[],loads:[{id:'C1',circuitId:'L1',name:'Light',powerKw:1}]};}
test('DEFECT-02 regression: workflow propagates schematic BLOCKED into overall BLOCKED',()=>{
 const p=project();p.sharedDevices.push({id:'R1',modules:2,templateId:'RCD_2P',circuitIds:['MISSING']});
 const schematic=epSingleLineDraftV1(p,lookup);
 const board=epDraftBoardPlanV1(p,lookup);
 const bom=epDraftBomV1(p,lookup);
 const workflow=epWorkflowPreviewV1(p,lookup,catalog,inputs);
 assert.equal(schematic.status,'BLOCKED');
 assert.ok(schematic.issues.some(x=>x.code==='SINGLE_LINE_GROUP_ORPHAN'));
 assert.notEqual(board.status,'BLOCKED');
 assert.notEqual(bom.status,'BLOCKED');
 assert.equal(workflow.steps.find(x=>x.key==='SINGLE_LINE').status,'BLOCKED');
 assert.equal(workflow.status,'BLOCKED');
 assert.ok(workflow.issues.some(x=>x.code==='WORKFLOW_SCHEMATIC_CONFLICT'&&x.level==='BLOCKED'));
 assert.equal(workflow.engineeringApproved,false);
});
test('DEFECT-01 additional: mismatched line and branch SKU only UNKNOWN in BOM',()=>{
 const p=project();p.branchDevices[0].catalogSku='B';
 const report=epDraftBomV1(p,lookup);
 assert.equal(report.status,'UNKNOWN');
 assert.ok(report.issues.some(x=>x.code==='BRANCH_SKU_OVERRIDES_LINE_FALLBACK'&&x.level==='UNKNOWN'));
 assert.equal(report.items[0].key,'B');
 const scheme=epSingleLineDraftV1(p,lookup);
 assert.equal(scheme.nodes.find(x=>x.lineId==='L1').sku,'A');
});
test('DEFECT-01 additional: exported BOM CSV carries B while drawing node carries A',()=>{
 const p=project();p.branchDevices[0].catalogSku='B';
 const bom=epDraftBomV1(p,lookup);
 const csv=epDraftBomCsvV1(bom);
 const scheme=epSingleLineDraftV1(p,lookup);
 assert.ok(csv.includes('"B"'));
 assert.equal(scheme.nodes.find(x=>x.lineId==='L1').sku,'A');
});
test('workflow status does propagate a blocking DIN issue',()=>{
 const p=project();p.railCapacity=0;
 const result=epWorkflowPreviewV1(p,lookup,catalog,inputs);
 assert.equal(result.status,'BLOCKED');
 assert.ok(result.issues.some(x=>x.code==='WORKFLOW_BOARD_CONFLICT'));
});
test('workflow status does propagate a blocking BOM issue',()=>{
 const p=project();p.branchDevices.push({id:'Q2',circuitId:'L1',modules:1});
 const result=epWorkflowPreviewV1(p,lookup,catalog,inputs);
 assert.equal(result.status,'BLOCKED');
 assert.ok(result.issues.some(x=>x.code==='WORKFLOW_BOM_CONFLICT'));
});

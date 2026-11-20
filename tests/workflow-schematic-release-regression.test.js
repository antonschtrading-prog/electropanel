'use strict';
// Critical workflow release regression: a blocked schematic must block the
// aggregate workflow even if the BOM and DIN preview remain individually valid.
const {test}=require('node:test');
const assert=require('node:assert/strict');
global.epLoadCurrentV1=require('../load-current-v1.js').epLoadCurrentV1;
global.epProtectiveDeviceShortlistV1=require('../protective-device-shortlist-v1.js').epProtectiveDeviceShortlistV1;
global.epSingleLineDraftV1=require('../single-line-draft-v1.js').epSingleLineDraftV1;
global.epDraftBoardPlanV1=require('../draft-board-plan-v1.js').epDraftBoardPlanV1;
global.epDraftBomV1=require('../draft-bom-v1.js').epDraftBomV1;
const {epWorkflowPreviewV1}=require('../project-automation-workflow-v1.js');
const lookup=sku=>({sku,kind:'MCB',modules:1,widthMm:18,poles:1,inA:16,icnKa:6});
const inputs={singleVoltageV:230,threeVoltageV:400,powerFactor:.9,efficiency:1,demandFactor:1};
function project(){return {railCount:1,railCapacity:8,lines:[{id:'L1',name:'Lighting',phase:'L1',power:1,modules:1,catalogSku:'A'}],branchDevices:[{id:'Q1',circuitId:'L1',modules:1}],sharedDevices:[],loads:[{id:'C1',name:'Light',circuitId:'L1',powerKw:1}]};}
test('orphan shared RCD circuit blocks workflow, not just schematic',()=>{
 const p=project(),original=JSON.stringify(p);
 p.sharedDevices.push({id:'R1',modules:2,templateId:'RCD_2P',circuitIds:['MISSING']});
 const before=JSON.stringify(p);
 const report=epWorkflowPreviewV1(p,lookup,[{id:'A',device:lookup('A')}],inputs);
 assert.equal(report.steps.find(x=>x.key==='SINGLE_LINE').status,'BLOCKED');
 assert.equal(report.status,'BLOCKED');
 assert.ok(report.issues.some(x=>x.code==='WORKFLOW_SCHEMATIC_CONFLICT'&&x.level==='BLOCKED'));
 assert.equal(report.engineeringApproved,false);
 assert.equal(JSON.stringify(p),before);
 assert.notEqual(original,before);
});
test('normal incomplete draft remains editable and not falsely blocked',()=>{
 const p=project(),before=JSON.stringify(p);
 const report=epWorkflowPreviewV1(p,lookup,[{id:'A',device:lookup('A')}],inputs);
 assert.equal(report.status,'DRAFT');
 assert.ok(!report.issues.some(x=>x.code==='WORKFLOW_SCHEMATIC_CONFLICT'));
 assert.equal(report.engineeringApproved,false);
 assert.equal(JSON.stringify(p),before);
});

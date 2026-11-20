'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
global.epLoadCurrentV1=require('../load-current-v1.js').epLoadCurrentV1;
global.epApplyLoadCurrentV1=require('../load-current-v1.js').epApplyLoadCurrentV1;
global.epProtectiveDeviceShortlistV1=require('../protective-device-shortlist-v1.js').epProtectiveDeviceShortlistV1;
global.epSingleLineDraftV1=require('../single-line-draft-v1.js').epSingleLineDraftV1;
global.epDraftBoardPlanV1=require('../draft-board-plan-v1.js').epDraftBoardPlanV1;
global.epDraftBomV1=require('../draft-bom-v1.js').epDraftBomV1;
const wf=require('../project-automation-workflow-v1.js');
global.epWorkflowInputsV1=wf.epWorkflowInputsV1;
global.epWorkflowPreviewV1=wf.epWorkflowPreviewV1;
global.epEngineeringIssueRegisterV1=require('../engineering-issue-register-v1.js').epEngineeringIssueRegisterV1;
const restore=require('../project-state-v2.js').epRestoreProjectExtensionsV2;
const bundle=require('../engineering-bundle-v1.js').epEngineeringBundleV1;
const print=require('../engineering-print-v1.js').epEngineeringPrintV1;
const article={sku:'A',kind:'MCB',label:'C16',maker:'Example',
 series:'A',modules:1,poles:1,inA:16,icnKa:6,icnVoltageV:230,widthMm:18};
const lookup=()=>article;
const project=()=>({schema:'electropanel.web.preview.2',title:'Commercial board',earthing:'TN-S',
 railCount:1,railCapacity:12,
 lines:[{id:'L1',name:'Shop',phase:'L1',power:2,modules:1}],
 loads:[{id:'LD1',circuitId:'L1',name:'Shop',powerKw:2}],
 branchDevices:[{id:'B1',circuitId:'L1',modules:1}],sharedDevices:[],
 feedLinks:[],groupInputLinks:[]});
const inputs={singleVoltageV:230,threeVoltageV:null,powerFactor:.9,
 efficiency:1,demandFactor:1};
test('project saves shared calculation inputs and engineering dossier reuses connected workflow',()=>{
 const projectBefore=project();
 const computed=wf.epWorkflowApplyCurrentsV1(projectBefore,inputs);
 const target=project(),raw=computed.project;
 // The production import restores line.overloadInput in the core parser,
 // then project-state-v2 restores the extended calculated-current provenance.
 target.lines[0].overloadInput=JSON.parse(JSON.stringify(raw.lines[0].overloadInput));
 restore(raw,target);
 assert.deepEqual(target.workflowDesignInputsV1,inputs);
 assert.equal(projectBefore.lines[0].overloadInput,undefined);
 assert.equal(target.workflowDesignInputsV1.threeVoltageV,null);
 const b=bundle(target,lookup);
 assert.equal(b.sections.workflowPreview.rows.length,1);
 assert.equal(b.sections.workflowPreview.rows[0].ibSource,'EXISTING');
 assert.equal(b.sections.workflowPreview.steps.length,5);
 assert.equal(b.sections.workflowPreview.engineeringApproved,false);
 assert.match(print(b),/Единый предварительный маршрут: нагрузки, токи и аппараты/);
 assert.equal(b.ready_for_installation,false);
});
test('bad shared voltage, injected approval and unsupported keys cannot be imported',()=>{
 for(const value of [
  {...inputs,singleVoltageV:'wrong'},
  {...inputs,engineeringApproved:true},
  {...inputs,powerFactor:2},
  {...inputs,singleVoltageV:null},
  []]){
  assert.throws(()=>restore({...project(),workflowDesignInputsV1:value},project()),/WORKFLOW_INPUT/);
 }
});
test('older project without workflow inputs imports with no phantom engineering assumptions',()=>{
 const raw=project(),target=project();restore(raw,target);
 assert.equal(target.workflowDesignInputsV1,undefined);
 const b=bundle(target,lookup);
 assert.equal(b.sections.workflowPreview.summary.calculated,0);
 assert.equal(b.sections.workflowPreview.summary.missingInput,1);
});

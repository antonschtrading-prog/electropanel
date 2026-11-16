'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
global.epLoadCurrentV1=require('../load-current-v1.js').epLoadCurrentV1;
global.epApplyLoadCurrentV1=require('../load-current-v1.js').epApplyLoadCurrentV1;
global.epProtectiveDeviceShortlistV1=require('../protective-device-shortlist-v1.js').epProtectiveDeviceShortlistV1;
global.epSingleLineDraftV1=require('../single-line-draft-v1.js').epSingleLineDraftV1;
global.epDraftBoardPlanV1=require('../draft-board-plan-v1.js').epDraftBoardPlanV1;
global.epDraftBomV1=require('../draft-bom-v1.js').epDraftBomV1;
const api=require('../project-automation-workflow-v1.js');
const inputs=()=>({singleVoltageV:230,threeVoltageV:400,powerFactor:0.9,
 efficiency:1,demandFactor:1});
const article={kind:'MCB',sku:'MCB-C16',maker:'Example',series:'C',
 poles:1,modules:1,widthMm:18,inA:16,icnKa:6,icnVoltageV:230,
 icnStandard:'IEC 60898-1',verificationStatus:'VERIFIED'};
const catalogue=[{id:'MCB-C16',device:article}];
const project=()=>({schema:'electropanel.web.preview.1',title:'Retail panel',
 railCount:1,railCapacity:12,earthing:'TN-S',
 lines:[{id:'L1',name:'Lighting',phase:'L1',power:1.5,modules:1,
  catalogSku:'MCB-C16'},{id:'L2',name:'Sockets',phase:'L2',power:2.0,
  modules:1,overloadInput:{ibA:9.5}},{id:'L3',name:'Three-phase motor',
  phase:'3Ф',power:5,modules:3}],
 branchDevices:[{id:'B1',circuitId:'L1',modules:1},
 {id:'B2',circuitId:'L2',modules:1},{id:'B3',circuitId:'L3',modules:3}],
 sharedDevices:[],loads:[{id:'LD1',name:'Lighting',circuitId:'L1',powerKw:1.5},
 {id:'LD2',name:'Sockets',circuitId:'L2',powerKw:2},
 {id:'LD3',name:'Motor',circuitId:'L3',powerKw:5}]});
test('one overview reads existing load, shortlist, schematic, board and BOM without mutation',()=>{
 const p=project(),before=JSON.stringify(p);
 const r=api.epWorkflowPreviewV1(p,()=>article,catalogue,inputs());
 assert.equal(r.rows.length,3);assert.equal(r.steps.length,5);
 assert.equal(r.summary.consumers,3);
 assert.equal(r.summary.calculated,2);
 assert.equal(r.summary.manualCurrentPreserved,1);
 assert.ok(r.summary.occupiedModules>0);
 assert.equal(JSON.stringify(p),before);
 assert.equal(r.engineeringApproved,false);assert.equal(r.ready_for_installation,false);
});
test('three phase load uses existing sqrt(3) engine, not single phase voltage',()=>{
 const r=api.epWorkflowPreviewV1(project(),()=>article,catalogue,inputs());
 const x=r.rows.find(v=>v.lineId==='L3');
 assert.equal(x.ibSource,'CALCULATED_PREVIEW');
 assert.ok(Math.abs(x.ibA-(Math.ceil(5000/(Math.sqrt(3)*400*.9)*1000)/1000))<1e-8);
});
test('apply only fills missing currents; manually supplied Ib is never silently overwritten',()=>{
 const p=project(),before=JSON.stringify(p);
 const result=api.epWorkflowApplyCurrentsV1(p,inputs());
 assert.equal(result.status,'APPLIED');assert.equal(result.applied.length,2);
 assert.equal(result.skipped.length,1);
 assert.equal(result.project.lines[1].overloadInput.ibA,9.5);
 assert.ok(result.project.lines[0].overloadInput.ibA>0);
 assert.equal(result.project.lines[0].loadCurrentCalculation.powerSource,'circuit');
 assert.equal(result.project.workflowDesignInputsV1.singleVoltageV,230);
 assert.equal(JSON.stringify(p),before);
});
test('second apply is idempotent and creates no duplicate calculated lines',()=>{
 const p=api.epWorkflowApplyCurrentsV1(project(),inputs()).project;
 const before=JSON.stringify(p);
 const r=api.epWorkflowApplyCurrentsV1(p,inputs());
 assert.equal(r.status,'NO_CHANGES');assert.equal(r.applied.length,0);
 assert.equal(JSON.stringify(p),before);
});
test('no guessed voltage, demand factor, or power factor when inputs are absent',()=>{
 const r=api.epWorkflowPreviewV1(project(),()=>article,catalogue,null);
 assert.equal(r.summary.calculated,0);
 assert.ok(r.rows.some(x=>x.ibSource==='NOT_AVAILABLE'));
 assert.ok(r.issues.some(i=>i.code==='WORKFLOW_COMMON_INPUTS_PENDING'));
});
test('incomplete phase or power is left pending rather than auto assigned',()=>{
 const p=project();p.lines[0].phase='';p.lines[2].power=null;
 const r=api.epWorkflowPreviewV1(p,()=>article,catalogue,inputs());
 assert.equal(r.summary.unknownPhase,1);
 assert.equal(r.rows[0].calculationStatus,'NEEDS_PHASE');
 assert.equal(r.rows[2].calculationStatus,'NEEDS_POWER');
});
test('consumers assigned to missing circuits are blocked but not silently regrouped',()=>{
 const p=project();p.loads.push({id:'LD4',name:'Orphan',circuitId:'GHOST',powerKw:1});
 const r=api.epWorkflowPreviewV1(p,()=>article,catalogue,inputs());
 assert.equal(r.status,'BLOCKED');assert.equal(r.summary.unassignedLoads,1);
 assert.ok(r.issues.some(x=>x.code==='WORKFLOW_CONSUMERS_WITHOUT_CIRCUIT'));
});
test('previously entered Iz or Ik not required just to preview candidates',()=>{
 const r=api.epWorkflowPreviewV1(project(),()=>article,catalogue,inputs());
 assert.ok(r.rows.some(x=>x.proposedStatus==='INCOMPLETE'));
 assert.equal(r.rows[0].cableLengthStatus,'NOT_REQUIRED_FOR_PANEL_PREVIEW');
});
test('reject invalid shared inputs and unknown extra keys',()=>{
 for(const bad of [
  {...inputs(),powerFactor:0}, {...inputs(),efficiency:1.1},
  {...inputs(),demandFactor:'bad'}, {...inputs(),threeVoltageV:-100},
  {...inputs(),approved:true}, {}, null, []]){
  assert.throws(()=>api.epWorkflowInputsV1(bad),/WORKFLOW_INPUT/);
 }
});
test('no overwriting unassigned or powerless circuits on bulk apply',()=>{
 const p=project();p.lines[0].phase='';p.lines[2].power=null;
 const r=api.epWorkflowApplyCurrentsV1(p,inputs());
 assert.ok(r.skipped.some(x=>x.code==='WORKFLOW_PHASE_NOT_ASSIGNED'));
 assert.ok(r.skipped.some(x=>x.code==='WORKFLOW_POWER_NOT_DECLARED'));
 assert.equal(r.project.lines[0].overloadInput,undefined);
});
test('HTML escapes names and supports common input and preview controls',()=>{
 const r=api.epWorkflowPreviewV1(project(),()=>article,catalogue,inputs());
 r.rows[0].name='<img src=x onerror=alert(1)>';
 const h=api.epWorkflowHtmlV1(r,inputs());
 assert.ok(!h.includes('<img src=x onerror=alert(1)>'));
 assert.ok(h.includes('&lt;img'));
 assert.match(h,/workflowApplyCurrentsBtn/);
 assert.match(h,/workflowPreviewBtn/);
});
test('unsupported project structures cannot be implicitly approved',()=>{
 const r=api.epWorkflowPreviewV1({lines:[],loads:null},()=>article,catalogue,inputs());
 assert.equal(r.status,'BLOCKED');assert.equal(r.engineeringApproved,false);
});

test('single-phase-only project does not require unused three-phase voltage',()=>{
 const p=project();p.lines=p.lines.filter(x=>x.phase!=='3Ф');
 const input={...inputs(),threeVoltageV:null};
 const r=api.epWorkflowPreviewV1(p,()=>article,catalogue,input);
 assert.equal(r.summary.calculated,1);
 const applied=api.epWorkflowApplyCurrentsV1(p,input);
 assert.equal(applied.applied.length,1);
 assert.equal(applied.project.workflowDesignInputsV1.threeVoltageV,null);
});
test('three-phase-only project does not require unused single-phase voltage',()=>{
 const p=project();p.lines=p.lines.filter(x=>x.phase==='3Ф');
 const input={...inputs(),singleVoltageV:null};
 const r=api.epWorkflowPreviewV1(p,()=>article,catalogue,input);
 assert.equal(r.summary.calculated,1);
});
test('missing relevant voltage leaves affected circuit pending without invented current',()=>{
 const r=api.epWorkflowPreviewV1(project(),()=>article,catalogue,
  {...inputs(),singleVoltageV:null});
 assert.equal(r.rows[0].ibA,null);
 assert.equal(r.rows[0].calculationCode,'WORKFLOW_RELEVANT_VOLTAGE_NOT_DECLARED');
 assert.ok(r.rows.find(x=>x.lineId==='L3').ibA>0);
});
test('invalid manually entered Ib is preserved for correction rather than silently overwritten',()=>{
 const p=project();p.lines[0].overloadInput={ibA:'bad'};
 const r=api.epWorkflowApplyCurrentsV1(p,inputs());
 assert.equal(r.project.lines[0].overloadInput.ibA,'bad');
 assert.ok(r.skipped.some(x=>x.lineId==='L1'&&x.code==='WORKFLOW_EXISTING_CURRENT_PRESERVED'));
});
test('all source voltage fields missing fail explicit validation',()=>{
 assert.throws(()=>api.epWorkflowInputsV1({...inputs(),singleVoltageV:null,threeVoltageV:null}),
  /WORKFLOW_INPUT_VOLTAGE_REQUIRED/);
});

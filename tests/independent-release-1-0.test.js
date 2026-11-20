'use strict';
// Independent Electropanel 1.0 contract tests. No application code modified.
const {test}=require('node:test');
const assert=require('node:assert/strict');
global.epLoadCurrentV1=require('../load-current-v1.js').epLoadCurrentV1;
global.epApplyLoadCurrentV1=require('../load-current-v1.js').epApplyLoadCurrentV1;
global.epProtectiveDeviceShortlistV1=require('../protective-device-shortlist-v1.js').epProtectiveDeviceShortlistV1;
global.epSingleLineDraftV1=require('../single-line-draft-v1.js').epSingleLineDraftV1;
global.epDraftBoardPlanV1=require('../draft-board-plan-v1.js').epDraftBoardPlanV1;
global.epDraftBomV1=require('../draft-bom-v1.js').epDraftBomV1;
const workflow=require('../project-automation-workflow-v1.js');
const inputs={singleVoltageV:230,threeVoltageV:400,powerFactor:0.9,efficiency:1,demandFactor:1};
const article={kind:'MCB',sku:'MCB-C16',maker:'Fixture only',series:'C',poles:1,modules:1,widthMm:18,inA:16,icnKa:6,icnVoltageV:230,icnStandard:'IEC 60898-1',verificationStatus:'UNVERIFIED'};
const catalog=[{id:'MCB-C16',device:article}];
function fixture(){return {schema:'electropanel.web.preview.1',title:'Commercial shop panel',railCount:2,railCapacity:12,earthing:'TN-S',
lines:[{id:'LIGHT',name:'Lighting',phase:'L1',power:1.5,modules:1,catalogSku:'MCB-C16'},{id:'SOCKET',name:'Sockets',phase:'L2',power:2,modules:1,overloadInput:{ibA:9.5}},{id:'HVAC',name:'HVAC',phase:'3Ф',power:5,modules:3}],
branchDevices:[{id:'Q1',circuitId:'LIGHT',modules:1},{id:'Q2',circuitId:'SOCKET',modules:1},{id:'Q3',circuitId:'HVAC',modules:3}],sharedDevices:[],
loads:[{id:'C1',name:'Light',circuitId:'LIGHT',powerKw:1.5},{id:'C2',name:'Sockets',circuitId:'SOCKET',powerKw:2},{id:'C3',name:'HVAC',circuitId:'HVAC',powerKw:5}]};}
function preview(p,i=inputs){return workflow.epWorkflowPreviewV1(p,()=>article,catalog,i);}
test('audit: nine-stage scenario preserves original project and never asserts installation approval',()=>{
 const p=fixture(),before=JSON.stringify(p),r=preview(p);
 assert.equal(r.summary.consumers,3);assert.equal(r.summary.circuits,3);
 assert.equal(r.engineeringApproved,false);assert.equal(r.ready_for_installation,false);
 assert.equal(JSON.stringify(p),before);
 assert.ok(r.steps.some(s=>s.key==='SINGLE_LINE'));assert.ok(r.steps.some(s=>s.key==='BOARD'));assert.ok(r.steps.some(s=>s.key==='BOM'));
});
test('audit: consumer without circuit is not silently accepted',()=>{
 const p=fixture();p.loads.push({id:'ORPHAN',name:'Unassigned',circuitId:'MISSING',powerKw:1});
 const r=preview(p);assert.equal(r.status,'BLOCKED');
 assert.equal(r.summary.unassignedLoads,1);
 assert.ok(r.issues.some(x=>x.code==='WORKFLOW_CONSUMERS_WITHOUT_CIRCUIT'));
});
test('audit: no route length or upstream fault data required for draft panel preview',()=>{
 const r=preview(fixture());
 assert.equal(r.rows.length,3);
 assert.ok(r.rows.every(x=>x.cableLengthStatus==='NOT_REQUIRED_FOR_PANEL_PREVIEW'));
 assert.equal(r.engineeringApproved,false);
});
test('audit: calculated three-phase current uses 400 V and manual Ib survives recalculation',()=>{
 const p=fixture(),r=preview(p);
 const hvac=r.rows.find(x=>x.lineId==='HVAC');
 assert.ok(Math.abs(hvac.ibA-Math.ceil(5000/(Math.sqrt(3)*400*.9)*1000)/1000)<1e-8);
 const applied=workflow.epWorkflowApplyCurrentsV1(p,inputs);
 assert.equal(applied.project.lines.find(x=>x.id==='SOCKET').overloadInput.ibA,9.5);
 assert.equal(JSON.stringify(p),JSON.stringify(fixture()));
});
test('audit: incomplete electrical input cannot become approved output',()=>{
 const p=fixture();p.lines[0].phase='';p.lines[2].power=null;
 const r=preview(p);
 assert.equal(r.engineeringApproved,false);assert.equal(r.ready_for_installation,false);
 assert.ok(r.summary.missingInput>0);assert.ok(r.summary.unknownPhase>0);
});
test('audit: phase voltage absence leaves affected current unavailable, not guessed',()=>{
 const r=preview(fixture(),{...inputs,threeVoltageV:null});
 assert.equal(r.rows.find(x=>x.lineId==='HVAC').ibA,null);
 assert.equal(r.rows.find(x=>x.lineId==='HVAC').calculationCode,'WORKFLOW_RELEVANT_VOLTAGE_NOT_DECLARED');
});

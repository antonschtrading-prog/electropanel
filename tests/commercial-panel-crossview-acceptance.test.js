'use strict';
// Commercial-panel release acceptance: exercise production projections on one
// canonical fixture and after edits. These are API-level gates, not UI proof.
const {test}=require('node:test');
const assert=require('node:assert/strict');
global.epLoadCurrentV1=require('../load-current-v1.js').epLoadCurrentV1;
global.epApplyLoadCurrentV1=require('../load-current-v1.js').epApplyLoadCurrentV1;
global.epProtectiveDeviceShortlistV1=require('../protective-device-shortlist-v1.js').epProtectiveDeviceShortlistV1;
global.epSingleLineDraftV1=require('../single-line-draft-v1.js').epSingleLineDraftV1;
global.epDraftBoardPlanV1=require('../draft-board-plan-v1.js').epDraftBoardPlanV1;
global.epDraftBomV1=require('../draft-bom-v1.js').epDraftBomV1;
const workflow=require('../project-automation-workflow-v1.js');
const {epSingleLineDraftV1}=require('../single-line-draft-v1.js');
const {epDraftBoardPlanV1,epMoveBoardDeviceV1}=require('../draft-board-plan-v1.js');
const {epDraftBomV1}=require('../draft-bom-v1.js');
const inputs={singleVoltageV:230,threeVoltageV:400,powerFactor:0.9,efficiency:1,demandFactor:1};
const device={sku:'TEST-C16',maker:'Test fixture only',series:'Unverified',kind:'MCB',modules:1,widthMm:18,poles:1,inA:16,icnKa:6,verificationStatus:'UNVERIFIED'};
const lookup=()=>device;
const catalog=[{id:device.sku,device}];
function fixture(){return {
 schema:'electropanel.web.preview.1',title:'Shop distribution panel',railCount:2,railCapacity:12,
 lines:[
  {id:'LIGHT',name:'Lighting',phase:'L1',power:1.5,modules:1,catalogSku:device.sku},
  {id:'SOCKET',name:'Sockets',phase:'L2',power:2,modules:1,overloadInput:{ibA:9.5}},
  {id:'HVAC',name:'Air conditioning',phase:'3Ф',power:5,modules:3}
 ],
 branchDevices:[{id:'Q1',circuitId:'LIGHT',modules:1},{id:'Q2',circuitId:'SOCKET',modules:1},{id:'Q3',circuitId:'HVAC',modules:3}],
 sharedDevices:[],
 loads:[{id:'C1',name:'Lighting load',circuitId:'LIGHT',powerKw:1.5},
 {id:'C2',name:'Socket load',circuitId:'SOCKET',powerKw:2},
 {id:'C3',name:'HVAC load',circuitId:'HVAC',powerKw:5}]
};}
function views(p){return {scheme:epSingleLineDraftV1(p,lookup),board:epDraftBoardPlanV1(p,lookup),bom:epDraftBomV1(p,lookup),workflow:workflow.epWorkflowPreviewV1(p,lookup,catalog,inputs)};}
function ids(p){const v=views(p);return {
 circuit:v.scheme.nodes.filter(x=>x.type==='circuit').map(x=>x.lineId).sort(),
 branch:v.board.placements.map(x=>x.deviceId).sort(),
 count:v.bom.totalCataloguedDevices,
 workflow:v.workflow,
 reports:v
};}
test('commercial: three consumer-to-circuit links survive all draft projections',()=>{
 const p=fixture(),original=JSON.stringify(p),v=ids(p);
 assert.deepEqual(v.circuit,['HVAC','LIGHT','SOCKET']);
 assert.deepEqual(v.branch,['Q1','Q2','Q3']);
 assert.equal(v.workflow.summary.consumers,3);
 assert.equal(v.workflow.summary.circuits,3);
 assert.equal(JSON.stringify(p),original);
});
test('commercial: declared loads reconcile without inventing a phase or current',()=>{
 const v=views(fixture()).workflow;
 assert.equal(v.summary.consumerReconciliation.matchedConsumers,3);
 assert.equal(v.summary.consumerReconciliation.orphanConsumers,0);
 assert.equal(v.summary.unknownPhase,0);
 assert.equal(v.rows.find(x=>x.lineId==='SOCKET').ibA,9.5);
 assert.equal(v.rows.find(x=>x.lineId==='HVAC').calculationStatus,'CALCULATED');
});
test('commercial: no projection claims installation approval',()=>{
 const v=views(fixture());
 for(const report of Object.values(v)){
  assert.equal(report.engineeringApproved,false);
  assert.equal(report.ready_for_installation,false);
 }
});
test('commercial: JSON roundtrip retains circuit IDs, load associations and exports',()=>{
 const original=fixture(),reopened=JSON.parse(JSON.stringify(original));
 assert.deepEqual(reopened,original);
 const before=ids(original),after=ids(reopened);
 assert.deepEqual(after.circuit,before.circuit);
 assert.deepEqual(after.branch,before.branch);
 assert.equal(after.count,before.count);
 assert.equal(after.workflow.summary.consumers,3);
});
test('commercial: naming edit propagates to one-line without changing device identity',()=>{
 const p=fixture();p.lines[0].name='Emergency lighting';
 const v=ids(p);
 assert.equal(v.reports.scheme.nodes.find(x=>x.lineId==='LIGHT').name,'Emergency lighting');
 assert.deepEqual(v.branch,['Q1','Q2','Q3']);
 assert.equal(v.workflow.summary.consumers,3);
});
test('commercial: explicit circuit and consumer deletion preserves remaining identities',()=>{
 const p=fixture();
 p.lines=p.lines.filter(x=>x.id!=='SOCKET');
 p.branchDevices=p.branchDevices.filter(x=>x.circuitId!=='SOCKET');
 p.loads=p.loads.filter(x=>x.circuitId!=='SOCKET');
 const v=ids(p);
 assert.deepEqual(v.circuit,['HVAC','LIGHT']);
 assert.deepEqual(v.branch,['Q1','Q3']);
 assert.equal(v.workflow.summary.consumers,2);
 assert.equal(v.workflow.summary.unassignedLoads,0);
});
test('commercial: orphan load blocks the whole draft route, not only consumer audit',()=>{
 const p=fixture();p.loads.push({id:'C4',name:'Orphan',circuitId:'REMOVED',powerKw:1});
 const v=views(p).workflow;
 assert.equal(v.status,'BLOCKED');
 assert.equal(v.summary.unassignedLoads,1);
 assert.equal(v.engineeringApproved,false);
});
test('commercial: orphan branch device cannot disappear inside otherwise valid views',()=>{
 const p=fixture();p.branchDevices.push({id:'Q4',circuitId:'REMOVED',modules:1});
 const v=views(p);
 assert.equal(v.workflow.status,'BLOCKED');
 assert.ok(v.workflow.issues.some(x=>x.code==='WORKFLOW_ORPHAN_BRANCH_DEVICE'));
 assert.equal(v.board.status,'BLOCKED');
});
test('commercial: mismatched article declarations block aggregate workflow',()=>{
 const p=fixture();p.branchDevices[0].catalogSku='OTHER-UNVERIFIED';
 const v=views(p);
 assert.equal(v.workflow.status,'BLOCKED');
 assert.ok(v.workflow.issues.some(x=>x.code==='WORKFLOW_CIRCUIT_BRANCH_ARTICLE_CONFLICT'));
 assert.equal(v.workflow.engineeringApproved,false);
});
test('commercial: insufficient DIN capacity blocks the route and preserves source',()=>{
 const p=fixture(),before=JSON.stringify(p);p.railCapacity=1;
 const v=views(p);
 assert.equal(v.board.status,'BLOCKED');
 assert.equal(v.workflow.status,'BLOCKED');
 assert.ok(v.workflow.issues.some(x=>x.code==='WORKFLOW_BOARD_CONFLICT'));
 assert.equal(JSON.stringify(p),JSON.stringify({...JSON.parse(before),railCapacity:1}));
});
test('commercial: legal device move does not mutate original project',()=>{
 const p=fixture(),before=JSON.stringify(p);
 const moved=epMoveBoardDeviceV1(p,'Q1',1,5,lookup);
 assert.equal(moved.code,'POSITION_UPDATED');
 assert.equal(JSON.stringify(p),before);
 assert.equal(epDraftBoardPlanV1(moved.project,lookup).placements.find(x=>x.deviceId==='Q1').startModule,5);
});
test('commercial: invalid overlapping move returns no mutated project',()=>{
 const p=fixture(),before=JSON.stringify(p);
 const move=epMoveBoardDeviceV1(p,'Q1',0,1,lookup);
 assert.equal(move.code,'MANUAL_LAYOUT_OVERLAP');
 assert.equal(move.project,null);
 assert.equal(JSON.stringify(p),before);
});
test('commercial: incomplete voltage never silently fabricates three-phase Ib',()=>{
 const p=fixture();
 const r=workflow.epWorkflowPreviewV1(p,lookup,catalog,{...inputs,threeVoltageV:null});
 assert.equal(r.rows.find(x=>x.lineId==='HVAC').ibA,null);
 assert.equal(r.engineeringApproved,false);
});
test('commercial: malformed load identity keeps the route blocked after JSON reopening',()=>{
 const p=fixture();p.loads[0].circuitId='MISSING';
 const reopen=JSON.parse(JSON.stringify(p));
 const a=views(p).workflow,b=views(reopen).workflow;
 assert.equal(a.status,'BLOCKED');
 assert.equal(b.status,'BLOCKED');
 assert.equal(b.summary.unassignedLoads,1);
});

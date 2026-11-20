'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const api=require('../project-automation-workflow-v1.js');
global.epLoadCurrentV1=require('../load-current-v1.js').epLoadCurrentV1;
global.epApplyLoadCurrentV1=require('../load-current-v1.js').epApplyLoadCurrentV1;
global.epProtectiveDeviceShortlistV1=require('../protective-device-shortlist-v1.js').epProtectiveDeviceShortlistV1;
global.epSingleLineDraftV1=require('../single-line-draft-v1.js').epSingleLineDraftV1;
global.epDraftBoardPlanV1=require('../draft-board-plan-v1.js').epDraftBoardPlanV1;
global.epDraftBomV1=require('../draft-bom-v1.js').epDraftBomV1;
const input={singleVoltageV:230,threeVoltageV:null,powerFactor:.92,efficiency:1,demandFactor:1};
const make=(count=100)=>({
 schema:'electropanel.web.preview.2',title:'Production retail',earthing:'TN-S',
 railCount:8,railCapacity:72,
 lines:Array.from({length:count},(_,i)=>({id:'L'+i,name:'Shop '+i,power:1.5,
  phase:i%3===0?'L1':i%3===1?'L2':'L3',modules:1})),
 branchDevices:Array.from({length:count},(_,i)=>({id:'B'+i,circuitId:'L'+i,modules:1})),
 loads:Array.from({length:count},(_,i)=>({id:'LD'+i,circuitId:'L'+i,
  name:'Consumer '+i,powerKw:1.5})),sharedDevices:[]});
test('consumer grouping is visible and CSV retains exact circuit assignments',()=>{
 const p=make(3),report=api.epWorkflowPreviewV1(p,()=>null,[],input);
 assert.equal(report.rows[0].consumers[0].name,'Consumer 0');
 const csv=api.epWorkflowCsvV1(report);
 assert.equal(csv.charCodeAt(0),0xfeff);
 assert.ok(csv.includes('Consumer 0'));
 assert.ok(csv.includes('L2'));
 assert.ok(csv.includes('Ib source'));
});
test('CSV neutralizes spreadsheet formulas and embedded delimiters',()=>{
 const csv=api.epWorkflowCsvV1({rows:[{
  lineId:'L1',name:'=HYPERLINK("x")',consumers:[{name:'+SUM(1);evil'}],
  phase:'L1',powerKw:1.5,ibA:10,ibSource:'EXISTING',selectedSku:null,
  proposedSku:null,proposedStatus:null,proposalCaution:[],
  calculationStatus:'CALCULATED'}]});
 assert.match(csv,/'=HYPERLINK/);
 assert.match(csv,/'\+SUM/);
 assert.match(csv,/""x""/);
});
test('100 circuit workflow previews remain deterministic and immutable',()=>{
 const p=make(100),before=JSON.stringify(p);
 const a=api.epWorkflowPreviewV1(p,()=>null,[],input);
 const b=api.epWorkflowPreviewV1(p,()=>null,[],input);
 assert.equal(a.summary.circuits,100);
 assert.equal(a.summary.calculated,100);
 assert.deepEqual(a.summary,b.summary);
 assert.equal(JSON.stringify(p),before);
});
test('bulk preliminary calculation respects previously assigned manual Ib on large project',()=>{
 const p=make(100);p.lines[1].overloadInput={ibA:17};
 const r=api.epWorkflowApplyCurrentsV1(p,input);
 assert.equal(r.applied.length,99);
 assert.equal(r.skipped.length,1);
 assert.equal(r.project.lines[1].overloadInput.ibA,17);
 assert.equal(p.lines[1].loadCurrentCalculation,undefined);
});
test('400 circuit preview limit does not mutate the source project',()=>{
 const p=make(400),before=JSON.stringify(p);
 const r=api.epWorkflowPreviewV1(p,()=>null,[],input);
 assert.equal(r.summary.circuits,400);
 assert.equal(r.summary.calculated,400);
 assert.equal(JSON.stringify(p),before);
 assert.equal(r.ready_for_installation,false);
});

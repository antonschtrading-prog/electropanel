'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {epWorkflowProjectionBlockedV1,epWorkflowPreviewV1}=require('../project-automation-workflow-v1');
test('projection evidence recognizes all supported blocking issue fields',()=>{
 for(const issue of [{level:'BLOCKED'},{status:'BLOCKED'},{severity:'BLOCKED'}]){
  assert.equal(epWorkflowProjectionBlockedV1({status:'DRAFT',issues:[issue]}),true);
 }
});
test('projection evidence ignores nonblocking and missing reports',()=>{
 assert.equal(epWorkflowProjectionBlockedV1(null),false);
 assert.equal(epWorkflowProjectionBlockedV1({status:'UNKNOWN',issues:[{level:'UNKNOWN'}]}),false);
 assert.equal(epWorkflowProjectionBlockedV1({status:'BLOCKED'}),true);
});
test('schematic issue blocks both aggregate and schematic stage',()=>{
 const original=global.epSingleLineDraftV1;
 global.epSingleLineDraftV1=()=>({status:'DRAFT',issues:[{status:'BLOCKED',code:'SINGLE_LINE_GROUP_ORPHAN'}],nodes:[]});
 try{
  const report=epWorkflowPreviewV1({lines:[],loads:[],sharedDevices:[],branchDevices:[]},()=>null,[]);
  assert.equal(report.status,'BLOCKED');
  assert.equal(report.steps.find(x=>x.key==='SINGLE_LINE').status,'BLOCKED');
  assert.ok(report.issues.some(x=>x.code==='WORKFLOW_SCHEMATIC_CONFLICT'));
 }finally{
  if(original===undefined)delete global.epSingleLineDraftV1;
  else global.epSingleLineDraftV1=original;
 }
});
test('board and BOM issue blockers are propagated independently',()=>{
 const previous=[global.epDraftBoardPlanV1,global.epDraftBomV1];
 global.epDraftBoardPlanV1=()=>({status:'DRAFT',issues:[{severity:'BLOCKED'}],placements:[]});
 global.epDraftBomV1=()=>({status:'UNKNOWN',issues:[{level:'BLOCKED'}],items:[]});
 try{
  const report=epWorkflowPreviewV1({lines:[],loads:[],sharedDevices:[],branchDevices:[]},()=>null,[]);
  assert.equal(report.status,'BLOCKED');
  assert.equal(report.steps.find(x=>x.key==='BOARD').status,'BLOCKED');
  assert.equal(report.steps.find(x=>x.key==='BOM').status,'BLOCKED');
  assert.ok(report.issues.some(x=>x.code==='WORKFLOW_BOARD_CONFLICT'));
  assert.ok(report.issues.some(x=>x.code==='WORKFLOW_BOM_CONFLICT'));
 }finally{
  if(previous[0]===undefined)delete global.epDraftBoardPlanV1;else global.epDraftBoardPlanV1=previous[0];
  if(previous[1]===undefined)delete global.epDraftBomV1;else global.epDraftBomV1=previous[1];
 }
});

test('apparatus stage reports blocked when article identity conflicts',()=>{
 const report=epWorkflowPreviewV1({
  lines:[{id:'L1',name:'Circuit',phase:'L1',power:1,catalogSku:'SKU-A'}],
  loads:[],sharedDevices:[],branchDevices:[{id:'Q1',circuitId:'L1',catalogSku:'SKU-B'}]
 },()=>null,[]);
 assert.equal(report.status,'BLOCKED');
 assert.equal(report.steps.find(x=>x.key==='APPARATUS').status,'BLOCKED');
});
test('apparatus stage reports blocked for orphan branch devices',()=>{
 const report=epWorkflowPreviewV1({
  lines:[],loads:[],sharedDevices:[],branchDevices:[{id:'Q1',circuitId:'MISSING',catalogSku:'SKU-A'}]
 },()=>null,[]);
 assert.equal(report.steps.find(x=>x.key==='APPARATUS').status,'BLOCKED');
});

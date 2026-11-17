'use strict';
// Independent release matrix: 30 real-module cross-view cases, no production modifications.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {epSingleLineDraftV1}=require('../single-line-draft-v1.js');
const {epDraftBoardPlanV1}=require('../draft-board-plan-v1.js');
const {epDraftBomV1}=require('../draft-bom-v1.js');
const {epProtectiveDeviceShortlistV1}=require('../protective-device-shortlist-v1.js');
const {epWorkflowInputsV1,epWorkflowPhaseSuggestionsV1}=require('../project-automation-workflow-v1.js');
const lookup=sku=>({sku,kind:'MCB',maker:'Audit',series:'Fixture',modules:1,widthMm:18,poles:1,inA:16,icnKa:6,verificationStatus:'UNVERIFIED'});
const base=()=>({railCount:2,railCapacity:4,lines:[{id:'L1',name:'Lighting',phase:'L1',power:1,modules:1,catalogSku:'A'},{id:'L2',name:'Sockets',phase:'L2',power:2,modules:1,catalogSku:'A'}],branchDevices:[{id:'Q1',circuitId:'L1',modules:1},{id:'Q2',circuitId:'L2',modules:1}],sharedDevices:[],loads:[{id:'C1',name:'Light',circuitId:'L1',powerKw:1}]});
const projectors={schematic:epSingleLineDraftV1,board:epDraftBoardPlanV1,bom:epDraftBomV1};
const cases=[
 ['orphan branch',{change:p=>p.branchDevices.push({id:'Q3',circuitId:'MISSING',modules:1}),codes:{schematic:'SINGLE_LINE_BRANCH_ORPHAN',board:'ORPHAN_BRANCH_DEVICE',bom:'BRANCH_ORPHAN'}}],
 ['duplicate branch circuit',{change:p=>p.branchDevices.push({id:'Q3',circuitId:'L1',modules:1}),codes:{schematic:'SINGLE_LINE_DUPLICATE_BRANCH',board:'DUPLICATE_BRANCH_FOR_CIRCUIT',bom:'BRANCH_DUPLICATE'}}],
 ['missing branch',{change:p=>p.branchDevices.pop(),codes:{board:'MISSING_BRANCH_DEVICE',bom:'BRANCH_MISSING'}}],
 ['duplicate line id',{change:p=>p.lines.push({...p.lines[0]}),codes:{schematic:'SINGLE_LINE_CIRCUIT_INVALID',bom:'CIRCUIT_ID_DUPLICATE'}}],
 ['duplicate device id',{change:p=>p.branchDevices[1].id='Q1',codes:{board:'DEVICE_ID_INVALID_OR_DUPLICATE',bom:'BRANCH_ID_DUPLICATE'}}],
 ['branch width mismatch',{change:p=>p.branchDevices[0].modules=2,codes:{board:'BRANCH_LINE_WIDTH_CONFLICT',bom:'BRANCH_WIDTH_CONFLICT'}}],
 ['unknown catalog SKU',{change:p=>p.lines[0].catalogSku='MISSING',codes:{schematic:'SINGLE_LINE_ARTICLE_UNKNOWN',board:'ARTICLE_UNKNOWN',bom:'SKU_UNKNOWN'}}],
 ['invalid rail capacity',{change:p=>p.railCapacity=0,codes:{board:'BOARD_INPUT_INVALID'}}],
 ['manual overlap',{change:p=>p.manualLayoutV1=[{deviceId:'Q1',railIndex:0,startModule:0},{deviceId:'Q2',railIndex:0,startModule:0}],codes:{board:'MANUAL_LAYOUT_OVERLAP'}}],
 ['manual orphan',{change:p=>p.manualLayoutV1=[{deviceId:'MISSING',railIndex:0,startModule:0}],codes:{board:'MANUAL_LAYOUT_ORPHAN'}}],
 ['manual outside rail',{change:p=>p.manualLayoutV1=[{deviceId:'Q1',railIndex:5,startModule:0}],codes:{board:'MANUAL_LAYOUT_OUT_OF_BOUNDS'}}],
 ['manual duplicate',{change:p=>p.manualLayoutV1=[{deviceId:'Q1',railIndex:0,startModule:0},{deviceId:'Q1',railIndex:0,startModule:1}],codes:{board:'MANUAL_LAYOUT_DUPLICATE_OR_INVALID'}}],
 ['invalid manual layout type',{change:p=>p.manualLayoutV1={},codes:{board:'MANUAL_LAYOUT_INVALID'}}],
 ['insufficient cabinet',{change:p=>{p.railCount=1;p.railCapacity=1},codes:{board:'RAIL_CAPACITY_EXCEEDED'}}],
 ['orphan shared group circuit',{change:p=>p.sharedDevices.push({id:'R1',modules:2,circuitIds:['MISSING']}),codes:{schematic:'SINGLE_LINE_GROUP_ORPHAN'}}],
 ['shared group invalid circuits',{change:p=>p.sharedDevices.push({id:'R1',modules:2,circuitIds:null}),codes:{schematic:'SINGLE_LINE_RCD_INVALID'}}],
 ['multiple shared groups',{change:p=>p.sharedDevices.push({id:'R1',modules:2,circuitIds:['L1']},{id:'R2',modules:2,circuitIds:['L1']}),codes:{schematic:'SINGLE_LINE_MULTIPLE_RCD'}}],
 ['invalid branch collection',{change:p=>p.branchDevices={},codes:{bom:'BRANCH_DEVICES_INVALID'}}],
 ['invalid catalog geometry',{change:p=>p.lines[0].catalogSku='OVERSIZE',codes:{bom:'ARTICLE_GEOMETRY_UNCONFIRMED'}}],
 ['missing line article',{change:p=>p.lines[0].catalogSku=null,codes:{schematic:'SINGLE_LINE_ARTICLE_MISSING',board:'DEVICE_ARTICLE_NOT_SELECTED',bom:'SKU_MISSING'}}],
];
const lookupVariant=sku=>sku==='OVERSIZE'?{...lookup(sku),widthMm:40}:sku==='MISSING'?null:lookup(sku);
for(const [label,config] of cases)test('matrix: '+label,()=>{
 const p=base();config.change(p);const before=JSON.stringify(p);
 for(const [view,code] of Object.entries(config.codes)){
  const result=projectors[view](p,lookupVariant);
  assert.ok(result.issues.some(x=>x.code===code),view+' must expose '+code+': '+JSON.stringify(result.issues));
  assert.equal(result.engineeringApproved,false);
 }
 assert.equal(JSON.stringify(p),before,'projections may not mutate project');
});
for(const [label,raw] of [
 ['zero power factor',{singleVoltageV:230,threeVoltageV:400,powerFactor:0,efficiency:1,demandFactor:1}],
 ['power factor greater than one',{singleVoltageV:230,threeVoltageV:400,powerFactor:1.1,efficiency:1,demandFactor:1}],
 ['negative voltage',{singleVoltageV:-230,threeVoltageV:400,powerFactor:0.9,efficiency:1,demandFactor:1}],
 ['both voltages absent',{singleVoltageV:null,threeVoltageV:null,powerFactor:0.9,efficiency:1,demandFactor:1}],
 ['missing efficiency',{singleVoltageV:230,threeVoltageV:400,powerFactor:0.9,demandFactor:1}],
 ['unknown field',{singleVoltageV:230,threeVoltageV:400,powerFactor:0.9,efficiency:1,demandFactor:1,unexpected:true}],
 ['invalid demand',{singleVoltageV:230,threeVoltageV:400,powerFactor:0.9,efficiency:1,demandFactor:1.5}],
 ['non-numeric voltage',{singleVoltageV:'abc',threeVoltageV:400,powerFactor:0.9,efficiency:1,demandFactor:1}],
])test('matrix inputs: '+label,()=>assert.throws(()=>epWorkflowInputsV1(raw)));
test('matrix inputs: decimal comma is accepted without guessing',()=>{
 const result=epWorkflowInputsV1({singleVoltageV:'230',threeVoltageV:'400',powerFactor:'0,9',efficiency:1,demandFactor:1});
 assert.equal(result.powerFactor,0.9);assert.equal(result.singleVoltageV,230);
});
test('matrix phase hints are advisory and do not change assigned phases',()=>{
 const p=base(),before=JSON.stringify(p),hints=epWorkflowPhaseSuggestionsV1(p);
 assert.equal(hints.engineeringApproved,false);assert.equal(hints.ready_for_installation,false);
 assert.equal(JSON.stringify(p),before);
});
test('matrix shortlist never claims approval for unverified device',()=>{
 const line=base().lines[0];line.overloadInput={ibA:7,izA:20};line.faultInput={ikKa:3,voltageV:230};
 const r=epProtectiveDeviceShortlistV1(line,[{id:'A',device:lookup('A')}]);
 assert.equal(r.engineeringApproved,false);assert.equal(r.ready_for_installation,false);
 assert.ok(r.candidates.some(x=>x.sku==='A'&&x.caution.includes('CATALOG_DATA_UNVERIFIED')));
});

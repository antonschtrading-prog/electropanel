'use strict';
// Independent cross-projection acceptance: real production modules, no mock projections.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {epSingleLineDraftV1}=require('../single-line-draft-v1.js');
const {epDraftBoardPlanV1,epMoveBoardDeviceV1}=require('../draft-board-plan-v1.js');
const {epDraftBomV1}=require('../draft-bom-v1.js');
const sku={sku:'AUDIT-1',maker:'Audit only',series:'Test',label:'MCB',kind:'MCB',modules:1,widthMm:18,verificationStatus:'UNVERIFIED'};
const lookup=()=>sku;
const project=()=>({railCount:1,railCapacity:4,loads:[{id:'C1',circuitId:'L1',name:'Lighting',powerKw:1.5}],
lines:[{id:'L1',name:'Lighting',phase:'L1',power:1.5,modules:1,catalogSku:'AUDIT-1'},
{id:'L2',name:'Sockets',phase:'L2',power:2,modules:1,catalogSku:'AUDIT-1'}],
branchDevices:[{id:'Q1',circuitId:'L1',modules:1},{id:'Q2',circuitId:'L2',modules:1}],sharedDevices:[]});
function views(p){return {schematic:epSingleLineDraftV1(p,lookup),board:epDraftBoardPlanV1(p,lookup),bom:epDraftBomV1(p,lookup)};}
test('audit integration: schematic, DIN and BOM identify the same two devices',()=>{
 const p=project(),before=JSON.stringify(p),v=views(p);
 assert.deepEqual(v.schematic.nodes.filter(x=>x.type==='circuit').map(x=>x.branchId).sort(),['Q1','Q2']);
 assert.deepEqual(v.board.placements.map(x=>x.deviceId).sort(),['Q1','Q2']);
 assert.equal(v.bom.totalCataloguedDevices,2);
 assert.equal(JSON.stringify(p),before);
 for(const report of Object.values(v))assert.equal(report.engineeringApproved,false);
});
test('audit integration: changed circuit name is projected without changing equipment count',()=>{
 const p=project();p.lines[0].name='Emergency lighting';
 const v=views(p);
 assert.equal(v.schematic.nodes.find(x=>x.lineId==='L1').name,'Emergency lighting');
 assert.equal(v.board.placements.length,2);assert.equal(v.bom.totalCataloguedDevices,2);
});
test('audit integration: deleting circuit and its apparatus reconciles all projections',()=>{
 const p=project();p.lines=p.lines.filter(x=>x.id!=='L2');p.branchDevices=p.branchDevices.filter(x=>x.circuitId!=='L2');
 const v=views(p);
 assert.deepEqual(v.schematic.nodes.filter(x=>x.type==='circuit').map(x=>x.lineId),['L1']);
 assert.deepEqual(v.board.placements.map(x=>x.deviceId),['Q1']);
 assert.equal(v.bom.totalCataloguedDevices,1);
});
test('audit integration: orphan apparatus blocks schematic, board and BOM',()=>{
 const p=project();p.branchDevices.push({id:'Q3',circuitId:'REMOVED',modules:1});
 const v=views(p);
 assert.equal(v.schematic.status,'BLOCKED');assert.equal(v.board.status,'BLOCKED');assert.equal(v.bom.status,'BLOCKED');
});
test('audit integration: cabinet capacity overflow blocks layout, never certifies fit',()=>{
 const p=project();p.railCapacity=1;
 const v=views(p);
 assert.equal(v.board.status,'BLOCKED');
 assert.ok(v.board.issues.some(x=>x.code==='RAIL_CAPACITY_EXCEEDED'));
 assert.equal(v.board.ready_for_installation,false);
});
test('audit integration: manual DIN overlap is rejected without modifying source',()=>{
 const p=project(),original=JSON.stringify(p);
 p.manualLayoutV1=[{deviceId:'Q1',railIndex:0,startModule:0},{deviceId:'Q2',railIndex:0,startModule:0}];
 const v=views(p);
 assert.equal(v.board.status,'BLOCKED');
 assert.ok(v.board.issues.some(x=>x.code==='MANUAL_LAYOUT_OVERLAP'));
 assert.equal(JSON.stringify(p),JSON.stringify({...JSON.parse(original),manualLayoutV1:p.manualLayoutV1}));
});
test('audit integration: legal move preserves other apparatus position and original project',()=>{
 const p=project(),before=JSON.stringify(p);
 const moved=epMoveBoardDeviceV1(p,'Q1',0,2,lookup);
 assert.equal(moved.code,'POSITION_UPDATED');
 assert.equal(JSON.stringify(p),before);
 const placement=views(moved.project).board.placements;
 assert.equal(placement.find(x=>x.deviceId==='Q1').startModule,2);
 assert.equal(placement.find(x=>x.deviceId==='Q2').startModule,1);
});
test('audit integration: conflicting move is rejected and returns no project',()=>{
 const p=project();const moved=epMoveBoardDeviceV1(p,'Q1',0,1,lookup);
 assert.equal(moved.project,null);assert.equal(moved.code,'MANUAL_LAYOUT_OVERLAP');
});

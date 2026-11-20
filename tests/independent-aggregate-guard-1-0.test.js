'use strict';
// Independent verification of the existing aggregate cross-view release guard.
// Explicitly distinguishes contradictory raw projections from a guarded bundle.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {epCrossViewAuditV1}=require('../cross-view-audit-v1.js');
const {epSingleLineDraftV1}=require('../single-line-draft-v1.js');
const {epDraftBoardPlanV1}=require('../draft-board-plan-v1.js');
const {epDraftBomV1}=require('../draft-bom-v1.js');
const lookup=sku=>({sku,maker:'Audit',series:'Fixture',label:'Device',kind:'MCB',modules:1,widthMm:18,poles:1,inA:16,icnKa:6,verificationStatus:'UNVERIFIED'});
function base(){return {railCount:1,railCapacity:8,lines:[{id:'L1',name:'Lighting',device:'',phase:'L1',modules:1,catalogSku:'A'}],branchDevices:[{id:'Q1',circuitId:'L1',modules:1,label:''}],sharedDevices:[]};}
function inspect(p){
 const board=epDraftBoardPlanV1(p,lookup),bom=epDraftBomV1(p,lookup),single=epSingleLineDraftV1(p,lookup);
 const protection={status:'UNKNOWN',rows:p.lines.map(x=>({lineId:x.id,selectedSku:x.catalogSku,status:'UNKNOWN'}))};
 return {board,bom,single,cross:epCrossViewAuditV1(p,protection,board,bom,single,lookup)};
}
test('existing cross-view guard blocks branch/line SKU disagreement',()=>{
 const p=base();p.branchDevices[0].catalogSku='B';const r=inspect(p);
 assert.equal(r.single.nodes.find(x=>x.lineId==='L1').sku,'A');
 assert.equal(r.board.placements.find(x=>x.deviceId==='Q1').article,'B');
 assert.equal(r.bom.items[0].key,'B');
 assert.equal(r.cross.status,'BLOCKED');
 assert.ok(r.cross.issues.some(x=>['PLACEMENT_SKU_STALE','OUTPUT_BOARD_SKU_STALE','OUTPUT_BOM_SKU_STALE','BOM_ARTICLE_MISSING'].includes(x.code)));
});
test('existing cross-view guard is read-only',()=>{
 const p=base();p.branchDevices[0].catalogSku='B';const before=JSON.stringify(p);
 inspect(p);assert.equal(JSON.stringify(p),before);
});
test('consistent line/branch SKU does not trigger SKU-stale cross-view warning',()=>{
 const p=base();p.branchDevices[0].catalogSku='A';const r=inspect(p);
 assert.equal(r.board.placements[0].article,'A');
 assert.equal(r.bom.items[0].key,'A');
 assert.ok(!r.cross.issues.some(x=>x.code==='PLACEMENT_SKU_STALE'||x.code==='OUTPUT_BOM_SKU_STALE'));
});
test('cross-view guard blocks a missing branch placement',()=>{
 const p=base();const board=epDraftBoardPlanV1(p,lookup);board.placements=[];
 const bom=epDraftBomV1(p,lookup),single=epSingleLineDraftV1(p,lookup);
 const cross=epCrossViewAuditV1(p,{status:'UNKNOWN',rows:[{lineId:'L1',selectedSku:'A',status:'UNKNOWN'}]},board,bom,single,lookup);
 assert.equal(cross.status,'BLOCKED');
 assert.ok(cross.issues.some(x=>x.code==='PLACEMENT_BRANCH_MISSING'));
});
test('cross-view guard rejects stale schematic name after project edit',()=>{
 const p=base(),old=epSingleLineDraftV1(p,lookup);p.lines[0].name='Renamed';
 const board=epDraftBoardPlanV1(p,lookup),bom=epDraftBomV1(p,lookup);
 const cross=epCrossViewAuditV1(p,{status:'UNKNOWN',rows:[{lineId:'L1',selectedSku:'A',status:'UNKNOWN'}]},board,bom,old,lookup);
 assert.equal(cross.status,'BLOCKED');
 assert.ok(cross.issues.some(x=>x.code==='SCHEMATIC_CIRCUIT_LABEL_STALE'));
});

'use strict';
// Characterization of a confirmed cross-view SKU divergence in production projections.
// This test records the defect (rather than incorrectly asserting correct behaviour).
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {epSingleLineDraftV1}=require('../single-line-draft-v1.js');
const {epDraftBoardPlanV1}=require('../draft-board-plan-v1.js');
const {epDraftBomV1}=require('../draft-bom-v1.js');
test('DEFECT-01 characterization: branch SKU override diverges between schematic and DIN/BOM',()=>{
 const project={railCount:1,railCapacity:8,
 lines:[{id:'L1',name:'Lighting',phase:'L1',modules:1,catalogSku:'A'}],
 branchDevices:[{id:'Q1',circuitId:'L1',modules:1,catalogSku:'B'}],sharedDevices:[]};
 const lookup=sku=>({sku,maker:'Audit',series:'Fixture',kind:'MCB',modules:1,widthMm:18,verificationStatus:'UNVERIFIED'});
 const schematic=epSingleLineDraftV1(project,lookup);
 const board=epDraftBoardPlanV1(project,lookup);
 const bom=epDraftBomV1(project,lookup);
 const schematicSku=schematic.nodes.find(n=>n.lineId==='L1').sku;
 const boardSku=board.placements.find(p=>p.deviceId==='Q1').article;
 const bomSku=bom.items.find(i=>i.owners.includes('L1')).key;
 assert.equal(schematicSku,'A');assert.equal(boardSku,'B');assert.equal(bomSku,'B');
 assert.notEqual(schematicSku,bomSku,'Known cross-view divergence: no release acceptance');
 assert.equal(schematic.engineeringApproved,false);
});

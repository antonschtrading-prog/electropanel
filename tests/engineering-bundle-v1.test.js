'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
global.epDraftBoardPlanV1=require('../draft-board-plan-v1.js').epDraftBoardPlanV1;
global.epCircuitDossierV1=require('../circuit-dossier-v1.js').epCircuitDossierV1;
global.epDraftBomV1=require('../draft-bom-v1.js').epDraftBomV1;
const {epEngineeringBundleV1:bundle}=require('../engineering-bundle-v1.js');
const p=()=>({title:'Тест',railCount:1,railCapacity:4,lines:[{id:'L1',modules:1,catalogSku:'A',phase:'L1'}]});
const lookup=()=>({sku:'A',maker:'ABB',modules:1,source:'https://example.org'});
test('bundle includes circuit dossier, BOM and DIN placement',()=>{
 const r=bundle(p(),lookup);assert.equal(r.sections.dossier.rows.length,1);
 assert.equal(r.sections.bom.totalCataloguedDevices,1);assert.equal(r.sections.board.placements.length,1);
});
test('missing engineering gate fails closed',()=>{
 const r=bundle(p(),lookup);assert.equal(r.statuses.engineering,'BLOCKED');
 assert.equal(r.overallStatus,'BLOCKED');
});
test('bundle cannot declare installation approval',()=>{
 const r=bundle(p(),lookup);assert.equal(r.engineeringApproved,false);assert.equal(r.ready_for_installation,false);
});
test('bundle does not mutate original project',()=>{
 const x=p(),before=JSON.stringify(x);bundle(x,lookup);assert.equal(JSON.stringify(x),before);
});
test('invalid project fails closed',()=>{
 const r=bundle(null,lookup);assert.equal(r.overallStatus,'BLOCKED');
});

test('bundle includes explicit protection and alternate DIN sections',()=>{
 const r=bundle(p(),lookup);
 assert.ok(r.sections.protection);
 assert.ok(r.sections.layoutAlternatives);
 assert.equal(r.statuses.protection,'BLOCKED');
 assert.equal(r.statuses.layoutAlternatives,'BLOCKED');
});

'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {EP_CATALOG,epCatalogSku}=require('../catalog.js');
global.EP_CATALOG=EP_CATALOG;
global.epDraftBoardPlanV1=require('../draft-board-plan-v1.js').epDraftBoardPlanV1;
global.epCircuitDossierV1=require('../circuit-dossier-v1.js').epCircuitDossierV1;
global.epDraftBomV1=require('../draft-bom-v1.js').epDraftBomV1;
global.epDraftLayoutAlternativesV1=require('../draft-layout-alternatives-v1.js').epDraftLayoutAlternativesV1;
global.epProtectiveDeviceShortlistV1=require('../protective-device-shortlist-v1.js').epProtectiveDeviceShortlistV1;
global.epProtectionWorkbenchV1=require('../protection-workbench-v1.js').epProtectionWorkbenchV1;
const {epProtectionInputsV1:record}=require('../protection-inputs-v1.js');
const {epEngineeringBundleV1:bundle}=require('../engineering-bundle-v1.js');
const sku='ABB-2CDS251001R0164';
const p=()=>({title:'Учебный ЩР',railCount:1,railCapacity:4,
 lines:[{id:'L1',name:'Розетки',phase:'L1',modules:1,catalogSku:sku,device:'C16',power:2.5,
  overloadInput:{ibA:12,izA:20},faultInput:{ikKa:5},route44Input:{declared:true}}],
 branchDevices:[{id:'BR_L1',circuitId:'L1',modules:1,label:'C16'}],sharedDevices:[]});
const catalogue=Object.entries(EP_CATALOG).map(([id,device])=>({id,device}));
test('one circuit links actual catalogue article, shortlist, DIN placement and BOM',()=>{
 const x=p(),work=epProtectionWorkbenchV1(x,epCatalogSku,catalogue,'L1');
 assert.equal(work.selected.candidates.find(c=>c.sku===sku).status,'POTENTIAL');
 const plan=epDraftBoardPlanV1(x,epCatalogSku);
 assert.equal(plan.placements[0].deviceId,'BR_L1');
 const dossier=epCircuitDossierV1(x,epCatalogSku);
 assert.equal(dossier.rows[0].placement.from,1);
 const bom=epDraftBomV1(x,epCatalogSku);
 assert.equal(bom.items[0].sku,'2CDS251001R0164');
 assert.equal(bom.items[0].quantity,1);
 for(const result of [work,plan,dossier,bom])assert.equal(result.engineeringApproved,false);
});
test('editing manually declared currents marks review and invalidates selected article',()=>{
 const original=p(),result=record(original,'L1',{ibA:18,izA:20,ikKa:5});
 assert.equal(result.project.lines[0].calculationReview.required,true);
 const report=epProtectionWorkbenchV1(result.project,epCatalogSku,catalogue,'L1');
 assert.ok(report.selected.reasons.includes('IN_LT_IB'));
 assert.equal(report.selected.status,'BLOCKED');
 assert.equal(original.lines[0].overloadInput.ibA,12);
});
test('missing fault current is incomplete across workbench and dossier',()=>{
 const x=p();delete x.lines[0].faultInput;
 assert.ok(epProtectionWorkbenchV1(x,epCatalogSku,catalogue,'L1').selected.reasons.includes('IK_MISSING_OR_INVALID'));
 assert.ok(epCircuitDossierV1(x,epCatalogSku).issues.some(i=>i.code==='INVALID_OR_MISSING_IKKA'));
});
test('wrong phase cannot silently retain single pole catalogue article',()=>{
 const x=p();x.lines[0].phase='3Ф';
 assert.equal(epProtectionWorkbenchV1(x,epCatalogSku,catalogue,'L1').selected.status,'BLOCKED');
});
test('engineering bundle exports all draft sections without approvals',()=>{
 const x=p(),r=bundle(x,epCatalogSku);
 for(const name of ['dossier','bom','board','layoutAlternatives','protection','engineering'])
  assert.ok(r.sections[name],name);
 assert.equal(r.sections.protection.rows[0].selectedSku,sku);
 assert.equal(r.engineeringApproved,false);assert.equal(r.ready_for_installation,false);
});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createReleaseGate}=require('../catalog-intake/release-gate-v1.js');
test('all three source-staged articles have explicit hold decisions',()=>{
 const r=createReleaseGate();assert.equal(r.stagedCount,3);assert.equal(r.decisions.length,3);assert.equal(r.readyToImport,0);
});
test('ABB existing SKU is enrichment review not a new article',()=>{
 const d=createReleaseGate().decisions.find(x=>x.sku==='2CDS251001R0164');assert.equal(d.action,'REVIEW_ENRICHMENT');
});
test('Schneider existing SKU is enrichment review not a new article',()=>{
 const d=createReleaseGate().decisions.find(x=>x.sku==='A9F74116');assert.equal(d.action,'REVIEW_ENRICHMENT');
});
test('Hager RCD remains blocked for enrichment review after live integration',()=>{
 const d=createReleaseGate().decisions.find(x=>x.sku==='CDA440D');assert.equal(d.action,'REVIEW_ENRICHMENT');assert.equal(d.status,'BLOCKED');assert.equal(d.approval,false);
});
test('release gate cannot automatically merge or claim engineering approval',()=>{
 const r=createReleaseGate();assert.equal(r.autoMergeAllowed,false);assert.equal(r.electricalEngineeringApproved,false);
});
test('release gate does not modify existing catalogue',()=>{
 const before=JSON.stringify(require('../catalog.js').EP_CATALOG);createReleaseGate();assert.equal(JSON.stringify(require('../catalog.js').EP_CATALOG),before);
});
test('release gate retains original source URLs',()=>{
 const r=createReleaseGate();assert.ok(r.decisions.every(x=>x.source?.startsWith('https://')));
});
test('release gate handles an empty staging batch',()=>{
 const r=createReleaseGate([],[],{});assert.equal(r.stagedCount,0);assert.equal(r.readyToImport,0);
});
test('missing evidence blocks a structurally complete synthetic candidate',()=>{
 const c={sku:'SYNTH-01',maker:'TEST',series:'TEST',kind:'MCB',poles:1,modules:1,widthMm:18,inA:16,icnKa:6,icnVoltageV:230,icnStandard:'IEC 60898-1'};
 const r=createReleaseGate([],[c],{});assert.ok(r.decisions[0].unresolved.some(x=>x.code==='FIELD_EVIDENCE_MISSING'));
});

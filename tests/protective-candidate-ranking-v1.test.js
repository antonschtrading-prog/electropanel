'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {EP_CATALOG}=require('../catalog.js');
const {epManufacturerFactsCandidateV1}=require('../manufacturer-facts-reconciliation-v1.js');
const {epProtectiveDeviceShortlistV1}=require('../protective-device-shortlist-v1.js');
const {epProtectiveCandidateRankingV1:rank}=require('../protective-candidate-ranking-v1.js');
const {epProtectionWorkbenchV1:work,epProtectionWorkbenchHtmlV1:html}=require('../protection-workbench-v1.js');
const {epEngineeringPrintV1:print}=require('../engineering-print-v1.js');
global.epManufacturerFactsCandidateV1=epManufacturerFactsCandidateV1;
global.epProtectiveDeviceShortlistV1=epProtectiveDeviceShortlistV1;
global.epProtectiveCandidateRankingV1=rank;
const line=()=>({id:'L1',phase:'L1',catalogSku:'SE-A9F74116',modules:1,
 overloadInput:{ibA:10,izA:20},faultInput:{ikKa:3,voltageV:230}});
const list=()=>Object.entries(EP_CATALOG).map(([id,device])=>({id,device}));
test('provisional ordering contains transparent current, capacity and Icn margins',()=>{
 const l=line(),r=rank(l,epProtectiveDeviceShortlistV1(l,list()));
 const c=r.rows.find(x=>x.catalogKey==='SE-A9F74116');
 assert.equal(c.classification,'PRELIMINARY_CANDIDATE');
 assert.equal(c.currentHeadroomA,6);
 assert.equal(c.cableHeadroomA,4);
 assert.equal(c.breakingHeadroomKa,3);
 assert.equal(c.voltageHeadroomV,0);
 assert.equal(c.sourceStatus,'FACTS_MATCH');
 assert.ok(c.openEvidence.includes('I2_TRIP_TIME_SELECTIVITY_AND_ADS_OUTSTANDING'));
 assert.equal(c.engineeringApproved,false);
});
test('indexed manufacturer contradiction is excluded regardless of favorable numeric margins',()=>{
 const l=line(),a=[{id:'SE-A9F74116',device:{...EP_CATALOG['SE-A9F74116'],sku:'WRONG'}}];
 const r=rank(l,epProtectiveDeviceShortlistV1(l,a));
 assert.equal(r.rows[0].classification,'EXCLUDED');
 assert.ok(r.rows[0].blockingReasons.includes('MANUFACTURER_SOURCE_CONFLICT'));
});
test('missing Ik or operating voltage remain evidence gaps, not an automatic recommendation',()=>{
 const l=line();delete l.faultInput;
 const r=rank(l,epProtectiveDeviceShortlistV1(l,list()));
 const c=r.rows.find(x=>x.catalogKey==='SE-A9F74116');
 assert.equal(c.classification,'INCOMPLETE');
 assert.ok(c.openEvidence.includes('FAULT_VOLTAGE_UNDECLARED'));
 assert.ok(c.openEvidence.includes('IK_MISSING'));
 assert.equal(c.breakingHeadroomKa,null);
 assert.equal(c.engineeringApproved,false);
});
test('evidence ordering stable across repeated runs and input candidate permutations',()=>{
 const l=line(),base=epProtectiveDeviceShortlistV1(l,list());
 const a=rank(l,base).rows.map(x=>x.catalogKey);
 const b=rank(l,{...base,candidates:[...base.candidates].reverse()}).rows.map(x=>x.catalogKey);
 assert.deepEqual(a,b);
 assert.deepEqual(a,rank(l,base).rows.map(x=>x.catalogKey));
});
test('out-of-scope Icu cannot replace missing Icn in ranked candidates',()=>{
 const l=line(),device={...EP_CATALOG['CH-814014'],icnKa:null,icuKa:6};
 const r=rank(l,epProtectiveDeviceShortlistV1(l,[{id:'CH-814014',device}]));
 assert.equal(r.rows[0].classification,'EXCLUDED');
 assert.ok(r.rows[0].blockingReasons.includes('CATALOG_SPEC_INVALID'));
});
test('ranked output preserves original project and manufacturer catalog',()=>{
 const l=line(),orig=JSON.stringify(l),c=JSON.stringify(EP_CATALOG);
 rank(l,epProtectiveDeviceShortlistV1(l,list()));
 assert.equal(JSON.stringify(l),orig);
 assert.equal(JSON.stringify(EP_CATALOG),c);
});
test('workbench and print expose identical provisional ranking and source gaps',()=>{
 const p={lines:[line()]},entries=list(),lookup=k=>EP_CATALOG[k]||null;
 const r=work(p,lookup,entries,'L1');
 assert.ok(r.selected.ranking.rows.some(x=>x.catalogKey==='SE-A9F74116'));
 const h=html(r);
 assert.match(h,/Порядок инженерной проверки кандидатов/);
 assert.match(h,/I2_TRIP_TIME_SELECTIVITY_AND_ADS_OUTSTANDING/);
 const page=print({sections:{protection:r}});
 assert.match(page,/Порядок проверки возможных защитных аппаратов/);
 assert.match(page,/SE-A9F74116/);
 assert.match(page,/PRELIMINARY_CANDIDATE/);
 assert.equal(r.engineeringApproved,false);
});
test('ranking escapes untrusted catalogue strings in workbench presentation',()=>{
 const p={lines:[line()]},c=[{id:'<img src=x onerror=alert(1)>',
  device:{kind:'MCB',maker:'Example',series:'X',sku:'evil',inA:16,
   icnKa:6,poles:1,modules:1,source:'https://example.org'}}];
 const h=html(work(p,()=>null,c,'L1'));
 assert.doesNotMatch(h,/<img /);
 assert.match(h,/&lt;img/);
});
test('production code loads ranking before workbench and does not mutate selected design',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const page=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 assert.ok(page.indexOf('protective-candidate-ranking-v1.js')<
  page.indexOf('protection-workbench-v1.js'));
 const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
 assert.ok(app.includes('epProtectionWorkbenchV1('));
});

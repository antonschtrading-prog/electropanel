'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {EP_CATALOG}=require('../catalog.js');
const {epDraftBomV1,epDraftBomCsvV1,epDraftBomHtmlV1}=require('../draft-bom-v1.js');
const {epEngineeringPrintV1}=require('../engineering-print-v1.js');
function project(sku){return {lines:[{id:'L1',modules:1,catalogSku:sku}],branchDevices:[{id:'B1',circuitId:'L1',modules:1}],sharedDevices:[]};}
test('CSV and HTML explicitly distinguish Icu-only from missing Icn',()=>{
 const r=epDraftBomV1(project('CH-814014'),id=>EP_CATALOG[id]);
 const csv=epDraftBomCsvV1(r),html=epDraftBomHtmlV1(r);
 assert.match(csv,/"Icn кА";"Icn В";"Стандарт Icn";"Icu кА";"Icu В"/);
 const header=csv.split('\r\n')[0].split(';');
 const data=csv.split('\r\n')[1].split(';');
 assert.equal(data[header.indexOf('"Icn кА"')], '""');
 assert.equal(data[header.indexOf('"Icu кА"')], '"6"');
 assert.equal(data[header.indexOf('"Icu В"')], '"230"');
 assert.match(html,/Icn, кА/);assert.match(html,/Icu, кА/);
 assert.match(html,/—<\/td><td>6<\/td>/);
});
test('print report preserves Icn and Icu independently across three tables',()=>{
 const selected=EP_CATALOG['CH-814014'];
 const article={icnKa:selected.icnKa,icuKa:selected.icuKa,icuVoltageV:selected.icuVoltageV,
  icnVoltageV:selected.icnVoltageV,icnStandard:selected.icnStandard};
 const bundle={overallStatus:'UNKNOWN',sections:{
  catalogEvidence:{items:[{role:'circuit',ownerId:'L1',articleId:'CH-814014',...article}]},
  protection:{rows:[{lineId:'L1',selectedSku:'CH-814014',selectedArticle:article,reasons:[],candidates:[]}]},
  bom:{items:[{sku:'814014',maker:'CHINT',series:'NXB-63',quantity:1,modules:1,...article}]}
 }};
 const html=epEngineeringPrintV1(bundle);
 assert.ok((html.match(/Icu, кА/g)||[]).length>=3);
 assert.match(html,/Icu: напряжение, В/);
 assert.match(html,/Icn, кА/);
 assert.doesNotMatch(html,/engineeringApproved=true/);
});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {EP_MANUFACTURER_FACT_REFERENCES_V1,epManufacturerFactsReconciliationV1:check}=
 require('../manufacturer-facts-reconciliation-v1.js');
const {epManufacturerFactsHtmlV1}=require('../manufacturer-facts-ui-v1.js');
const {EP_CATALOG}=require('../catalog.js');
const {epEngineeringPrintV1}=require('../engineering-print-v1.js');
const lookup=k=>EP_CATALOG[k]??null;
const project=()=>({lines:[{id:'L1',catalogSku:'SE-A9F73110'},
 {id:'L2',catalogSku:'ABB-2CDS251001R0164'}]});
global.epManufacturerFactsReconciliationV1=check;
test('indexed real maker product and catalogue records match only stated facts',()=>{
 const r=check(project(),lookup);
 assert.equal(r.rows.length,2);
 assert.equal(r.rows[0].status,'FACTS_MATCH');
 assert.equal(r.rows[0].matchedFields.length,6);
 assert.equal(r.rows[0].sourceId,'SOURCE-SCHNEIDER-A9F73110-2026');
 assert.equal(r.rows[1].status,'INCOMPLETE');
 assert.ok(r.rows[1].missingFields.includes('icnStandard'));
 assert.equal(r.rows[1].sku,'2CDS251001R0164');
 assert.equal(r.engineeringApproved,false);
});
test('an official source of Icn does not manufacture absent energy or time curves',()=>{
 const r=check(project(),lookup);
 for(const x of r.rows){
  for(const key of ['I2T_LET_THROUGH_BANDS','OPERATING_I2','TRIP_UPPER_ENVELOPE'])
   assert.ok(x.unavailableClaims.includes(key));
  assert.equal(x.engineeringApproved,false);
 }
 assert.equal(r.status,'UNKNOWN');
});
test('wrong factory article or rated current is blocking regardless of catalogue verified flag',()=>{
 const p={lines:[{id:'L1',catalogSku:'SE-A9F73110'}]};
 for(const altered of [
  {...lookup('SE-A9F73110'),inA:20},
  {...lookup('SE-A9F73110'),sku:'OTHER',verificationStatus:'VERIFIED'},
  {...lookup('SE-A9F73110'),icnKa:10}
 ]){
  const r=check(p,()=>altered);
  assert.equal(r.status,'BLOCKED');
  assert.ok(r.rows[0].conflictingFields.length);
 }
});
test('unknown maker articles remain unindexed and do not borrow adjacent series facts',()=>{
 const r=check({lines:[{id:'X',catalogSku:'SE-A9F74116'}]},lookup);
 assert.equal(r.rows[0].status,'NOT_INDEXED');
 assert.equal(r.rows[0].sourceUrl,null);
 assert.ok(r.issues.some(x=>x.code==='MANUFACTURER_FACTS_REFERENCE_NOT_INDEXED'));
});
test('duplicate line ids block the reference audit',()=>{
 const p={lines:[{id:'X',catalogSku:'SE-A9F73110'},{id:'X',catalogSku:'SE-A9F73110'}]};
 const r=check(p,lookup);
 assert.equal(r.status,'BLOCKED');
 assert.ok(r.issues.some(x=>x.code==='MANUFACTURER_FACTS_LINE_INVALID'));
});
test('report and UI expose original source location, missing facts and no approval',()=>{
 const p=project(),r=check(p,lookup);
 const html=epEngineeringPrintV1({sections:{manufacturerFacts:r}});
 assert.match(html,/Сверка каталога с опубликованными первичными характеристиками/);
 assert.match(html,/I2T_LET_THROUGH_BANDS/);
 assert.match(html,/PDF page 29/);
 const ui=epManufacturerFactsHtmlV1(p,'L2',lookup);
 assert.match(ui,/Открыть источник производителя/);
 assert.match(ui,/icnStandard/);
 assert.match(ui,/не равно инженерному допуску/);
});
test('source facts are individual read-only citations, not a generated I2t database',()=>{
 assert.equal(EP_MANUFACTURER_FACT_REFERENCES_V1.length,2);
 assert.ok(EP_MANUFACTURER_FACT_REFERENCES_V1.every(x=>x.sourceUrl.startsWith('https://')));
 assert.ok(EP_MANUFACTURER_FACT_REFERENCES_V1.every(x=>!Object.hasOwn(x.fields,'i2t')));
});
test('production browser and bundle include independent manufacturer fact section',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),
 bundle=fs.readFileSync(path.join(root,'engineering-bundle-v1.js'),'utf8'),
 app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.ok(html.indexOf('manufacturer-facts-reconciliation-v1.js')<
  html.indexOf('manufacturer-facts-ui-v1.js'));
 assert.match(html,/manufacturerFactsPanel/);
 assert.match(bundle,/manufacturerFacts=section/);
 assert.match(app,/epManufacturerFactsHtmlV1/);
});

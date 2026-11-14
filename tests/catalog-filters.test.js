'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'..','catalog.js'),'utf8');
const api=vm.runInNewContext(source+'\n({epCatalogMakers,epCatalogSeries,epCatalogFilter,epCatalogSku,epCatalogCompatible,epCatalogDeclaredCurrentIssues})');

test('catalog makers and series are deduplicated and scoped',()=>{
 const makers=Array.from(api.epCatalogMakers());
 assert.deepEqual(makers,['ABB','CHINT','Eaton','Hager','IEK','Legrand','Schneider Electric','Siemens']);
 assert.deepEqual(Array.from(api.epCatalogSeries('IEK')),['KARAT ВА47-29']);
 assert.deepEqual(Array.from(api.epCatalogSeries('missing')),[]);
});
test('manufacturer and series filter retains only matching SKUs',()=>{
 const filtered=Array.from(api.epCatalogFilter('ABB','System pro M S200'));
 assert.equal(filtered.length,1);
 assert.equal(filtered[0][1].sku,'2CDS251001R0164');
 assert.equal(api.epCatalogFilter('IEK','Acti9 iC60N').length,0);
 assert.equal(api.epCatalogFilter().length,11);
});
test('unknown product is never filled with invented catalogue values',()=>{
 assert.equal(api.epCatalogSku('UNKNOWN'),null);
});

test('phase filtering rejects wrong pole counts, without electrical approval',()=>{
 assert.equal(api.epCatalogCompatible('SE-A9F74116','L1'),true);
 assert.equal(api.epCatalogCompatible('SE-A9F74116','3Ф'),false);
 assert.equal(api.epCatalogCompatible('SE-A9F74116',''),false);
 assert.equal(api.epCatalogCompatible('UNKNOWN','L1'),false);
 assert.equal(api.epCatalogFilter('','', '3Ф').length,2);
 assert.equal(api.epCatalogFilter('','', 'L1').length,9);
});

test('declared current is checked against the selected actual rating',()=>{
 const sku='SE-A9F74116';
 const codes=(input)=>Array.from(api.epCatalogDeclaredCurrentIssues(sku,input),x=>x.code);
 assert.deepEqual(codes({ibA:'12',inA:'20',izA:'14'}),[
  'CATALOG_IN_CONFLICT','CATALOG_IN_GT_IZ'
 ]);
 assert.deepEqual(codes({ibA:'17',inA:'16',izA:'20'}),['CATALOG_IB_GT_IN']);
 assert.deepEqual(codes({ibA:'12',inA:'16',izA:'20'}),[]);
});
test('unknown and missing declared numbers never become invented ratings',()=>{
 assert.deepEqual(Array.from(api.epCatalogDeclaredCurrentIssues('UNKNOWN',{inA:'20'})),[]);
 assert.deepEqual(Array.from(api.epCatalogDeclaredCurrentIssues('SE-A9F74116',{ibA:'',izA:'not-known'})),[]);
 assert.deepEqual(Array.from(api.epCatalogDeclaredCurrentIssues('SE-A9F74116',null)),[]);
});

test('official-source Legrand 1P+N uses two electrical poles in one DIN module',()=>{
 const d=api.epCatalogSku('LE-406775');
 assert.equal(d.kind,'MCB');assert.equal(d.poles,2);assert.equal(d.modules,1);
 assert.equal(d.poleConfiguration,'1P+N');assert.equal(d.inA,20);
 assert.equal(d.icnKa,4.5);assert.equal(d.icnVoltageV,230);
 assert.equal(api.epCatalogCompatible('LE-406775','L1'),true);
 assert.equal(api.epCatalogCompatible('LE-406775','3Ф'),false);
});
test('manufacturer-specific dimensions and breaking standard never conflate Legrand Icn with Icu',()=>{
 const records=[
  ['HA-MBN116','Hager',17.5,83,70,16,6,'B'],
  ['LE-406775','Legrand',17.8,94.8,77.7,20,4.5,'C'],
  ['SI-5SL6116-7','Siemens',18,90,76,16,6,'C']
 ];
 for(const [id,maker,w,h,d,current,icn,curve] of records){
  const a=api.epCatalogSku(id);assert.equal(a.maker,maker);assert.equal(a.widthMm,w);
  assert.equal(a.heightMm,h);assert.equal(a.depthMm,d);assert.equal(a.inA,current);
  assert.equal(a.icnKa,icn);assert.equal(a.curve,curve);
  assert.ok(a.source.startsWith('https://'));assert.equal(a.sourceReviewedAt,'2026-11-14');
  assert.equal(api.epCatalogCompatible(id,'L1'),true);
 }
 assert.equal(api.epCatalogSku('LE-406775').icnStandard,'EN 60898-1');
});

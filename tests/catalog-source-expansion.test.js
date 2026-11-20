'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {EP_CATALOG,epCatalogSku,epCatalogCompatible,epBrandCoverage}=require('../catalog.js');
const {epCatalogFrontSvgV1}=require('../catalog-front-svg-v1.js');
test('Eaton 286533 is an identified 1P C16 6kA device with official dimensions',()=>{
 const a=epCatalogSku('EA-286533');
 assert.equal(a.maker,'Eaton');assert.equal(a.sku,'286533');assert.equal(a.inA,16);
 assert.equal(a.icnKa,6);assert.equal(a.icnStandard,'IEC/EN 60898-1');
 assert.deepEqual([a.widthMm,a.heightMm,a.depthMm],[17.7,73,85]);
 assert.equal(epCatalogCompatible('EA-286533','L1'),true);
 assert.equal(epCatalogCompatible('EA-286533','3Ф'),false);
 assert.match(epCatalogFrontSvgV1(a),/data-appearance-family="eaton"/);
});
test('CHINT 814014 maintains distinct Icu and unverified Icn',()=>{
 const a=epCatalogSku('CH-814014');
 assert.equal(a.maker,'CHINT');assert.equal(a.sku,'814014');
 assert.equal(a.icuKa,6);assert.equal(a.icnKa,null);
 assert.equal(a.icuVoltageV,230);
 assert.equal(a.curve,'C');assert.equal(a.inA,16);assert.equal(a.poles,1);
 assert.equal(epCatalogCompatible('CH-814014','L2'),true);
 assert.match(epCatalogFrontSvgV1(a),/data-appearance-family="chint"/);
});
test('new records are counted as articles and do not fill remaining brands',()=>{
 assert.equal(Object.keys(EP_CATALOG).length,12);
 const c=epBrandCoverage().flatMap(g=>g.makers);
 assert.equal(c.find(x=>x.maker==='Eaton').articles,1);
 assert.equal(c.find(x=>x.maker==='CHINT').articles,1);
 assert.equal(c.find(x=>x.maker==='Panasonic').articles,0);
});
test('14 selected brands have distinct navigation styles when previewed',()=>{
 const brands=['IEK','CHINT','Systeme Electric','DEKraft','Himel','Schneider Electric','Legrand','Panasonic','ABB','Siemens','Hager','Schrack Technik','КЭАЗ','Eaton'];
 const families=brands.map(maker=>{
  const svg=epCatalogFrontSvgV1({maker,sku:'DECLARED',series:'TEST',kind:'MCB',poles:1,modules:1,widthMm:18});
  assert.match(svg,/Условный эскиз/);
  const family=svg.match(/data-appearance-family="([^"]+)"/)?.[1];
  assert.ok(family&&family!=='neutral',maker);return family;
 });
 assert.equal(new Set(families).size,14);
});

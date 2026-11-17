'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const section=app.slice(app.indexOf('function renderCabinetArticleReconciliationV1()'),
 app.indexOf('function renderBoard(){'));
test('gallery search and inventory engines load before app',()=>{
 for(const src of ['cabinet-front-gallery-model-v1.js','cabinet-front-inventory-csv-v1.js']){
  assert.ok(html.indexOf('src="'+src+'"')>0);
  assert.ok(html.indexOf('src="'+src+'"')<html.indexOf('src="app.js"'));
 }
});
test('gallery supports maker filter, text search and 12-card pagination',()=>{
 assert.match(section,/makerFilter\.addEventListener\('change'/);
 assert.match(section,/search\.addEventListener\('input'/);
 assert.match(section,/more\.addEventListener\('click'/);
 assert.match(section,/pageSize:12/);
 assert.match(section,/grid\.replaceChildren\(\)/);
 assert.match(section,/more\.hidden=!result\.hasMore/);
});
test('gallery inventory export reads fresh reconciliation, not stale UI',()=>{
 assert.match(section,/const fresh=epCabinetArticleReconciliationV1\(state,catalogDevice\)/);
 assert.match(section,/epCabinetFrontInventoryCsvV1\(fresh\.rows,catalogDevice/);
 assert.match(section,/epManufacturerFrontResolveV1\)/);
 assert.match(section,/_front_inventory\.csv/);
});
test('gallery text uses safe DOM assignment and SVG XML parser',()=>{
 assert.match(section,/title\.textContent=/);
 assert.match(section,/code\.textContent=sku/);
 assert.match(section,/new DOMParser\(\)/);
 assert.doesNotMatch(section,/innerHTML/);
});

test('gallery filters unverified images without treating SVG as manufacturer photography',()=>{
 assert.match(section,/evidenceFilter\.setAttribute\('aria-label'/);
 assert.match(section,/\['REVIEWED_IMAGE','Проверенные изображения'\]/);
 assert.match(section,/\['STYLIZED_ONLY','Авторские эскизы'\]/);
 assert.match(section,/\['CATALOGUE_MISSING','Артикул не найден'\]/);
 assert.match(section,/evidenceFilter\.addEventListener\('change'/);
 assert.match(section,/resolve:epManufacturerFrontResolveV1/);
});

test('gallery can locate a selected article by SKU on the live DIN board',()=>{
 assert.match(section,/locate\.textContent='Найти на DIN-рейке'/);
 assert.match(section,/document\.querySelectorAll\('#boardCanvas \.din-apparatus'\)/);
 assert.match(section,/x\.dataset\.catalogSku===sku/);
 assert.match(section,/node\.scrollIntoView/);
 assert.match(section,/node\.click\(\)/);
 assert.match(app,/d\.dataset\.catalogSku=l\.catalogSku\|\|''/);
});

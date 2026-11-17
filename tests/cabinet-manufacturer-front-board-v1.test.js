'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../styles.css'),'utf8');
const board=app.slice(app.indexOf('function renderBoard(){'),app.indexOf('function renderBoard(){')+6000);
const {epCatalogFrontSvgV1}=require('../catalog-front-svg-v1.js');
const {epManufacturerVisualHtmlV1}=require('../manufacturer-visual-library-v1.js');
const device=(maker,series,kind='MCB',poles=1,modules=1)=>({
 maker,series,kind,poles,modules,sku:maker+'-16',label:'C16',widthMm:18*modules,inA:16,curve:'C'
});
test('manufacturer SVG and rights-aware image library load before board app',()=>{
 for(const script of ['catalog-front-svg-v1.js','manufacturer-visual-library-v1.js']){
  assert.ok(html.indexOf(script)>=0);
  assert.ok(html.indexOf(script)<html.indexOf('src="app.js"'));
 }
});
test('board renders manufacturer front only for catalogue-resolved devices',()=>{
 assert.match(board,/const renderedFront=cat&&typeof epManufacturerVisualHtmlV1/);
 assert.match(board,/epManufacturerVisualHtmlV1\(cat,boardId\|\|l\.id\)/);
 assert.match(board,/d\.classList\.add\('ep-catalog-front-active'\)/);
 assert.match(board,/ep-front-viewport/);
 assert.match(board,/LEGACY_PLACEHOLDER/);
 assert.match(board,/epDeviceVisualEvidenceHtmlV1\(visual\)/);
});
test('manufacturer rendering remains a conditional, not a claim of verified photography',()=>{
 assert.match(board,/asset\?\.status==='REVIEWED_IMAGE'/);
 assert.match(board,/d\.dataset\.manufacturerImageVerified/);
 assert.match(css,/ep-manufacturer-front-image/);
 assert.match(css,/ep-manufacturer-front\{/);
});
test('SVG fronts differ by manufacturer color and by protective device kind',()=>{
 const abb=epCatalogFrontSvgV1(device('ABB','S200'),'B1');
 const schneider=epCatalogFrontSvgV1(device('Schneider Electric','Acti9'),'B1');
 assert.match(abb,/data-appearance-family="abb"/);
 assert.match(schneider,/data-appearance-family="schneider"/);
 assert.notEqual(abb,schneider);
 const rcd=epCatalogFrontSvgV1(device('ABB','F200','RCD',2,2),'B2');
 assert.match(rcd,/data-test-control="true"/);
 const relay=epCatalogFrontSvgV1(device('ABB','E290','RELAY',2,2),'B3');
 assert.match(relay,/data-coil="true"/);
 const meter=epCatalogFrontSvgV1(device('ABB','B23','METER',4,4),'B4');
 assert.match(meter,/data-display="true"/);
});
test('vector front escapes untrusted catalogue labels and cannot inject markup',()=>{
 const d=device('ABB<script>alert(1)</script>','S200&"');
 d.sku='X</text><script>alert(1)</script>';
 const svg=epCatalogFrontSvgV1(d,'B1');
 assert.doesNotMatch(svg,/<script>/);
 assert.match(svg,/&lt;script&gt;/);
 assert.match(svg,/&amp;/);
});
test('SVG is original illustration when no rights-reviewed image exists',()=>{
 const previous=global.epCatalogFrontSvgV1;
 global.epCatalogFrontSvgV1=epCatalogFrontSvgV1;
 try{
  const markup=epManufacturerVisualHtmlV1(device('ABB','S200'),'B1');
  assert.match(markup,/<svg /);
  assert.doesNotMatch(markup,/<img /);
  assert.match(markup,/aria-label="Иллюстрация/);
 }finally{global.epCatalogFrontSvgV1=previous;}
});

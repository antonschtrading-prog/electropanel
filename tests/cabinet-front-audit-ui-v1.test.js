'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../styles.css'),'utf8');
const section=app.slice(app.indexOf('function renderCabinetArticleReconciliationV1()'),
 app.indexOf('function renderBoard(){'));
test('gallery audit engine loads before application render',()=>{
 assert.ok(html.indexOf('src="cabinet-front-gallery-v1.js"')>0);
 assert.ok(html.indexOf('src="cabinet-front-gallery-v1.js"')<html.indexOf('src="app.js"'));
});
test('gallery audit receives the same cross-view report and catalogue lookup',()=>{
 assert.match(section,/epCabinetFrontGalleryV1\(report,catalogDevice,epManufacturerFrontResolveV1\)/);
});
test('gallery audit reports physical uncertainty separately from visual evidence',()=>{
 for(const term of ['totals.apparatus','totals.articles','totals.reviewedImages',
  'totals.vectorSketches','totals.rejectedImages','totals.missingArticles',
  'totals.unknownGeometry'])assert.ok(section.includes(term),term);
 assert.match(section,/frontReport\.status==='BLOCKED'/);
});
test('gallery audit status is exposed as accessible text and DOM state',()=>{
 assert.match(section,/audit\.textContent=/);
 assert.match(section,/audit\.dataset\.frontAuditStatus=frontReport\.status/);
 assert.match(css,/data-front-audit-status="BLOCKED"/);
});

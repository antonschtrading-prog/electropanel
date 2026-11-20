'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
test('article reconciliation script is loaded after board and BOM engines',()=>{
 for(const file of ['draft-bom-v1.js','board-visual-audit-v1.js','cabinet-article-reconciliation-v1.js'])
  assert.ok(html.includes('src="'+file+'"'));
 assert.ok(html.indexOf('board-visual-audit-v1.js')<html.indexOf('cabinet-article-reconciliation-v1.js'));
 assert.ok(html.indexOf('draft-bom-v1.js')<html.indexOf('cabinet-article-reconciliation-v1.js'));
});
test('board workspace exposes live article reconciliation region',()=>{
 assert.match(html,/id="cabinetArticleReconciliation"/);
 assert.match(app,/function renderCabinetArticleReconciliationV1\(\)/);
 assert.match(app,/renderCabinetArticleReconciliationV1\(\);/);
});
test('diagnostics use safe textContent for catalogue and SKU data',()=>{
 const block=app.slice(app.indexOf('function renderCabinetArticleReconciliationV1()'),
  app.indexOf('function renderBoard(){'));
 assert.match(block,/li\.textContent=/);
 assert.match(block,/target\.replaceChildren\(\)/);
 assert.doesNotMatch(block,/innerHTML/);
 assert.match(block,/report\.issues\.filter\(x=>x\.level==='BLOCKED'\)/);
});

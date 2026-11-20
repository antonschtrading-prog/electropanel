'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const start=app.indexOf('function renderCabinetArticleReconciliationV1()');
const end=app.indexOf('function renderBoard(){',start);
const ui=app.slice(start,end);
test('replacement engine is loaded after reconciliation and before app',()=>{
 const a=html.indexOf('src="cabinet-article-reconciliation-v1.js"');
 const b=html.indexOf('src="cabinet-article-replacement-v1.js"');
 const c=html.indexOf('src="app.js"');
 assert.ok(a>=0&&b>a&&c>b);
});
test('cabinet editor exposes apparatus identity and catalogue SKU inputs',()=>{
 assert.match(ui,/idSelect=document\.createElement\('select'\)/);
 assert.match(ui,/skuInput=document\.createElement\('input'\)/);
 assert.match(ui,/skuInput\.maxLength=200/);
 assert.match(ui,/idSelect\.appendChild\(option\)/);
});
test('replacement requires preview and separate explicit apply',()=>{
 assert.match(ui,/previewButton\.addEventListener\('click'/);
 assert.match(ui,/applyButton\.addEventListener\('click'/);
 assert.match(ui,/applyButton\.disabled=true/);
 assert.match(ui,/candidate\.status!=='REVIEW_REQUIRED'/);
 assert.match(ui,/checked\.status!=='REVIEW_REQUIRED'/);
});
test('changing input invalidates previous preview',()=>{
 assert.match(ui,/idSelect\.addEventListener\('change',invalidate\)/);
 assert.match(ui,/skuInput\.addEventListener\('input',invalidate\)/);
});
test('external state changes invalidate pending preview',()=>{
 assert.match(ui,/signature:JSON\.stringify\(state\)/);
 assert.match(ui,/proposed\.signature!==JSON\.stringify\(state\)/);
});
test('successful apply enters undo history and refreshes derived views',()=>{
 assert.match(ui,/checkpoint\(\);state=checked\.project;changed\(\)/);
 assert.match(ui,/Компоновка и спецификация пересчитаны/);
});
test('replacement UI never inserts user-controlled markup',()=>{
 assert.doesNotMatch(ui,/innerHTML/);
 assert.match(ui,/result\.textContent=/);
 assert.match(ui,/option\.textContent=/);
});

test('replacement editor suggests project catalogue SKUs with manufacturer and series',()=>{
 assert.match(ui,/suggestions=document\.createElement\('datalist'\)/);
 assert.match(ui,/epProjectCatalogV1\(state,/);
 assert.match(ui,/Object\.entries\(articles\)\.slice\(0,400\)/);
 assert.match(ui,/article\.maker,article\.series,article\.label/);
 assert.match(ui,/skuInput\.setAttribute\('list',suggestions\.id\)/);
 assert.match(ui,/option\.value=sku/);
});

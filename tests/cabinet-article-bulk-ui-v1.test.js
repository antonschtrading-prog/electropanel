'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const section=app.slice(app.indexOf('function renderCabinetArticleReconciliationV1()'),
 app.indexOf('function renderBoard(){'));
test('bulk migration module loads after single replacement engine',()=>{
 assert.ok(html.indexOf('cabinet-article-bulk-replacement-v1.js')>
  html.indexOf('cabinet-article-replacement-v1.js'));
 assert.ok(html.indexOf('cabinet-article-bulk-replacement-v1.js')<
  html.indexOf('src="app.js"'));
});
test('bulk migration UI only suggests selected board articles as sources',()=>{
 assert.match(section,/new Set\(report\.rows\.map\(x=>x\.boardSku\)/);
 assert.match(section,/source\.appendChild\(option\)/);
 assert.match(section,/destination\.setAttribute\('list','cabinetArticleReplacementSuggestions'\)/);
});
test('bulk preview and apply are separate guarded interactions',()=>{
 assert.match(section,/preview\.addEventListener\('click'/);
 assert.match(section,/apply\.addEventListener\('click'/);
 assert.match(section,/apply\.disabled=true/);
 assert.match(section,/pending\.signature!==JSON\.stringify\(state\)/);
 assert.match(section,/checked\.status!=='REVIEW_REQUIRED'/);
});
test('bulk apply saves undo checkpoint and refreshes project',()=>{
 assert.match(section,/checkpoint\(\);state=checked\.project;changed\(\)/);
});
test('bulk UI reports affected count and relocated apparatus identifiers',()=>{
 assert.match(section,/candidate\.preview\.replacedCount/);
 assert.match(section,/candidate\.preview\.relocatedDeviceIds\.join/);
 assert.doesNotMatch(section,/innerHTML/);
});

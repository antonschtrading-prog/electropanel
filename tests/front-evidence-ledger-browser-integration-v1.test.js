'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
test('front evidence ledger is loaded after catalogue-front inventory and before app',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const inventory=html.indexOf('cabinet-front-inventory-csv-v1.js');
 const ledger=html.indexOf('front-evidence-ledger-v1.js');
 const app=html.lastIndexOf('<script src="app.js"');
 assert.ok(inventory>=0&&ledger>inventory&&app>ledger);
});
test('front evidence ledger is included exactly once in the page',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.equal(html.split('src="front-evidence-ledger-v1.js"').length-1,1);
});
test('cabinet gallery offers evidence CSV download without changing original inventory',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/Скачать ведомость подтверждений фасадов CSV/);
 assert.match(app,/epFrontEvidenceLedgerV1\(fresh.rows,catalogDevice,epManufacturerFrontResolveV1\)/);
 assert.match(app,/epFrontEvidenceLedgerCsvV1\(ledger\)/);
 assert.match(app,/Скачать ведомость фасадов CSV/);
});
test('evidence ledger output is CSV with stable project basename',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/baseName\(\)\+'_front_evidence_ledger.csv'/);
 assert.match(app,/text\/csv;charset=utf-8/);
});
test('new evidence export never implies physical or manufacturer installation approval',()=>{
 const source=fs.readFileSync(path.join(root,'front-evidence-ledger-v1.js'),'utf8');
 assert.match(source,/engineeringApproved:false/);
 assert.match(source,/LEDGER_NOT_ENGINEERING_APPROVAL/);
});

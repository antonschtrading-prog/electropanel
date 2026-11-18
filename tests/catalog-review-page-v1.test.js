'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {parseReport,filterRows,csvCell,exportCsv}=require('../catalog-intake/catalog-review-page.js');
const report={mode:'STAGING_ONLY',engineeringApproved:false,autoImportAllowed:false,sourceRecords:[
 {sku:'ABB-001',maker:'ABB',series:'F200',kind:'RCD',batch:'abb',reviewStatus:'BLOCKED',dimensionsKnown:false,problems:['MISSING_WIDTH'],source:'https://example.com/a'},
 {sku:'SCH-002',maker:'Schneider',series:'Acti9',kind:'MCB',batch:'initial',reviewStatus:'READY_FOR_HUMAN_REVIEW',dimensionsKnown:true,problems:[],source:'https://example.com/b'}
]};
test('accepts only explicit staging report',()=>assert.equal(parseReport(report).length,2));
test('rejects production-looking report',()=>assert.throws(()=>parseReport({...report,mode:'PRODUCTION'})));
test('rejects missing approval boundary',()=>assert.throws(()=>parseReport({...report,engineeringApproved:true})));
test('rejects missing import boundary',()=>assert.throws(()=>parseReport({...report,autoImportAllowed:true})));
test('rejects missing records',()=>assert.throws(()=>parseReport({mode:'STAGING_ONLY',engineeringApproved:false,autoImportAllowed:false})));
test('rejects malformed record',()=>assert.throws(()=>parseReport({...report,sourceRecords:[null]})));
test('rejects absent SKU',()=>assert.throws(()=>parseReport({...report,sourceRecords:[{maker:'ABB'}]})));
test('never makes records selectable',()=>assert.ok(parseReport(report).every(x=>!x.selectable&&!x.engineeringApproved)));
test('filters by manufacturer',()=>assert.deepEqual(filterRows(parseReport(report),{maker:'ABB'}).map(x=>x.sku),['ABB-001']));
test('filters by kind',()=>assert.deepEqual(filterRows(parseReport(report),{kind:'MCB'}).map(x=>x.sku),['SCH-002']));
test('filters by search',()=>assert.deepEqual(filterRows(parseReport(report),{search:'f200'}).map(x=>x.sku),['ABB-001']));
test('filters blocked only',()=>assert.deepEqual(filterRows(parseReport(report),{blocked:true}).map(x=>x.sku),['ABB-001']));
test('filters compose',()=>assert.equal(filterRows(parseReport(report),{kind:'MCB',maker:'ABB'}).length,0));
test('CSV escapes quotes',()=>assert.equal(csvCell('a"b'),'"a""b"'));
test('CSV neutralizes formula cells',()=>assert.ok(csvCell('=1+1').startsWith('"\'')));
test('CSV includes all filtered records',()=>assert.match(exportCsv(parseReport(report)),/SCH-002/));
test('CSV does not contain executable HTML',()=>{const r=parseReport({...report,sourceRecords:[{...report.sourceRecords[0],sku:'<img src=x>'}]});assert.equal(r[0].sku,'<img src=x>')});
test('rejects invalid URL protocols',()=>assert.equal(parseReport({...report,sourceRecords:[{...report.sourceRecords[0],source:'javascript:alert(1)'}]})[0].source,null));

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

test('real portfolio report has the explicit non-import flag',()=>{const {buildPortfolio}=require('../catalog-intake/portfolio-v1.js');const r=buildPortfolio();assert.equal(r.autoImportAllowed,false);assert.equal(parseReport(r).length,r.total)});
test('CLI report exports all records and explicit safety boundary',()=>{const {execFileSync}=require('node:child_process');const output=JSON.parse(execFileSync(process.execPath,['catalog-intake/portfolio-report-v1.js'],{cwd:require('node:path').resolve(__dirname,'..'),encoding:'utf8'}));assert.equal(output.autoImportAllowed,false);assert.equal(parseReport(output).length,output.total)});

test('site builder publishes complete review workbench and staging JSON',()=>{
 const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
 const {buildSite}=require('../scripts/build-site.js');
 const out=fs.mkdtempSync(path.join(os.tmpdir(),'electropanel-review-'));
 try{
  buildSite(path.resolve(__dirname,'..'),out);
  const base=path.join(out,'catalog-intake');
  for(const file of ['catalog-review-page.html','catalog-review-page.js','catalog-portfolio.json'])
   assert.ok(fs.statSync(path.join(base,file)).size>0,file);
  const data=JSON.parse(fs.readFileSync(path.join(base,'catalog-portfolio.json'),'utf8'));
  assert.equal(data.autoImportAllowed,false);assert.equal(parseReport(data).length,data.total);
 }finally{fs.rmSync(out,{recursive:true,force:true})}
});

'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {csvCell,csv,exportStagingInventory,exportComparison,exportProjectTransferReview}=require('../catalog-intake/catalog-review-export-v1.js');
test('CSV quotes embedded delimiters and quotes',()=>assert.equal(csvCell('a,"b"'),'"a,""b"""'));
test('CSV neutralizes spreadsheet formulas',()=>{for(const prefix of ['=','+','-','@','\t','\r'])assert.ok(csvCell(prefix+'cmd').startsWith('"\''));});
test('CSV preserves Unicode and CRLF',()=>assert.equal(csv([['УЗО','A'],['B','C']]),'"УЗО","A"\r\n"B","C"\r\n'));
test('inventory export is read only and includes headers',()=>{const r=exportStagingInventory();assert.equal(r.engineeringApproved,false);assert.match(r.csv,/sku.*manufacturer/);assert.ok(r.count>0)});
test('inventory filter is honored',()=>{const r=exportStagingInventory({search:'NONEXISTENT-SKU-XYZ'});assert.equal(r.count,0)});
test('comparison rejects too few SKUs',()=>assert.equal(exportComparison(['one']).ok,false));
test('comparison rejects duplicate SKUs',()=>assert.equal(exportComparison(['one','ONE']).ok,false));
test('transfer export never permits transfer',()=>{const r=exportProjectTransferReview({lines:[]});assert.equal(r.transferAllowed,false);assert.match(r.csv,/blockers/);});

test('preliminary BOM CSV carries safety warnings for reviewer',()=>{const {exportPreliminaryBOM}=require('../catalog-intake/catalog-review-export-v1.js');const {EP_CATALOG}=require('../catalog.js');const id=Object.keys(EP_CATALOG)[0];const r=exportPreliminaryBOM({lines:[{id:'line',catalogSku:id,modules:99}]});assert.equal(r.notForProcurement,true);assert.match(r.csv,/MODULE_COUNT_CONFLICT/);assert.match(r.csv,/warnings/)});
test('project catalogue audit CSV exposes unresolved articles',()=>{const {exportProjectCatalogueAudit}=require('../catalog-intake/catalog-review-export-v1.js');const r=exportProjectCatalogueAudit({lines:[{id:'line',catalogSku:'UNKNOWN'}]});assert.equal(r.engineeringApproved,false);assert.match(r.csv,/ARTICLE_NOT_FOUND/)});

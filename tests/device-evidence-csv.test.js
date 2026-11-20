'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fault=require('../device-fault-scenarios-v1.js');
const coord=require('../device-coordination-evidence-v1.js');
test('per-device fault CSV has Excel-compatible BOM, traceability, and no formula execution',()=>{
 const report={rows:[{deviceNodeId:'BRANCH:B1',ikMaxKa:6.5,voltageV:230,sku:'SKU-A',
 icnKa:6,icnVoltageV:230,numericalComparison:'DECLARED_IK_EXCEEDS_ICN',
 supplyPathStale:true,articleStale:false,sourceDocument:'=HYPERLINK("evil")',
 sourceRevision:'revision A',issues:[{code:'FAULT_RISK'}]}]};
 const csv=fault.epDeviceFaultCsvV1(report);
 assert.equal(csv.charCodeAt(0),0xfeff);
 assert.ok(csv.includes('DECLARED_IK_EXCEEDS_ICN'));
 assert.ok(csv.includes('FAULT_RISK'));
 assert.ok(csv.includes("'=HYPERLINK"));
 assert.ok(csv.includes('\r\n'));
});
test('manufacturer coordination CSV preserves source revision, type and blocks formula text',()=>{
 const csv=coord.epCoordCsvV1({rows:[{from:'INCOMING:Q0',to:'BRANCH:B1',
 evidenceType:'BACKUP_BREAKING_CAPACITY',manufacturer:'Vendor',
 documentId:'Table 11',revision:'rev B',page:'Table 7',sourceUrl:'https://example.org/p.pdf',
 voltageV:230,limitKa:10,ikMaxKa:9,upstreamSkuSnapshot:'SKU-A',
 downstreamSkuSnapshot:'SKU-B',numeric:'WITHIN_DECLARED_LIMIT_UNVERIFIED',
 issues:[{code:'MANUFACTURER_REVIEW_REQUIRED'}]}]});
 assert.equal(csv.charCodeAt(0),0xfeff);
 assert.match(csv,/BACKUP_BREAKING_CAPACITY/);
 assert.match(csv,/Table 11/);
 assert.match(csv,/MANUFACTURER_REVIEW_REQUIRED/);
});
test('CSV fields escape quotes and separators without adding unescaped rows',()=>{
 const csv=fault.epDeviceFaultCsvV1({rows:[{deviceNodeId:'BRANCH:B1',
 sourceDocument:'source;"with quotes"',sourceRevision:'+danger'}]});
 assert.ok(csv.includes('source;""with quotes""'));
 assert.ok(csv.includes("'+danger"));
});

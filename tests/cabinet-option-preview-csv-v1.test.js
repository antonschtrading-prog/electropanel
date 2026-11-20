'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epCabinetOptionPreviewCsvV1:csv}=require('../cabinet-option-preview-csv-v1');
const preview=()=>({status:'REVIEW_REQUIRED',rows:[{deviceId:'A',article:'S200',modules:2,
 fromRail:0,fromSlot:0,toRail:1,toSlot:2,railChanged:true,changed:true},
 {deviceId:'B',article:null,modules:1,fromRail:0,fromSlot:2,toRail:0,toSlot:2,
 railChanged:false,changed:false}]});
test('valid preview exports',()=>assert.equal(csv(preview()).status,'REVIEW_REQUIRED'));
test('two data rows',()=>assert.equal(csv(preview()).rows,2));
test('Excel BOM',()=>assert.ok(csv(preview()).csv.startsWith('\uFEFF')));
test('semicolon delimiters',()=>assert.ok(csv(preview()).csv.includes(';')));
test('CRLF delimiters',()=>assert.ok(csv(preview()).csv.includes('\r\n')));
test('ends with CRLF',()=>assert.ok(csv(preview()).csv.endsWith('\r\n')));
test('column for old rail',()=>assert.ok(csv(preview()).csv.includes('from_rail')));
test('column for new rail',()=>assert.ok(csv(preview()).csv.includes('to_rail')));
test('column for old slot',()=>assert.ok(csv(preview()).csv.includes('from_module')));
test('column for new slot',()=>assert.ok(csv(preview()).csv.includes('to_module')));
test('one-based rail export',()=>assert.ok(csv(preview()).csv.includes('"2";"3"')));
test('module width preserved',()=>assert.ok(csv(preview()).csv.includes('"S200";"2"')));
test('movement flags',()=>assert.ok(csv(preview()).csv.includes('"YES";"YES"')));
test('no movement flags',()=>assert.ok(csv(preview()).csv.includes('"NO";"NO"')));
test('never approves engineering',()=>assert.equal(csv(preview()).engineeringApproved,false));
test('export marks not approved',()=>assert.ok(csv(preview()).csv.includes('engineering_approved')));
test('export contains NO approval',()=>assert.ok(csv(preview()).csv.includes('"NO"')));
test('null input blocked',()=>assert.equal(csv(null).status,'BLOCKED'));
test('blocked input blocked',()=>assert.equal(csv({...preview(),status:'BLOCKED'}).status,'BLOCKED'));
test('missing rows blocked',()=>assert.equal(csv({status:'REVIEW_REQUIRED'}).status,'BLOCKED'));
test('CSV formula injection escaped',()=>assert.ok(csv({...preview(),rows:[{...preview().rows[0],deviceId:'=1+1'}]}).csv.includes("'=1+1")));
test('CSV quotes escaped',()=>assert.ok(csv({...preview(),rows:[{...preview().rows[0],deviceId:'A"B'}]}).csv.includes('A""B')));
test('empty rows valid',()=>assert.equal(csv({status:'REVIEW_REQUIRED',rows:[]}).rows,0));
test('deterministic export',()=>assert.equal(csv(preview()).csv,csv(preview()).csv));
test('does not mutate preview',()=>{const p=preview(),before=JSON.stringify(p);csv(p);assert.equal(JSON.stringify(p),before)});

'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {epDraftBomV1:bom,epDraftBomCsvV1:csv,epDraftBomHtmlV1:html}=require('../draft-bom-v1.js');
const p=()=>({lines:[{id:'L1',modules:1,catalogSku:'A'},{id:'L2',modules:1,catalogSku:'A'}],
 railCount:1,railCapacity:6,sharedDevices:[{id:'R1',modules:2,catalogSku:'R'}]});
const lookup=k=>k==='A'?{sku:'M1',maker:'ABB',series:'S',kind:'MCB',modules:1,widthMm:18,source:'https://example.org/a'}:
 k==='R'?{sku:'RCD',maker:'ABB',series:'S',kind:'RCD',modules:2,source:'https://example.org/r'}:null;
test('same article groups by key, separate shared RCD remains separate',()=>{
 const r=bom(p(),lookup);assert.equal(r.distinctArticles,2);assert.equal(r.totalCataloguedDevices,3);
 assert.equal(r.items.find(x=>x.key==='A').quantity,2);assert.deepEqual(r.items.find(x=>x.key==='A').owners,['L1','L2']);
});
test('missing article is explicit unknown and never guessed',()=>{const x=p();delete x.lines[0].catalogSku;const r=bom(x,lookup);assert.ok(r.issues.some(i=>i.code==='SKU_MISSING'));assert.equal(r.totalCataloguedDevices,2);});
test('unknown article blocks',()=>{const x=p();x.lines[0].catalogSku='UNKNOWN';assert.equal(bom(x,lookup).status,'BLOCKED');});
test('width conflict blocks without overwriting user model',()=>{const x=p();x.lines[0].modules=2;assert.ok(bom(x,lookup).issues.some(i=>i.code==='WIDTH_MISMATCH'));});
test('duplicate branch mapping is blocked',()=>{const x=p();x.branchDevices=[{id:'B1',circuitId:'L1',modules:1},{id:'B2',circuitId:'L1',modules:1}];assert.ok(bom(x,lookup).issues.some(i=>i.code==='BRANCH_DUPLICATE'));});
test('orphan branch is blocked',()=>{const x=p();x.branchDevices=[{id:'BX',circuitId:'missing',modules:1}];assert.ok(bom(x,lookup).issues.some(i=>i.code==='BRANCH_ORPHAN'));});
test('CSV formula-like names are neutralized',()=>{const r=bom(p(),k=>({...lookup(k),maker:'=HYPERLINK(1)'}));assert.match(csv(r),/"'=HYPERLINK\(1\)"/);});
test('HTML escapes supplier and SKU text',()=>{const r=bom(p(),k=>({...lookup(k),maker:'<script>alert(1)</script>'}));assert.doesNotMatch(html(r),/<script>/);assert.match(html(r),/&lt;script&gt;/);});
test('no project blocked',()=>assert.equal(bom(null).status,'BLOCKED'));
test('no implicit engineering approval',()=>{const r=bom(p(),lookup);assert.equal(r.engineeringApproved,false);assert.equal(r.ready_for_installation,false);});
test('BOM leaves project unchanged',()=>{const x=p(),before=JSON.stringify(x);bom(x,lookup);assert.equal(JSON.stringify(x),before);});

test('BOM shows number of devices with missing catalogue evidence',()=>{
 const x=p();delete x.lines[0].catalogSku;
 const r=bom(x,lookup);assert.equal(r.expectedDevices,3);assert.equal(r.totalCataloguedDevices,2);
 assert.equal(r.missingDevices,1);assert.match(html(r),/без подтверждённого артикула: 1/);
});
test('BOM issue details are escaped in HTML',()=>{
 const x=p();x.lines[0].id='<img src=x onerror=alert(1)>';delete x.lines[0].catalogSku;
 const h=html(bom(x,lookup));assert.doesNotMatch(h,/<img/);assert.match(h,/&lt;img/);
});

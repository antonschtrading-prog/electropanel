'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
global.epProtectionPositiveV1=require('../protective-device-shortlist-v1.js').epProtectionPositiveV1;
global.epProtectiveDeviceShortlistV1=require('../protective-device-shortlist-v1.js').epProtectiveDeviceShortlistV1;
const {epProtectionWorkbenchV1:work,epProtectionWorkbenchHtmlV1:html}=require('../protection-workbench-v1.js');
const catalog=[{id:'A',device:{kind:'MCB',maker:'ABB',series:'S200',sku:'S201-C16',inA:16,icnKa:6,poles:1,modules:1,source:'https://example.org'}},
{id:'B',device:{kind:'MCB',maker:'IEK',series:'KARAT',sku:'C25',inA:25,icnKa:4.5,poles:1,modules:1,source:'https://example.org'}}];
const lookup=id=>catalog.find(x=>x.id===id)?.device||null;
const project=()=>({lines:[{id:'L1',name:'Кухня',phase:'L1',catalogSku:'A',modules:1,
 overloadInput:{ibA:12,izA:20},faultInput:{ikKa:5}},
 {id:'L2',name:'Насос',phase:'L2',modules:1}]});
test('selected article and declared currents are traceable',()=>{
 const r=work(project(),lookup,catalog,'L1');assert.equal(r.selected.ibA,12);
 assert.equal(r.selected.ikKa,5);assert.equal(r.selected.selectedArticle.inA,16);
 assert.equal(r.selected.candidates.find(x=>x.sku==='A').status,'POTENTIAL');
 assert.equal(r.engineeringApproved,false);
});
test('selected incompatible article blocks',()=>{
 const x=project();x.lines[0].catalogSku='B';
 const r=work(x,lookup,catalog,'L1');assert.equal(r.selected.status,'BLOCKED');
 assert.ok(r.selected.reasons.includes('IN_GT_IZ'));
});
test('stale review remains unknown even with plausible article',()=>{
 const x=project();x.lines[0].calculationReview={required:true};
 assert.ok(work(x,lookup,catalog,'L1').selected.reasons.includes('CALCULATION_REVIEW_STALE'));
});
test('missing fault input is not assumed',()=>{
 const x=project();delete x.lines[0].faultInput;
 assert.ok(work(x,lookup,catalog,'L1').selected.reasons.includes('IK_MISSING_OR_INVALID'));
});
test('unknown selected article blocks',()=>{
 const x=project();x.lines[0].catalogSku='BAD';
 assert.equal(work(x,lookup,catalog,'L1').selected.status,'BLOCKED');
});
test('catalogue module mismatch blocks',()=>{
 const x=project();x.lines[0].modules=2;
 assert.ok(work(x,lookup,catalog,'L1').selected.reasons.includes('ARTICLE_MODULE_WIDTH_MISMATCH'));
});
test('missing selected circuit falls back to first line',()=>{
 assert.equal(work(project(),lookup,catalog,'none').selected.lineId,'L1');
});
test('duplicate circuit IDs block',()=>{
 const x=project();x.lines[1].id='L1';
 assert.equal(work(x,lookup,catalog).status,'BLOCKED');
});
test('invalid project fails closed',()=>{
 const r=work(null,lookup,catalog);assert.equal(r.status,'BLOCKED');assert.equal(r.engineeringApproved,false);
});
test('HTML includes safe article assignment only for non-rejected candidates',()=>{
 const h=html(work(project(),lookup,catalog,'L1'));
 assert.match(h,/data-protection-sku="A"/);
 assert.match(h,/data-protection-sku="B"[^>]* disabled/);
});
test('HTML escapes malicious circuit names',()=>{
 const x=project();x.lines[0].name='<img src=x onerror=alert(1)>';
 const h=html(work(x,lookup,catalog,'L1'));
 assert.doesNotMatch(h,/<img/);assert.match(h,/&lt;img/);
});
test('HTML escapes malicious catalogue article IDs',()=>{
 const c=[{id:'<script>',device:{...catalog[0].device}}];
 const h=html(work(project(),()=>null,c,'L1'));
 assert.doesNotMatch(h,/<script>/);assert.match(h,/&lt;script&gt;/);
});
test('does not mutate project',()=>{
 const x=project(),before=JSON.stringify(x);work(x,lookup,catalog,'L1');
 assert.equal(JSON.stringify(x),before);
});
test('empty project produces helpful placeholder',()=>{
 assert.match(html(work({lines:[]},lookup,catalog)),/Добавьте отходящую цепь/);
});

test('CSV exports every circuit regardless of selected focus',()=>{
 const {epProtectionWorkbenchCsvV1:csv}=require('../protection-workbench-v1.js');
 const output=csv(work(project(),lookup,catalog,'L1'));
 assert.match(output,/L1/);assert.match(output,/L2/);
 assert.match(output,/Кухня/);
});
test('CSV formula-like user names are escaped',()=>{
 const {epProtectionWorkbenchCsvV1:csv}=require('../protection-workbench-v1.js');
 const x=project();x.lines[0].name=' =HYPERLINK(1)';
 const output=csv(work(x,lookup,catalog,'L1'));
 assert.match(output,/"' =HYPERLINK\(1\)"/);
});

'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {epProtectiveDeviceShortlistV1:select}=require('../protective-device-shortlist-v1.js');
const catalog=[{id:'a',device:{kind:'MCB',inA:16,icnKa:6,poles:1,maker:'X',series:'A'}},
{id:'b',device:{kind:'MCB',inA:25,icnKa:4.5,poles:1,maker:'Y',series:'B'}}];
const line=()=>({phase:'L1',overloadInput:{ibA:12,izA:20},ikKa:5});
test('selects arithmetically plausible article only',()=>{
 const r=select(line(),catalog);assert.equal(r.candidates[0].sku,'a');
 assert.equal(r.candidates[0].status,'POTENTIAL');assert.equal(r.engineeringApproved,false);
});
test('rejects nominal above cable capacity',()=>assert.ok(select(line(),catalog).candidates.find(c=>c.sku==='b').reasons.includes('IN_GT_IZ')));
test('rejects inadequate breaking rating',()=>{
 const l=line();l.ikKa=7;assert.ok(select(l,catalog).candidates.every(c=>c.reasons.includes('ICN_LT_DECLARED_IK')));
});
test('does not infer fault current',()=>{
 const l=line();delete l.ikKa;assert.ok(select(l,catalog).issues.some(x=>x.code==='FAULT_CURRENT_MISSING'));
});
test('does not infer load current',()=>{
 const l=line();delete l.overloadInput;assert.ok(select(l,catalog).issues.some(x=>x.code==='DESIGN_CURRENT_MISSING'));
});
test('three phase rejects single pole',()=>{
 const l=line();l.phase='3Ф';assert.ok(select(l,catalog).candidates.every(c=>c.reasons.includes('POLES_INCOMPATIBLE')));
});
test('missing phase cannot approve',()=>{
 const l=line();delete l.phase;assert.ok(select(l,catalog).issues.some(x=>x.code==='PHASE_UNDECLARED'));
});
test('invalid catalogue specs reject article',()=>{
 const r=select(line(),[{id:'bad',device:{kind:'MCB',inA:0,icnKa:0,poles:1}}]);
 assert.equal(r.candidates[0].status,'REJECTED');
});
test('unknown device type is not treated as breaker',()=>{
 const r=select(line(),[{id:'psu',device:{kind:'DIN_PSU',inA:16,icnKa:6,poles:1}}]);
 assert.equal(r.candidates.length,0);
});
test('invalid line blocks',()=>assert.equal(select(null,catalog).status,'BLOCKED'));

test('missing fault current leaves candidates incomplete, not potential',()=>{
 const l=line();delete l.ikKa;
 assert.ok(select(l,catalog).candidates.every(c=>c.status!=='POTENTIAL'));
});
test('missing cable ampacity leaves candidates incomplete',()=>{
 const l=line();delete l.overloadInput.izA;
 assert.ok(select(l,catalog).candidates.every(c=>c.status!=='POTENTIAL'));
});

test('project-level audit rejects unknown selected article',()=>{
 const {epProtectiveDeviceProjectAuditV1:audit}=require('../protective-device-shortlist-v1.js');
 const r=audit({lines:[{...line(),id:'L1',catalogSku:'missing'}]},()=>null);
 assert.ok(r.issues.some(i=>i.code==='SELECTED_ARTICLE_UNKNOWN'));
});
test('project-level audit cannot approve installation',()=>{
 const {epProtectiveDeviceProjectAuditV1:audit}=require('../protective-device-shortlist-v1.js');
 assert.equal(audit({lines:[line()]}).ready_for_installation,false);
});

test('catalogue identity must be internal article ID, not manufacturer SKU',()=>{
 const {epProtectiveDeviceProjectAuditV1:audit}=require('../protective-device-shortlist-v1.js');
 const r=audit({lines:[{...line(),id:'L1',catalogSku:'unknown-internal-id'}]},
  ()=>({sku:'a',kind:'MCB',inA:16,icnKa:6,poles:1}));
 assert.ok(r.issues.some(i=>i.code==='SELECTED_ARTICLE_NOT_IN_CATALOG'));
});
test('nonfinite and nonpositive declared inputs remain incomplete',()=>{
 for(const v of [0,-1,'Infinity','1e309',true,{},'']){
  const l=line();l.overloadInput.ibA=v;
  assert.ok(select(l,catalog).issues.some(i=>i.code==='DESIGN_CURRENT_MISSING'));
 }
});

test('selected article with insufficient input remains explicitly incomplete',()=>{
 const {epProtectiveDeviceProjectAuditV1:audit}=require('../protective-device-shortlist-v1.js');
 const l=line();delete l.ikKa;l.id='L1';l.catalogSku='a';
 const r=audit({lines:[l]},()=>catalog[0].device,catalog);
 assert.ok(r.issues.some(i=>i.code==='SELECTED_ARTICLE_EVIDENCE_INCOMPLETE'));
});
test('valid injected catalogue matches internal article ID',()=>{
 const {epProtectiveDeviceProjectAuditV1:audit}=require('../protective-device-shortlist-v1.js');
 const r=audit({lines:[{...line(),id:'L1',catalogSku:'a'}]},()=>catalog[0].device,catalog);
 assert.ok(!r.issues.some(i=>i.code==='SELECTED_ARTICLE_NOT_IN_CATALOG'));
});

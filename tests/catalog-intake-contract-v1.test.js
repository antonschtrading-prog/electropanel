'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {KINDS,validateCandidate}=require('../catalog-intake/candidate-schema-v1.js');
const {reviewCandidate,toLegacyCandidate,KEY_FIELDS}=require('../catalog-intake/field-evidence-v1.js');
const base={maker:'TEST ONLY',series:'LAB',sku:'NOT-A-PRODUCT',kind:'MCB',inA:16,poles:1,modules:1,widthMm:18,icnKa:6,icnVoltageV:230,icnStandard:'IEC 60898-1'};
test('all six categories have separate field contracts',()=>{assert.equal(KINDS.length,6);for(const kind of KINDS)assert.ok(KEY_FIELDS[kind].length>=4)});
test('complete synthetic MCB passes structural checks but not source review',()=>{
 assert.deepEqual(validateCandidate(base),[]);
 assert.equal(reviewCandidate(base).status,'BLOCKED');
 assert.equal(toLegacyCandidate(base).article,null);
});
test('no fabricated manufacturer identity can be approved by missing evidence',()=>{
 const ev=Object.fromEntries(KEY_FIELDS.MCB.map(field=>[field,{url:'https://example.org',documentTitle:'TEST',locator:'p1',reviewedAt:'2026-11-18'}]));
 assert.ok(reviewCandidate(base,ev).errors.some(e=>e.code==='SKU_IDENTITY_EVIDENCE_MISSING'));
});
test('complete synthetic evidence only permits human review, never approval',()=>{
 const ev=Object.fromEntries(KEY_FIELDS.MCB.map(field=>[field,{url:'https://example.org',documentTitle:'TEST',locator:'p1',reviewedAt:'2026-11-18'}]));
 ev.sku={...ev.inA,exactSku:base.sku};
 assert.equal(reviewCandidate(base,ev).status,'READY_FOR_HUMAN_REVIEW');
 const result=toLegacyCandidate(base,ev);
 assert.equal(result.status,'REVIEW_REQUIRED');assert.equal(result.engineeringApproved,false);
 assert.equal(result.article.verificationStatus,'PENDING_INTEGRATION_REVIEW');
});
test('RCBO needs residual protection as well as Icn context',()=>{
 const x={...base,kind:'RCBO'};
 assert.ok(validateCandidate(x).some(e=>e.field==='residualCurrentMa'));
 assert.ok(validateCandidate(x).some(e=>e.field==='residualType'));
});
test('RCD cannot silently inherit MCB interruption semantics',()=>{
 const x={...base,kind:'RCD',residualCurrentMa:30,residualType:'A'};
 assert.ok(validateCandidate(x).some(e=>e.code==='RCD_ICN_NEEDS_INDEPENDENT_REVIEW'));
});
test('meter requires topology and rated voltage',()=>{
 const x={...base,kind:'METER',icnKa:undefined,connectionType:undefined,ratedVoltageV:undefined};
 assert.ok(validateCandidate(x).some(e=>e.field==='connectionType'));
 assert.ok(validateCandidate(x).some(e=>e.field==='ratedVoltageV'));
});
test('relay and contactor require coil and contact ratings',()=>{
 for(const kind of ['RELAY','CONTACTOR']){
  const x={...base,kind,coilVoltageV:undefined,contactRatingA:undefined};
  assert.ok(validateCandidate(x).some(e=>e.field==='coilVoltageV'));
  assert.ok(validateCandidate(x).some(e=>e.field==='contactRatingA'));
 }
});
test('rejects incompatible 1P+N pole count',()=>assert.ok(validateCandidate({...base,poleConfiguration:'1P+N'}).some(e=>e.code==='POLE_CONFIGURATION_MISMATCH')));
test('rejects nominal module envelope overflow',()=>assert.ok(validateCandidate({...base,widthMm:40}).some(e=>e.code==='WIDTH_EXCEEDS_MODULE_ENVELOPE')));
test('rejects unlicensed manufacturer image declaration',()=>assert.ok(validateCandidate({...base,imageUrl:'https://example.org/a.png'}).some(e=>e.code==='IMAGE_RIGHTS_MISSING')));
test('invalid numeric values are not coerced from strings',()=>{for(const n of [0,-1,'16',Infinity,NaN])assert.ok(validateCandidate({...base,inA:n}).some(e=>e.code==='INVALID_POSITIVE_NUMBER'))});
test('non-object and unknown device types fail closed',()=>{
 assert.ok(validateCandidate(null).some(e=>e.code==='INVALID_RECORD'));
 assert.ok(validateCandidate({...base,kind:'UNKNOWN'}).some(e=>e.code==='UNKNOWN_KIND'));
});

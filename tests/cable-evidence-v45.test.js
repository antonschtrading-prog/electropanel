'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const vm=require('node:vm'),path=require('node:path');
const crypto=require('node:crypto').webcrypto;
const source=fs.readFileSync(path.join(__dirname,'..','overload-v30.js'),'utf8')+'\n'+
 fs.readFileSync(path.join(__dirname,'..','cable-evidence-v45.js'),'utf8');
const api=vm.runInNewContext(source+'\n({epVerifyDocumentBytesV34,epVerifyDocumentFileV34,epCableProvenanceV45})',
 {crypto,atob,Uint8Array,BigInt});
const sha='0c8a4ac5054c4c08f79acd107cf38ebb19b33dcdb3a8d9c2ede4779b6b95dc4e';
const doc='ZXhhbXBsZSBvbmx5'; // Python v4.14 test_v45.py uses b'example only'
const cable=()=>({
 manufacturer:'Example only',product_code:'EX-25',
 datasheet_title:'Example, not a real manufacturer datasheet',datasheet_revision:'demo',
 datasheet_sha256:sha,datasheet_base64:doc,datasheet_page:'4',
 conductor_material:'Cu',cross_section_mm2:'2.5',
 r20_ohm_per_km:'7.41',x_ohm_per_km:'0.08',alpha_per_c:'0.00393',
 manufacturer_origin_verified:true,independent_row_review_verified:true
});
test('SHA256 verifies bytes, not source authenticity (Python v3.4)',async()=>{
 const r=await api.epVerifyDocumentBytesV34({base64:doc,expected_sha256:sha});
 assert.equal(r.byte_count,12);assert.equal(r.actual_sha256,sha);
 assert.equal(r.integrity_status,'PASS');assert.equal(r.authenticity_status,'UNVERIFIED');
 assert.equal(r.ready_for_installation,false);
});
test('tampering and invalid base64 are detected',async()=>{
 const r=await api.epVerifyDocumentBytesV34({base64:'dGFtcGVyZWQ=',expected_sha256:sha});
 assert.equal(r.integrity_status,'FAIL');
 await assert.rejects(()=>api.epVerifyDocumentBytesV34({base64:'###',expected_sha256:sha}));
 await assert.rejects(()=>api.epVerifyDocumentBytesV34({base64:'',expected_sha256:sha}));
 await assert.rejects(()=>api.epVerifyDocumentBytesV34({base64:doc,expected_sha256:'abc'}));
});
test('oversized source bytes are rejected without network',async()=>{
 const encoded=Buffer.alloc(1000001,65).toString('base64');
 await assert.rejects(()=>api.epVerifyDocumentBytesV34({base64:encoded,expected_sha256:sha}));
});
test('full sample cable source is still just submitter attestation',async()=>{
 const r=await api.epCableProvenanceV45(cable());
 assert.equal(r.status,'PASS');assert.equal(r.ready_for_design,false);
 assert.equal(r.ready_for_installation,false);
 assert.equal(r.source_byte_count,12);
 assert.equal(r.evidence_state,'ATTESTED_BY_SUBMITTER_NOT_CERTIFIED_BY_SOFTWARE');
});
test('missing source, mismatch and unverified origin fail closed',async()=>{
 let x=cable();delete x.datasheet_base64;
 assert.equal((await api.epCableProvenanceV45(x)).status,'UNKNOWN');
 x=cable();x.datasheet_base64='dGFtcGVyZWQ=';
 assert.equal((await api.epCableProvenanceV45(x)).status,'FAIL');
 x=cable();x.manufacturer_origin_verified=false;
 assert.equal((await api.epCableProvenanceV45(x)).status,'UNKNOWN');
 x=cable();x.independent_row_review_verified=false;
 assert.equal((await api.epCableProvenanceV45(x)).status,'UNKNOWN');
});
test('invalid engineering characteristics never yield approval',async()=>{
 for(const [key,value] of [
  ['conductor_material','Silver'],['r20_ohm_per_km',null],
  ['x_ohm_per_km','-0.1'],['alpha_per_c','0.02'],
  ['cross_section_mm2','1e50']]){
  const x=cable();x[key]=value;
  assert.equal((await api.epCableProvenanceV45(x)).status,'UNKNOWN',key);
 }
});

test('browser local File path uses only arrayBuffer and never uploads bytes',async()=>{
 const bytes=Buffer.from('example only');
 const mock={size:bytes.length,arrayBuffer:async()=>Uint8Array.from(bytes).buffer};
 const r=await api.epVerifyDocumentFileV34(mock,sha);
 assert.equal(r.integrity_status,'PASS');
 assert.equal(r.actual_sha256,sha);
 assert.equal(r.ready_for_installation,false);
 const wrong=await api.epVerifyDocumentFileV34(mock,'a'.repeat(64));
 assert.equal(wrong.integrity_status,'FAIL');
 await assert.rejects(()=>api.epVerifyDocumentFileV34({...mock,size:1000001},sha));
});

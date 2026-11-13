'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'..','overload-v30.js'),'utf8')+'\n'+
 fs.readFileSync(path.join(__dirname,'..','cable-tables-v31.js'),'utf8');
const {epCable31Audit,epCable31Assess,epCable31ContextValue}=vm.runInNewContext(src+
 '\n({epCable31Audit,epCable31Assess,epCable31ContextValue})');
function fixture(){
 const row={conductor_material:'Cu',insulation:'PVC',cores_loaded:2,installation_method:'B2',
  ambient_c:30,cross_section_mm2:2.5,reference_id:'EXAMPLE',table_id:'T1',row_id:'R1',iz_a:20};
 const source={designation:'UNVERIFIED DEMO ONLY',edition:'demo',publisher:'Example',
  source_url:'https://example.org/demo',document_sha256:'a'.repeat(64),
  verification_status:'UNVERIFIED'};
 const context=Object.fromEntries(Object.entries(row).filter(([k])=>k!=='iz_a'));
 return {table:{source,rows:[row]},context,
  factors:[{name:'demo',value:1,source_locator:'example row'}],ib_a:12,in_a:16,i2_a:28};
}
const codes=r=>Array.from(r.issues||r.problems,x=>x.code);
test('v4.14 v3.1 reference example remains structural-only and not approved',()=>{
 const f=fixture(),audit=epCable31Audit(f.table),r=epCable31Assess(f);
 assert.equal(audit.structural_status,'PASS');
 assert.equal(audit.normative_status,'UNVERIFIED');
 assert.ok(codes(audit).includes('DOCUMENT_AUTHENTICITY_UNPROVEN'));
 assert.equal(r.numeric_status,'PASS');
 assert.equal(r.ready_for_installation,false);
 assert.equal(r.computed.table_row_index,0);
 assert.equal(r.computed.corrected_iz_a,'20');
 assert.equal(r.table_audit.table_sha256,null);
});
test('Python test_v31 overload FAIL and I2 FAIL',()=>{
 const f=fixture();f.ib_a=25;
 assert.equal(epCable31Assess(f).numeric_status,'FAIL');
 f.ib_a=12;f.i2_a=30;
 assert.equal(epCable31Assess(f).numeric_status,'FAIL');
});
test('no interpolation, extrapolation, or nonunique rows',()=>{
 const f=fixture();f.context.installation_method='C';
 assert.equal(epCable31Assess(f).numeric_status,'UNKNOWN');
 f.context.installation_method='B2';f.context.ambient_c=32;
 assert.equal(epCable31Assess(f).numeric_status,'UNKNOWN');
 f.context.ambient_c=30;f.table.rows.push({...f.table.rows[0]});
 assert.equal(epCable31Audit(f.table).structural_status,'FAIL');
 assert.ok(codes(epCable31Assess(f)).includes('NO_UNIQUE_APPLICABLE_TABLE_ROW'));
});
test('missing source fields and forged VERIFIED label fail closed',()=>{
 const f=fixture();
 f.table.source.document_sha256='bad';
 assert.equal(epCable31Audit(f.table).structural_status,'FAIL');
 f.table.source.document_sha256='a'.repeat(64);
 f.table.source.verification_status='INDEPENDENTLY_VERIFIED';
 assert.equal(epCable31Audit(f.table).normative_status,'UNVERIFIED');
});
test('factors require value and named provenance',()=>{
 const f=fixture();f.factors=[];
 assert.equal(epCable31Assess(f).numeric_status,'UNKNOWN');
 f.factors=[{name:'demo',value:1}];
 assert.equal(epCable31Assess(f).numeric_status,'UNKNOWN');
 f.factors=[{name:'demo',value:1.1,source_locator:'self'}];
 assert.equal(epCable31Assess(f).numeric_status,'UNKNOWN');
});
test('invalid and negative currents never count as cable ampacity',()=>{
 const f=fixture();
 for(const v of [0,'NaN',NaN,Infinity,-1,false]){
  f.table.rows[0].iz_a=v;
  assert.equal(epCable31Audit(f.table).structural_status,'FAIL');
 }
});
test('numeric context equivalence accepts 2 and 2.0, but not 2.5 loaded cores',()=>{
 const row={cores_loaded:2,ambient_c:30,cross_section_mm2:2.5};
 assert.equal(epCable31ContextValue(row,'cores_loaded'),
  epCable31ContextValue({cores_loaded:'2.0'},'cores_loaded'));
 assert.equal(epCable31ContextValue(row,'cross_section_mm2'),
  epCable31ContextValue({cross_section_mm2:'2.50'},'cross_section_mm2'));
 assert.equal(epCable31ContextValue({cores_loaded:'2.5'},'cores_loaded'),null);
 assert.equal(epCable31ContextValue({ambient_c:'-5'},'ambient_c'),'num:-5e0');
});
test('no hidden source table lookup',()=>{
 const f=fixture();delete f.table.rows[0].iz_a;
 assert.equal(epCable31Assess(f).numeric_status,'UNKNOWN');
});

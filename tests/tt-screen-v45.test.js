'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'..','overload-v30.js'),'utf8')+'\n'+
 fs.readFileSync(path.join(__dirname,'..','tt-screen-v45.js'),'utf8');
const {epTTScreenV45}=vm.runInNewContext(src+'\n({epTTScreenV45})');
const input={
 earthing_system:'TT',supply_architecture:'single_utility_source',
 special_installation:false,ra_ohm:100,rcd_rated_residual_current_ma:30,
 permitted_touch_voltage_v:50,earth_electrode_measurement_available:true,
 ra_includes_protective_conductor:true,rcd_datasheet_verified:true,
 required_disconnection_time_verified:true,rcd_disconnection_time_verified:true,
 pe_continuity_verified:true,required_disconnection_time_s:'0.2',
 measured_rcd_disconnection_time_s:'0.04',rcd_test_condition_verified:true
};
const check=change=>epTTScreenV45({...input,...change});
test('original v4.5 PASS is only a partial screen and never approval',()=>{
 const x=check({});
 assert.equal(x.status,'PASS');assert.equal(x.calculated_ra_times_idn_v,'3');
 assert.equal(x.measured_rcd_disconnection_time_s,'0.04');
 assert.equal(x.required_disconnection_time_s,'0.2');
 assert.equal(x.ready_for_installation,false);assert.equal(x.ready_for_design,false);
 assert.equal(x.evidence_state,'USER_ASSERTED_NOT_INDEPENDENTLY_AUTHENTICATED');
});
test('v4.5 touch-voltage reference boundary and failures',()=>{
 assert.equal(check({ra_ohm:'1666.6666666666666666666666666666666666'}).status,'PASS');
 assert.deepEqual(Array.from(check({ra_ohm:2000}).issues),['RA_TIMES_IDN_EXCEEDS_UL']);
 assert.equal(check({permitted_touch_voltage_v:25,ra_ohm:1000}).status,'FAIL');
 assert.equal(check({permitted_touch_voltage_v:48}).status,'UNKNOWN');
});
test('v4.5 disconnection time is independently bounded',()=>{
 const x=check({measured_rcd_disconnection_time_s:'0.3'});
 assert.equal(x.status,'FAIL');
 assert.ok(Array.from(x.issues).includes('RCD_DISCONNECTION_TIME_EXCEEDED'));
 assert.equal(check({measured_rcd_disconnection_time_s:undefined}).status,'UNKNOWN');
});
test('v4.5 evidence prerequisites and unsupported supply are fail-closed',()=>{
 const fields=['earth_electrode_measurement_available','ra_includes_protective_conductor',
 'rcd_datasheet_verified','required_disconnection_time_verified',
 'rcd_disconnection_time_verified','pe_continuity_verified','rcd_test_condition_verified'];
 for(const key of fields)assert.equal(check({[key]:false}).status,'UNKNOWN',key);
 assert.equal(check({earthing_system:'TN'}).status,'OUT_OF_SCOPE');
 assert.equal(check({supply_architecture:'generator'}).status,'OUT_OF_SCOPE');
 assert.equal(check({special_installation:true}).status,'OUT_OF_SCOPE');
});
test('invalid and extreme numbers do not get arithmetic PASS',()=>{
 for(const value of [-1,0,'NaN','Infinity',NaN,true,1e-20,1e12])
  assert.equal(check({ra_ohm:value}).status,'UNKNOWN',String(value));
});
test('input is not mutated',()=>{
 const before=JSON.stringify(input);check({});assert.equal(JSON.stringify(input),before);
});

test('Python 34-digit rounding at touch-voltage boundary stays PASS',()=>{
 for(const ra of ['1666.6666666666666666666666666666666666',
  '1666.6666666666666666666666666666666667',
  '1666.6666666666666666666666666666666668']){
  const r=check({ra_ohm:ra});
  assert.equal(r.status,'PASS');
 }
});
test('unknown fields and invalid imported structures are rejected',()=>{
 const api=vm.runInNewContext(src+'\n({epNormalizeTTContext})');
 assert.throws(()=>api.epNormalizeTTContext({fake_approval:true}),/Unknown TT field/);
 assert.throws(()=>api.epNormalizeTTContext({ra_ohm:[]}),/Invalid TT field/);
 assert.throws(()=>api.epNormalizeTTContext({ra_ohm:'1'.repeat(200)}),/Invalid TT field/);
 assert.equal(api.epNormalizeTTContext({earthing_system:'TT'}).earthing_system,'TT');
});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..'),source=['typical-lv-v43.js','route-impedance-v44.js'].map(p=>fs.readFileSync(path.join(root,p),'utf8')).join('\n');
const {epLineImpedanceV44,ep44BindLine}=vm.runInNewContext(source+'\n({epLineImpedanceV44,ep44BindLine})');
function fixture(){
 const conductor={resistance_reference_temperature_c:20,data_source_verified:true,
  r20_ohm_per_km:'7.41',alpha_per_c:'0.00393',
  operating_temperature_c:70,x_ohm_per_km:'0.08'};
 return {model:'TN_PHASE_PE_RADIAL_SINGLE_UTILITY',
  route_length_verified:true,source_impedance_verified:true,route_length_m:50,
  source_r_ohm:'0.10',source_x_ohm:'0.05',minimum_voltage_factor:'0.95',
  ia_a_at_required_disconnection_time:'160',
  trip_curve_source_verified:true,disconnection_time_limit_verified:true,
  voltage_drop_phase:'single_phase_L_N',neutral_conductor_confirmed_equivalent:true,
  power_factor:'1',max_drop_percent:'5',
  phase_conductor:{...conductor},pe_conductor:{...conductor}};
}
const clone=v=>JSON.parse(JSON.stringify(v));
test('Python v4.4 reference R/X and TN voltage drop decisions',()=>{
 const result=epLineImpedanceV44(fixture(),'12');
 assert.equal(result.status,'PASS');assert.equal(result.tn_disconnection.status,'PASS');
 assert.equal(result.voltage_drop.status,'PASS');
 assert.ok(Number(result.calculated_zs_ohm)>0.98);
 assert.ok(Math.abs(Number(result.calculated_loop_reactance_ohm)-0.058)<1e-12);
 assert.equal(result.ready_for_installation,false);
});
test('trip threshold, voltage drop and 3 phase use supplied conditions',()=>{
 const high=fixture();high.ia_a_at_required_disconnection_time='400';
 assert.equal(epLineImpedanceV44(high,'12').tn_disconnection.status,'FAIL');
 const low=fixture();low.max_drop_percent='0.5';
 assert.equal(epLineImpedanceV44(low,'12').voltage_drop.status,'FAIL');
 const three=fixture();three.voltage_drop_phase='three_phase_balanced';
 assert.equal(epLineImpedanceV44(three,'12').voltage_drop.status,'PASS');
});
test('unknown or unsupported inputs fail closed instead of default R or X',()=>{
 const scenarios=[
  p=>{p.model='TT';},p=>{p.source_impedance_verified=false;},
  p=>{p.phase_conductor.data_source_verified=false;},p=>{delete p.phase_conductor.x_ohm_per_km;},
  p=>{p.pe_conductor.resistance_reference_temperature_c=25;},
  p=>{p.source_r_ohm='-0.01';},p=>{p.route_length_m=100001;},
  p=>{p.phase_conductor.r20_ohm_per_km='NaN';}
 ];
 for(const edit of scenarios){
  const d=fixture();edit(d);
  assert.equal(epLineImpedanceV44(d,'12').status,'UNKNOWN',JSON.stringify(d));
 }
});
test('source documentation missing, unsupported neutral and load remain UNKNOWN',()=>{
 const noInput=fixture();delete noInput.power_factor;
 assert.equal(epLineImpedanceV44(noInput,'12').voltage_drop.status,'UNKNOWN');
 const noN=fixture();noN.neutral_conductor_confirmed_equivalent=false;
 assert.equal(epLineImpedanceV44(noN,'12').voltage_drop.status,'UNKNOWN');
 assert.equal(epLineImpedanceV44(fixture()).voltage_drop.status,'UNKNOWN');
});
test('TN earthing, phase changes, stale checks and source Ib are bound to project',()=>{
 const r=fixture(),line={id:'L1',phase:'L1',overloadInput:{ibA:'12'},route44Input:r};
 const result=ep44BindLine({earthing:'TN-S'},line);
 assert.equal(result.result.status,'PASS');assert.equal(result.status,'UNKNOWN');
 assert.equal(result.design_current_origin,'line.overloadInput.ibA');
 assert.equal(ep44BindLine({earthing:'TT'},line).status,'BLOCKED');
 assert.equal(ep44BindLine({earthing:'TN-S'},{...line,phase:'3Ф'}).status,'BLOCKED');
 assert.equal(ep44BindLine({earthing:'TN-S'},{...line,calculationReview:{pending:['route44Input']}}).status,'BLOCKED');
});
test('route check never mutates original engineering model',()=>{
 const x=fixture(),before=JSON.stringify(x);epLineImpedanceV44(x,'12');
 assert.equal(JSON.stringify(x),before);
});

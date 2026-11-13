'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=['overload-v30.js','reference-ampacity-v38.js','reference-cable-v39.js','typical-lv-v43.js']
 .map(p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8')).join('\n');
const api=vm.runInNewContext(source+'\n({epReferenceAmpacityV38,epInspectAmendment2025V38,epReferenceFactorsV39,epReferenceCableV39,epScopeV43,epVoltageDropV43,epTNDisconnectionV43})');
const base={conductor_material:'Cu',insulation:'PVC',cores_loaded:2,installation_method:'B1',
 ambient_air_c:30,cross_section_mm2:2.5,single_circuit_ungrouped:true,other_derating_factors_present:false};
const cable={...base,circuits_grouped:2,grouping_layout:'bunched_air_surface_embedded_enclosed',
 all_circuits_simultaneously_loaded:true,installation_method_verified:true,ib_a:12,in_a:16,i2_a:20};
test('original v3.8 B.52.2 extract: exactly 12 crosschecked cells',()=>{
 const values={'1.5':['17.5','19.5'],'2.5':['24','27'],'4':['32','36'],
  '6':['41','46'],'10':['57','63'],'16':['76','85']};
 for(const [s,expected] of Object.entries(values))
  for(const [i,m] of ['B1','C'].entries()){
   const r=api.epReferenceAmpacityV38({...base,cross_section_mm2:s,installation_method:m});
   assert.equal(r.reference_iz_a,expected[i]);assert.equal(r.ready_for_design,false);
   assert.equal(r.normative_status,'UNVERIFIED_OFFICIAL_SOURCE');
  }
});
test('reference ampacity fail-closed for interpolation, grouping and incorrect source basis',()=>{
 for(const changes of [{cross_section_mm2:25},{ambient_air_c:35},{conductor_material:'Al'},
  {cores_loaded:3},{installation_method:'B2'},{single_circuit_ungrouped:false},
  {other_derating_factors_present:true},{cross_section_mm2:'NaN'}]){
  const r=api.epReferenceAmpacityV38({...base,...changes});
  assert.equal(r.reference_iz_a,null);assert.equal(r.status,'UNSUPPORTED_CONTEXT');
 }
 assert.equal(api.epReferenceAmpacityV38({...base,cross_section_mm2:'2,50'}).reference_iz_a,'24');
});
test('v3.8 2025 correction has narrow scope and never becomes a generic 50 mm2 rating',()=>{
 const d={table:'B.52.12',column:3,cross_section_mm2:50};
 assert.equal(api.epInspectAmendment2025V38({...d,claimed_a:102}).status,'OUTDATED_VALUE');
 assert.equal(api.epInspectAmendment2025V38({...d,claimed_a:192}).status,'MATCHES_PUBLISHED_CORRECTION');
 assert.equal(api.epInspectAmendment2025V38({...d,column:4,claimed_a:192}).expected_a,null);
});
test('v3.9 only explicit derating cells, exact context and no certification',()=>{
 const r=api.epReferenceCableV39(cable);
 assert.equal(r.numeric_status,'PASS');assert.equal(r.temperature_factor,'1.00');
 assert.equal(r.grouping_factor,'0.80');assert.equal(r.adjusted_reference_iz_a,'19.2');
 assert.equal(r.ready_for_installation,false);
 assert.equal(api.epReferenceCableV39({...cable,i2_a:30}).numeric_status,'FAIL');
 for(const changes of [{ambient_air_c:32},{circuits_grouped:5},
  {grouping_layout:'other'},{all_circuits_simultaneously_loaded:false},
  {installation_method_verified:false}]){
  assert.equal(api.epReferenceCableV39({...cable,...changes}).numeric_status,'UNKNOWN');
 }
 const factors=api.epReferenceFactorsV39({insulation:'PVC',installation_medium:'air',
  ambient_air_c:35,circuits_grouped:3,grouping_layout:'bunched_air_surface_embedded_enclosed'});
 assert.equal(factors.supported,true);assert.equal(factors.temperature_factor,'0.94');
 assert.equal(factors.grouping_factor,'0.70');
});
test('v4.3 installation scope and disconnection: fail closed without supplied evidence',()=>{
 const s={installation_category:'residential',voltage_system:'AC_230_400_V_50_HZ',
  supply_architecture:'single_utility_source',special_installation:false};
 assert.equal(api.epScopeV43(s).status,'IN_SCOPE_PRELIMINARY');
 assert.equal(api.epScopeV43({...s,special_installation:true}).status,'OUT_OF_SCOPE');
 const d={earthing_system:'TN',source_impedance_included:true,temperature_basis_checked:true,
  disconnection_time_limit_verified:true,trip_curve_source_verified:true,u0_v:230,
  zs_ohm:'0.98',ia_a_at_required_disconnection_time:'160',minimum_voltage_factor:'0.95'};
 assert.equal(api.epTNDisconnectionV43(d).status,'PASS');
 assert.equal(api.epTNDisconnectionV43({...d,ia_a_at_required_disconnection_time:400}).status,'FAIL');
 assert.equal(api.epTNDisconnectionV43({...d,trip_curve_source_verified:false}).status,'UNKNOWN');
 assert.equal(api.epTNDisconnectionV43({...d,earthing_system:'TT'}).status,'UNKNOWN');
});
test('v4.3 voltage drop single / balanced triple and unavailable neutral limit',()=>{
 const d={method:'explicit_conductor_R_X_at_operating_temperature',
  phase_configuration:'single_phase_L_N',r_ohm_per_conductor:0.44,
  x_ohm_per_conductor:0.004,power_factor:1,design_voltage_v:230,max_drop_percent:5,
  conductor_temperature_verified:true,total_route_verified:true};
 assert.equal(api.epVoltageDropV43(d,12).status,'PASS');
 assert.equal(api.epVoltageDropV43({...d,max_drop_percent:0.5},12).status,'FAIL');
 assert.equal(api.epVoltageDropV43({...d,total_route_verified:false},12).status,'UNKNOWN');
 assert.equal(api.epVoltageDropV43({...d,phase_configuration:'three_phase_balanced',design_voltage_v:400},12).status,'PASS');
});
test('floating-point borderline results become UNKNOWN rather than false PASS',()=>{
 const d={method:'explicit_conductor_R_X_at_operating_temperature',
  phase_configuration:'single_phase_L_N',r_ohm_per_conductor:0.5,
  x_ohm_per_conductor:0,power_factor:1,design_voltage_v:230,
  max_drop_percent:100/230*12,conductor_temperature_verified:true,total_route_verified:true};
 assert.equal(api.epVoltageDropV43(d,12).status,'UNKNOWN');
 const tn={earthing_system:'TN',source_impedance_included:true,temperature_basis_checked:true,
 disconnection_time_limit_verified:true,trip_curve_source_verified:true,u0_v:230,
 zs_ohm:1,ia_a_at_required_disconnection_time:230,minimum_voltage_factor:1};
 assert.equal(api.epTNDisconnectionV43(tn).status,'UNKNOWN');
});

test('non-decimal JavaScript syntaxes cannot pass engineering current checks',()=>{
 const d={earthing_system:'TN',source_impedance_included:true,temperature_basis_checked:true,
  disconnection_time_limit_verified:true,trip_curve_source_verified:true,
  u0_v:230,zs_ohm:1,ia_a_at_required_disconnection_time:160,minimum_voltage_factor:0.95};
 for(const bad of ['0x10','0b10000','1_000','Infinity','', '  ', 'NaN']){
  assert.equal(api.epTNDisconnectionV43({...d,ia_a_at_required_disconnection_time:bad}).status,'UNKNOWN',bad);
 }
});

'use strict';
// Bounded browser port of recovered v4.14 line_impedance_v44.py.
// Only one TN phase→PE radial utility feeder; input cable and network R/X
// are user declarations, NOT a normative cable catalogue or measurement.
// Standalone v43 checks are reused with explicit near-boundary uncertainty.
function ep44Number(value,allowZero=false,allowNegative=false){
 if(value===null||value===undefined||typeof value==='boolean'||typeof value==='object')return null;
 const s=String(value).trim();
 if(s.length>120||s==='')return null;
 if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d{1,4})?$/.test(s))return null;
 const n=Number(s);
 if(!Number.isFinite(n)||(!allowNegative&&n<0)||(!allowZero&&!allowNegative&&n<=0))return null;
 if(n!==0&&(Math.abs(n)>1e8||Math.abs(n)<1e-8))return null;
 return n;
}
function ep44Result(status,issues,extra={}){
 return {status,issues,ready_for_design:false,ready_for_installation:false,...extra};
}
function ep44Conductor(data,lengthKm){
 if(!data||typeof data!=='object'||Array.isArray(data))
  return {error:'CONDUCTOR_RECORD_MISSING'};
 if(data.resistance_reference_temperature_c!==20)
  return {error:'CONDUCTOR_R20_BASIS_MISSING'};
 if(data.data_source_verified!==true)return {error:'CONDUCTOR_DATA_NOT_VERIFIED'};
 const r20=ep44Number(data.r20_ohm_per_km),alpha=ep44Number(data.alpha_per_c,true);
 const temp=ep44Number(data.operating_temperature_c,true,true),x=ep44Number(data.x_ohm_per_km,true);
 if([r20,alpha,temp,x].some(v=>v===null)||alpha>0.01||temp>200||temp< -40)
  return {error:'CONDUCTOR_NUMERICAL_INPUT_INVALID'};
 const factor=1+alpha*(temp-20);
 if(factor<=0)return {error:'NONPOSITIVE_TEMPERATURE_RESISTANCE'};
 const r=r20*factor*lengthKm,reactance=x*lengthKm;
 if(!Number.isFinite(r)||!Number.isFinite(reactance)||r>1e8||reactance>1e8)
  return {error:'CONDUCTOR_IMPEDANCE_OVERFLOW'};
 return {r,x:reactance};
}
function epLineImpedanceV44(data,loadCurrent=null){
 if(!data||typeof data!=='object'||Array.isArray(data))
  return ep44Result('UNKNOWN',['LINE_DATA_MISSING']);
 if(data.model!=='TN_PHASE_PE_RADIAL_SINGLE_UTILITY')
  return ep44Result('UNKNOWN',['NETWORK_MODEL_UNSUPPORTED']);
 if(data.route_length_verified!==true||data.source_impedance_verified!==true)
  return ep44Result('UNKNOWN',['ROUTE_OR_SOURCE_IMPEDANCE_UNVERIFIED']);
 const length=ep44Number(data.route_length_m);
 if(length===null||length>100000)return ep44Result('UNKNOWN',['INVALID_ROUTE_LENGTH']);
 const km=length/1000,phase=ep44Conductor(data.phase_conductor,km);
 const pe=ep44Conductor(data.pe_conductor,km);
 if(phase.error||pe.error)return ep44Result('UNKNOWN',[...[phase.error,pe.error].filter(Boolean)]);
 const sr=ep44Number(data.source_r_ohm,true),sx=ep44Number(data.source_x_ohm,true);
 const cmin=ep44Number(data.minimum_voltage_factor),ia=ep44Number(data.ia_a_at_required_disconnection_time);
 if([sr,sx,cmin,ia].some(v=>v===null)||cmin>1)
  return ep44Result('UNKNOWN',['SOURCE_OR_TRIP_DATA_INVALID']);
 if(data.trip_curve_source_verified!==true||data.disconnection_time_limit_verified!==true)
  return ep44Result('UNKNOWN',['TIME_OR_TRIP_CURVE_EVIDENCE_MISSING']);
 const loopR=sr+phase.r+pe.r,loopX=sx+phase.x+pe.x;
 const zs=Math.hypot(loopR,loopX),ik=230*cmin/zs;
 if(!(zs>0)||!Number.isFinite(zs)||zs>1e8)
  return ep44Result('UNKNOWN',['FAULT_LOOP_IMPEDANCE_INVALID']);
 if(!Number.isFinite(ik)||ik>1e8)
  return ep44Result('UNKNOWN',['FAULT_CURRENT_OVERFLOW']);
 const tn=epTNDisconnectionV43({
  earthing_system:'TN',source_impedance_included:true,temperature_basis_checked:true,
  disconnection_time_limit_verified:true,trip_curve_source_verified:true,
  u0_v:230,zs_ohm:String(zs),
  ia_a_at_required_disconnection_time:String(ia),minimum_voltage_factor:String(cmin)});
 let drop;
 if(loadCurrent===null||loadCurrent===undefined)
  drop=ep44Result('UNKNOWN',['LOAD_CURRENT_NOT_BOUND_TO_PROJECT']);
 else if(!['single_phase_L_N','three_phase_balanced'].includes(data.voltage_drop_phase))
  drop=ep44Result('UNKNOWN',['VOLTAGE_DROP_PHASE_UNSUPPORTED']);
 else if(data.voltage_drop_phase==='single_phase_L_N'&&data.neutral_conductor_confirmed_equivalent!==true)
  drop=ep44Result('UNKNOWN',['NEUTRAL_IMPEDANCE_NOT_ESTABLISHED']);
 else drop=epVoltageDropV43({
  method:'explicit_conductor_R_X_at_operating_temperature',
  phase_configuration:data.voltage_drop_phase,
  r_ohm_per_conductor:String(phase.r),x_ohm_per_conductor:String(phase.x),
  power_factor:data.power_factor,
  design_voltage_v:data.voltage_drop_phase==='single_phase_L_N'?230:400,
  max_drop_percent:data.max_drop_percent,
  conductor_temperature_verified:true,total_route_verified:true},loadCurrent);
 const status=tn.status==='PASS'&&drop.status==='PASS'?'PASS':
  tn.status==='FAIL'||drop.status==='FAIL'?'FAIL':'UNKNOWN';
 return ep44Result(status,[],{
  phase_resistance_ohm:String(phase.r),phase_reactance_ohm:String(phase.x),
  pe_resistance_ohm:String(pe.r),pe_reactance_ohm:String(pe.x),
  calculated_loop_resistance_ohm:String(loopR),
  calculated_loop_reactance_ohm:String(loopX),
  calculated_zs_ohm:String(zs),
  calculated_min_fault_current_a:String(ik),
  tn_disconnection:tn,voltage_drop:drop,
  evidence_state:'USER_ASSERTED_INPUTS_NOT_EXTERNALLY_AUTHENTICATED',
  notice:'Only fault-loop estimate, not max prospective short-circuit; conductor/source/curve require external verification.'
 });
}
function ep44BindLine(project,line){
 if(!line?.route44Input)return null;
 const model=line.route44Input,ib=line.overloadInput?.ibA;
 const r=epLineImpedanceV44(model,ib);
 const issues=[...r.issues];
 if(!['TN-S','TN-C-S'].includes(project?.earthing))issues.push('PROJECT_NOT_TN');
 if(line.phase==='3Ф'&&model.voltage_drop_phase!=='three_phase_balanced'||
  ['L1','L2','L3'].includes(line.phase)&&model.voltage_drop_phase!=='single_phase_L_N'||
  !['L1','L2','L3','3Ф'].includes(line.phase))issues.push('LINE_PHASE_CONFIGURATION_MISMATCH');
 if(line.calculationReview?.pending?.includes('route44Input'))issues.push('STALE_LINE_REVIEW');
 const status=r.status==='FAIL'||issues.some(x=>['PROJECT_NOT_TN','LINE_PHASE_CONFIGURATION_MISMATCH','STALE_LINE_REVIEW'].includes(x))
  ?'BLOCKED':'UNKNOWN';
 return {status,result:r,issues,design_current_origin:'line.overloadInput.ibA',
  declared_ib_a:ib??null,ready_for_installation:false,engineeringApproved:false};
}

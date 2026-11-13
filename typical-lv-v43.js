'use strict';
// v4.14 typical_lv_v43.py standalone scope, TN loop and voltage-drop checks.
// Browser implementation uses Number for trigonometric sqrt; near comparison
// boundaries returns UNKNOWN, never optimistic PASS. No automatic normative
// selection, curve lookup, real measurements or engineer approval.
const EP43_SQRT3=1.7320508075688772935274463415;
function ep43Num(v,allowZero=false){
 if(v===null||v===undefined||typeof v==='boolean'||typeof v==='object')return null;
 const raw=String(v).trim();
 if(raw.length>128||!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d{1,5})?$/.test(raw))return null;
 const n=Number(raw);
 if(!Number.isFinite(n)||(!allowZero&&n<=0)||(allowZero&&n<0)||n!==0&&(Math.abs(n)>=1e9||Math.abs(n)<1e-8))
  return null;
 return n;
}
function ep43Result(status,issues,extra={}) {
 return {status,issues,ready_for_design:false,ready_for_installation:false,...extra};
}
function epScopeV43(data){
 if(!data||typeof data!=='object'||Array.isArray(data))
  return ep43Result('UNKNOWN',['INSTALLATION_SCOPE_NOT_SUPPLIED']);
 if(!['residential','ordinary_commercial'].includes(data.installation_category))
  return ep43Result('OUT_OF_SCOPE',['INSTALLATION_CATEGORY_UNSUPPORTED']);
 if(data.voltage_system!=='AC_230_400_V_50_HZ')
  return ep43Result('OUT_OF_SCOPE',['VOLTAGE_SYSTEM_UNSUPPORTED']);
 if(data.supply_architecture!=='single_utility_source')
  return ep43Result('OUT_OF_SCOPE',['COMPLEX_SUPPLY_ARCHITECTURE_UNSUPPORTED']);
 if(data.special_installation!==false)
  return ep43Result('OUT_OF_SCOPE',['SPECIAL_INSTALLATION_REQUIRES_SEPARATE_REVIEW']);
 return ep43Result('IN_SCOPE_PRELIMINARY',[],{note:'Scope does not establish safety'});
}
function ep43MarginCompare(value,limit){
 // Strongly conservative IEEE754 uncertainty guard around equality;
 // Python Decimal parity is not claimed for the boundary envelope.
 const delta=Math.abs(value-limit),tolerance=1e-11*Math.max(1,Math.abs(value),Math.abs(limit));
 return delta<=tolerance?'UNKNOWN':value<limit?'PASS':'FAIL';
}
function epVoltageDropV43(data,designCurrent){
 if(!data||typeof data!=='object'||Array.isArray(data))
  return ep43Result('UNKNOWN',['VOLTAGE_DROP_DATA_MISSING']);
 if(data.method!=='explicit_conductor_R_X_at_operating_temperature')
  return ep43Result('UNKNOWN',['R_X_BASIS_NOT_ESTABLISHED']);
 const phase=data.phase_configuration;
 if(!['single_phase_L_N','three_phase_balanced'].includes(phase))
  return ep43Result('UNKNOWN',['PHASE_CONFIGURATION_UNSUPPORTED']);
 if(data.conductor_temperature_verified!==true)
  return ep43Result('UNKNOWN',['CONDUCTOR_TEMPERATURE_NOT_VERIFIED']);
 if(data.total_route_verified!==true)
  return ep43Result('UNKNOWN',['TOTAL_ROUTE_NOT_VERIFIED']);
 const r=ep43Num(data.r_ohm_per_conductor),x=ep43Num(data.x_ohm_per_conductor,true);
 const cos=ep43Num(data.power_factor),voltage=ep43Num(data.design_voltage_v);
 const limit=ep43Num(data.max_drop_percent),ib=ep43Num(designCurrent);
 if([r,x,cos,voltage,limit,ib].some(v=>v===null)||cos>1||limit>100)
  return ep43Result('UNKNOWN',['INVALID_VOLTAGE_DROP_INPUT']);
 if(phase==='single_phase_L_N'&&voltage!==230||phase==='three_phase_balanced'&&voltage!==400)
  return ep43Result('UNKNOWN',['VOLTAGE_SYSTEM_CONFLICT']);
 const sin=Math.sqrt(Math.max(0,1-cos*cos)),k=phase==='single_phase_L_N'?2:EP43_SQRT3;
 const drop=k*ib*(r*cos+x*sin);
 if(!Number.isFinite(drop)||drop<0)
  return ep43Result('UNKNOWN',['NEGATIVE_VOLTAGE_DROP_MODEL']);
 const percentage=drop*100/voltage;
 if(!Number.isFinite(percentage))
  return ep43Result('UNKNOWN',['INVALID_VOLTAGE_DROP_INPUT']);
 const status=ep43MarginCompare(percentage,limit);
 if(status==='UNKNOWN')
  return ep43Result('UNKNOWN',['NEAR_BOUNDARY_REQUIRES_HIGH_PRECISION_REVIEW'],{voltage_drop_v:drop,voltage_drop_percent:percentage,specified_limit_percent:limit});
 return ep43Result(status,status==='FAIL'?['VOLTAGE_DROP_EXCEEDS_SPECIFIED_LIMIT']:[],
  {voltage_drop_v:drop,voltage_drop_percent:percentage,specified_limit_percent:limit,
   note:'User-provided R/X, temperature, current and limit not independently verified'});
}
function epTNDisconnectionV43(data){
 if(!data||typeof data!=='object'||Array.isArray(data))
  return ep43Result('UNKNOWN',['FAULT_LOOP_DATA_MISSING']);
 if(data.earthing_system!=='TN')
  return ep43Result('UNKNOWN',['TN_MODEL_ONLY_OTHER_EARTHING_SYSTEM_NEEDS_SEPARATE_METHOD']);
 if(data.source_impedance_included!==true||data.temperature_basis_checked!==true)
  return ep43Result('UNKNOWN',['FAULT_LOOP_IMPEDANCE_BASIS_NOT_VERIFIED']);
 if(data.disconnection_time_limit_verified!==true||data.trip_curve_source_verified!==true)
  return ep43Result('UNKNOWN',['DISCONNECTION_TIME_OR_CURVE_NOT_VERIFIED']);
 if(data.u0_v!==230)return ep43Result('UNKNOWN',['U0_NOT_230_V_FOR_SELECTED_SCOPE']);
 const zs=ep43Num(data.zs_ohm),ia=ep43Num(data.ia_a_at_required_disconnection_time);
 const cmin=ep43Num(data.minimum_voltage_factor);
 if([zs,ia,cmin].some(v=>v===null)||cmin>1)
  return ep43Result('UNKNOWN',['INVALID_DISCONNECTION_INPUT']);
 const current=230*cmin/zs;
 if(!Number.isFinite(current))return ep43Result('UNKNOWN',['INVALID_DISCONNECTION_INPUT']);
 const status=ep43MarginCompare(ia,current); // ia < current => PASS
 if(status==='UNKNOWN')
  return ep43Result('UNKNOWN',['NEAR_BOUNDARY_REQUIRES_HIGH_PRECISION_REVIEW'],
   {calculated_min_fault_current_a:current,required_operation_current_a:ia,declared_loop_impedance_ohm:zs});
 return ep43Result(status,status==='FAIL'?['FAULT_CURRENT_BELOW_REQUIRED_OPERATION_CURRENT']:[],
  {calculated_min_fault_current_a:current,required_operation_current_a:ia,declared_loop_impedance_ohm:zs,
   note:'Trip current and limit are user supplied. PE and protection NOT established'});
}
function epLV43BoundLine(project,line){
 if(!line||!line.lv43Input)return null;
 const input=line.lv43Input;
 const scope=epScopeV43(input.scope);
 const systemOK=['TN-S','TN-C-S'].includes(project?.earthing);
 const three=line.phase==='3Ф';
 const expected=three?'three_phase_balanced':'single_phase_L_N';
 const phaseOK=['L1','L2','L3','3Ф'].includes(line.phase)&&input.voltage_drop?.phase_configuration===expected;
 const loadCurrent=line.overloadInput?.ibA;
 const drop=epVoltageDropV43(input.voltage_drop,loadCurrent);
 const tn=epTNDisconnectionV43(input.tn_disconnection);
 const reasons=[];
 if(!systemOK)reasons.push('PROJECT_NOT_TN');
 if(!phaseOK)reasons.push('LINE_PHASE_CONFIGURATION_MISMATCH');
 if(scope.status!=='IN_SCOPE_PRELIMINARY')reasons.push('SCOPE_NOT_PRELIMINARY');
 if(line.calculationReview?.pending?.includes('lv43Input'))reasons.push('STALE_LINE_REVIEW');
 for(const part of [drop,tn])if(part.status==='FAIL')reasons.push('NUMERIC_FAILURE');
 const status=reasons.some(x=>['PROJECT_NOT_TN','LINE_PHASE_CONFIGURATION_MISMATCH','NUMERIC_FAILURE'].includes(x))?'BLOCKED':
  reasons.includes('STALE_LINE_REVIEW')?'BLOCKED':'UNKNOWN';
 return {status,scope,tn,voltage_drop:drop,issues:reasons,
  design_current_origin:'line.overloadInput.ibA',
  declared_ib_a:loadCurrent??null,
  normative_status:'UNVERIFIED',engineeringApproved:false,ready_for_design:false,
  ready_for_installation:false};
}

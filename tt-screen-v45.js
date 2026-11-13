'use strict';
// Browser-compatible isolated port of electropanel/tt_cable_v45.py:
// tt_rcd_screen_v45 only. Non-normative screen; no automatic approval.
// Depends on overload-v30.js exact decimal primitives.
function epTTPositive(v) {
 if(typeof v==='boolean'||v===null||v===undefined||typeof v==='object')return null;
 const d=epV30Decimal(v);
 if(!d)return null;
 const magnitude=d.coefficient.toString().length+d.exponent-1;
 if(magnitude>8||magnitude< -8)return null;
 return d;
}
// Python decimal.localcontext(prec=34) uses ROUND_HALF_EVEN at each operation.
function epTTRound34(decimal) {
 const digits=decimal.coefficient.toString();
 if(digits.length<=34)return decimal;
 const discarded=digits.slice(34);
 let first=BigInt(digits.slice(0,34));
 if(discarded[0]>'5'||discarded[0]==='5'&&
   (/[1-9]/.test(discarded.slice(1))||(first%2n===1n)))first++;
 let exponent=decimal.exponent+digits.length-34;
 if(first.toString().length>34){first/=10n;exponent++;}
 return {coefficient:first,exponent};
}
function epTTScreenV45(data) {
 const answer=(status,issues,extra={})=>({
  status,issues,ready_for_design:false,ready_for_installation:false,...extra
 });
 if(!data||typeof data!=='object'||Array.isArray(data))
  return answer('UNKNOWN',['TT_DATA_MISSING']);
 if(data.earthing_system!=='TT'||data.supply_architecture!=='single_utility_source')
  return answer('OUT_OF_SCOPE',['TT_SUPPLY_MODEL_UNSUPPORTED']);
 if(data.special_installation!==false)
  return answer('OUT_OF_SCOPE',['SPECIAL_INSTALLATION_REQUIRES_REVIEW']);
 const ra=epTTPositive(data.ra_ohm),idn=epTTPositive(data.rcd_rated_residual_current_ma);
 const ul=epTTPositive(data.permitted_touch_voltage_v);
 if(!ra||!idn||!ul||!['25','50'].some(v=>epV30Compare(ul,epV30Decimal(v))===0))
  return answer('UNKNOWN',['TT_NUMERICAL_DATA_INVALID_OR_LIMIT_UNSUPPORTED']);
 if(data.earth_electrode_measurement_available!==true)
  return answer('UNKNOWN',['RA_MEASUREMENT_MISSING']);
 if(data.ra_includes_protective_conductor!==true)
  return answer('UNKNOWN',['RA_DEFINITION_NOT_ESTABLISHED']);
 if(data.rcd_datasheet_verified!==true)
  return answer('UNKNOWN',['RCD_IDENTITY_AND_DATASHEET_UNVERIFIED']);
 if(data.required_disconnection_time_verified!==true||data.rcd_disconnection_time_verified!==true)
  return answer('UNKNOWN',['RCD_TIME_COORDINATION_UNVERIFIED']);
 if(data.pe_continuity_verified!==true)
  return answer('UNKNOWN',['PE_CONTINUITY_UNVERIFIED']);
 const required=epTTPositive(data.required_disconnection_time_s);
 const measured=epTTPositive(data.measured_rcd_disconnection_time_s);
 if(!required||!measured)
  return answer('UNKNOWN',['TT_DISCONNECTION_TIME_VALUE_MISSING']);
 if(data.rcd_test_condition_verified!==true)
  return answer('UNKNOWN',['RCD_TEST_CONDITION_NOT_VERIFIED']);
 const touch=epTTRound34(epV30Multiply(epTTRound34(epV30Multiply(ra,idn)),epV30Decimal('0.001')));
 if(touch.coefficient.toString().length+touch.exponent-1>8)
  return answer('UNKNOWN',['TT_ARITHMETIC_OVERFLOW']);
 const touchOK=epV30Compare(touch,ul)<=0;
 const timeOK=epV30Compare(measured,required)<=0;
 const issues=[];
 if(!touchOK)issues.push('RA_TIMES_IDN_EXCEEDS_UL');
 if(!timeOK)issues.push('RCD_DISCONNECTION_TIME_EXCEEDED');
 return answer(touchOK&&timeOK?'PASS':'FAIL',issues,{
  calculated_ra_times_idn_v:epV30Format(touch),
  permitted_touch_voltage_v:epV30Format(ul),
  measured_rcd_disconnection_time_s:epV30Format(measured),
  required_disconnection_time_s:epV30Format(required),
  note:'Only RA × IΔn ≤ UL is screened; no automatic disconnection proof, actual test or normative certificate',
  evidence_state:'USER_ASSERTED_NOT_INDEPENDENTLY_AUTHENTICATED'
 });
}

const EP_TT_ALLOWED_FIELDS=Object.freeze([
 'earthing_system','supply_architecture','special_installation','ra_ohm',
 'rcd_rated_residual_current_ma','permitted_touch_voltage_v',
 'earth_electrode_measurement_available','ra_includes_protective_conductor',
 'rcd_datasheet_verified','required_disconnection_time_verified',
 'rcd_disconnection_time_verified','pe_continuity_verified',
 'required_disconnection_time_s','measured_rcd_disconnection_time_s',
 'rcd_test_condition_verified'
]);
function epNormalizeTTContext(input) {
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('TT context must be JSON object');
 const keys=Object.keys(input);
 if(keys.length>EP_TT_ALLOWED_FIELDS.length)throw Error('Too many TT fields');
 const result={};
 for(const key of keys){
  if(!EP_TT_ALLOWED_FIELDS.includes(key))throw Error('Unknown TT field: '+key);
  const v=input[key];
  if(v===null||typeof v==='boolean')result[key]=v;
  else if(typeof v==='number'&&Number.isFinite(v))result[key]=v;
  else if(typeof v==='string'&&v.length<=128)result[key]=v;
  else throw Error('Invalid TT field: '+key);
 }
 return result;
}

'use strict';
// Evidence gate for an ENGINEER-DECLARED required automatic disconnection time.
// Does not infer IEC 60364 table values, network class, voltage band, or protection approval.
function epDisconnectionContextV1(project,line,article){
 const issues=[],add=(code,level='UNKNOWN')=>issues.push({code,level,lineId:line?.id??null});
 const finish=(extra={})=>({schema:'electropanel.disconnection.context.declared.1',
  status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN',issues,
  numericalStatus:'UNKNOWN',maxAllowedTimeS:null,declaredTimeS:null,
  timeMarginS:null,engineeringApproved:false,ready_for_installation:false,...extra});
 const route=line?.faultRouteInput;
 const source=route?.disconnectionContext;
 if(source===undefined||source===null){add('DISCONNECTION_CONTEXT_MISSING');return finish();}
 if(!source||typeof source!=='object'||Array.isArray(source)){
  add('DISCONNECTION_CONTEXT_INVALID','BLOCKED');return finish();
 }
 const number=v=>{
  if(typeof v!=='string'&&typeof v!=='number')return null;
  const raw=String(v).trim().replace(',','.');
  if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw))return null;
  const value=Number(raw);return Number.isFinite(value)&&value>0&&value<=1000?value:null;
 };
 const maxAllowed=number(source.maxAllowedTimeS);
 const required=number(route?.requiredTimeS);
 const u0=number(route?.u0V);
 if(maxAllowed===null){add('DISCONNECTION_ALLOWED_TIME_INVALID','BLOCKED');return finish();}
 if(required===null){add('DISCONNECTION_REQUIRED_TIME_INVALID','BLOCKED');return finish();}
 if(!['FINAL_CIRCUIT','DISTRIBUTION_CIRCUIT','OTHER'].includes(source.circuitClass))
  add('DISCONNECTION_CIRCUIT_CLASS_INVALID','BLOCKED');
 if(source.protectiveMeasure!=='ADS_OVERCURRENT')
  add('DISCONNECTION_PROTECTIVE_MEASURE_UNSUPPORTED','BLOCKED');
 if(!['TN-S','TN-C-S'].includes(project?.earthing)||
    source.earthing!==project.earthing)
  add('DISCONNECTION_EARTHING_MISMATCH','BLOCKED');
 if(source.phase!==line?.phase)
  add('DISCONNECTION_PHASE_MISMATCH','BLOCKED');
 if(number(source.u0V)===null||number(source.u0V)!==u0)
  add('DISCONNECTION_VOLTAGE_MISMATCH','BLOCKED');
 if(!article||article.kind!=='MCB')
  add('DISCONNECTION_DEVICE_UNSUPPORTED','UNKNOWN');
 for(const [key,code] of [
  ['standardReference','DISCONNECTION_STANDARD_SOURCE_MISSING'],
  ['timeBasisSource','DISCONNECTION_TIME_BASIS_MISSING'],
  ['circuitClassSource','DISCONNECTION_CLASS_BASIS_MISSING']]){
  if(typeof source[key]!=='string'||!source[key].trim())add(code);
  else if(source[key].length>2000)add('DISCONNECTION_SOURCE_TOO_LONG','BLOCKED');
 }
 if(source.applicabilityReviewed!==true)
  add('DISCONNECTION_APPLICABILITY_NOT_REVIEWED');
 const delta=maxAllowed-required;
 if(delta< -1e-10*Math.max(maxAllowed,required)){
  add('DISCONNECTION_REQUESTED_TIME_EXCEEDS_LIMIT','BLOCKED');
 }
 const numericalStatus=issues.some(x=>x.level==='BLOCKED')?'FAIL':
  'PRELIMINARY_WITHIN_DECLARED_LIMIT';
 return finish({numericalStatus,maxAllowedTimeS:maxAllowed,
  declaredTimeS:required,timeMarginS:delta,
  circuitClass:source.circuitClass??null,protectiveMeasure:source.protectiveMeasure??null,
  standardReference:source.standardReference??null,
  timeBasisSource:source.timeBasisSource??null,
  circuitClassSource:source.circuitClassSource??null,
  notice:'Time limit is declared by engineer, not derived from a standard table. Numeric comparison is not normative approval.'});
}
if(typeof module!=='undefined'&&module.exports)module.exports={epDisconnectionContextV1};

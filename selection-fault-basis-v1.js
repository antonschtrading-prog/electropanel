'use strict';
// Selection uses the independent, project-bound maximum prospective Ik only
// when the fault scenario and comparison point are explicitly scoped.
// Does not turn a manual Ik into an authenticated maximum or infer L-PE from L-N.
function epSelectionFaultBasisV1(project,line,lookup){
 const issues=[],add=(code,level='UNKNOWN')=>issues.push({code,level,lineId:line?.id??null});
 const output=(fields={})=>({schema:'electropanel.selection.fault.basis.1',
  mode:'NONE',status:issues.some(i=>i.level==='BLOCKED')?'BLOCKED':'UNKNOWN',
  ikMaxKa:null,voltageV:null,model:null,comparisonPoint:null,issues,
  engineeringApproved:false,ready_for_installation:false,...fields});
 const numeric=value=>{
  if(typeof value!=='number'&&typeof value!=='string')return null;
  const s=String(value).trim().replace(',','.');
  if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(s))return null;
  const n=Number(s);return Number.isFinite(n)&&n>0&&n<=1e7?n:null;
 };
 const manual=numeric(line?.faultInput?.ikKa??line?.ikKa??line?.breakingCapacityInput?.ikKa);
 const manualV=numeric(line?.faultInput?.voltageV);
 const input=line?.maximumFaultInput;
 if(!input){
  add('SELECTION_MAX_FAULT_MODEL_MISSING');
  return output({mode:'MANUAL_ONLY',manualIkKa:manual,manualVoltageV:manualV});
 }
 if(!input||typeof input!=='object'||Array.isArray(input)||
    typeof epMaximumFaultCurrentV2!=='function'){
  add('SELECTION_MAX_FAULT_MODULE_UNAVAILABLE','BLOCKED');
  return output();
 }
 let calculated;
 try{calculated=epMaximumFaultCurrentV2(project,line,lookup);}
 catch(_){
  add('SELECTION_MAX_FAULT_CALCULATION_ERROR','BLOCKED');return output();
 }
 for(const issue of calculated.issues||[]){
  if(issue.level==='BLOCKED')add('SELECTION_'+issue.code,'BLOCKED');
  if(issue.code==='MAX_FAULT_BASIS_STALE')add('SELECTION_MAX_FAULT_BASIS_STALE');
 }
 const point=typeof input.comparisonPoint==='string'?input.comparisonPoint.trim():'';
 if(!point)add('SELECTION_MAX_FAULT_POINT_UNDECLARED');
 if(!['SINGLE_PHASE_L_N','THREE_PHASE_POSITIVE_SEQUENCE'].includes(input.model))
  add('SELECTION_MAX_FAULT_MODEL_UNSUPPORTED','BLOCKED');
 const ik=numeric(calculated.ikMaxKa),voltage=numeric(calculated.voltageV);
 if(ik===null||voltage===null)add('SELECTION_MAX_FAULT_RESULT_UNAVAILABLE','BLOCKED');
 if(manual!==null&&line?.faultInput?.comparisonPoint===point&&
    line?.faultInput?.model===input.model){
  if(manual+1e-10*Math.max(ik??0,manual)<(ik??0))
   add('SELECTION_MANUAL_IK_UNDERSTATES_SAME_POINT_MAX','BLOCKED');
  if(manual>(ik??0)*(1+1e-10))
   add('SELECTION_MANUAL_IK_DIFFERS_FROM_MAX');
 }else if(manual!==null)
  add('SELECTION_MANUAL_IK_DIFFERENT_OR_UNSCOPED_POINT');
 if(manualV!==null&&voltage!==null&&manualV!==voltage)
  add('SELECTION_FAULT_VOLTAGE_CONTEXT_MISMATCH','BLOCKED');
 const forbidden=issues.some(i=>i.level==='BLOCKED'||i.code==='SELECTION_MAX_FAULT_BASIS_STALE')||
  !point||ik===null||voltage===null;
 if(forbidden)return output({mode:'CALCULATED_UNUSABLE',model:input.model,
   comparisonPoint:point||null,manualIkKa:manual,manualVoltageV:manualV,
   calculatedIkMaxKa:ik,calculatedVoltageV:voltage});
 return output({mode:'CALCULATED_MAXIMUM',ikMaxKa:ik,voltageV:voltage,
  model:input.model,comparisonPoint:point,manualIkKa:manual,
  manualVoltageV:manualV,calculatedIkMaxKa:ik,calculatedVoltageV:voltage,
  notice:'Ik,max is modelled from declared network R/X and a named comparison point; it is not an independently verified fault study.'});
}
if(typeof module!=='undefined'&&module.exports)module.exports={epSelectionFaultBasisV1};

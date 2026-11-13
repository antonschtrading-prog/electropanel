'use strict';
// Explicit design-stage load-current arithmetic. Values must be declared; no assumed voltage or power factor.
function epLoadCurrentV1(input){
 const result=(status,code,details={})=>({schema:'electropanel.load.current.1',status,code,...details,engineeringApproved:false});
 if(!input||typeof input!=='object'||Array.isArray(input))return result('BLOCKED','INPUT_INVALID');
 const num=(v,min,max)=>{
  if(typeof v==='boolean'||v===null||v===undefined||typeof v==='object')return null;
  const s=String(v).trim().replace(',','.');
  if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(s))return null;
  const n=Number(s);return Number.isFinite(n)&&n>=min&&n<=max?n:null;
 };
 const mode=input.mode;
 if(!['single_phase','three_phase'].includes(mode))return result('BLOCKED','PHASE_MODE_INVALID');
 const powerKw=num(input.powerKw,0.000001,100000),voltageV=num(input.voltageV,1,100000),
  powerFactor=num(input.powerFactor,0.000001,1),efficiency=num(input.efficiency,0.000001,1),
  demandFactor=num(input.demandFactor,0.000001,1);
 if([powerKw,voltageV,powerFactor,efficiency,demandFactor].some(x=>x===null))
  return result('BLOCKED','DECLARED_INPUTS_REQUIRED');
 const root=mode==='three_phase'?Math.sqrt(3):1;
 const ibA=powerKw*1000*demandFactor/(root*voltageV*powerFactor*efficiency);
 if(!Number.isFinite(ibA)||ibA<=0||ibA>100000)return result('BLOCKED','RESULT_OUT_OF_RANGE');
 return result('CALCULATED','ARITHMETIC_ONLY',{
  ibA,roundedIbA:Math.ceil(ibA*1000)/1000,
  mode,inputs:{powerKw,voltageV,powerFactor,efficiency,demandFactor},
  formula:mode==='three_phase'?'P*1000*kd/(sqrt(3)*Ull*cosPhi*eta)':'P*1000*kd/(Uln*cosPhi*eta)',
  assumptions:['powerKw is input mechanical power when efficiency is below 1; otherwise electrical active power',
   'single_phase uses line-neutral voltage; three_phase uses line-line voltage',
   'balanced steady-state load; startup, harmonics and thermal duty not evaluated']
 });
}
function epApplyLoadCurrentV1(project,lineId,input){
 if(!project||!Array.isArray(project.lines)||typeof lineId!=='string'||!lineId)
  return {status:'BLOCKED',code:'PROJECT_INVALID',project:null};
 const matches=project.lines.filter(x=>x&&x.id===lineId);
 if(matches.length!==1)return {status:'BLOCKED',code:'LINE_NOT_UNIQUE',project:null};
 const phase=matches[0].phase;
 if(phase==='3Ф'&&input?.mode!=='three_phase'||['L1','L2','L3'].includes(phase)&&input?.mode!=='single_phase')
  return {status:'BLOCKED',code:'PHASE_MODE_CONFLICT',project:null};
 const calculation=epLoadCurrentV1(input);
 if(calculation.status!=='CALCULATED')return {...calculation,project:null};
 const copy=JSON.parse(JSON.stringify(project)),line=copy.lines.find(x=>x.id===lineId);
 line.overloadInput={...(line.overloadInput||{}),ibA:calculation.roundedIbA};
 line.loadCurrentCalculation={mode:calculation.mode,inputs:calculation.inputs,formula:calculation.formula,
  ibA:calculation.ibA,roundedIbA:calculation.roundedIbA,assumptions:calculation.assumptions};
 line.calculationReview={required:true,reason:'LOAD_CURRENT_CALCULATED_REVIEW_REQUIRED'};
 line.protectionInputSource='load_current_formula';
 return {status:'REVIEW_REQUIRED',code:'CURRENT_CALCULATED',project:copy,lineId,calculation};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epLoadCurrentV1,epApplyLoadCurrentV1};

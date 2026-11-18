'use strict';
// Manual declarations only. Do not derive Ib, Iz or Ik from nominal power or manufacturer data.
function epProtectionInputsV1(project,lineId,raw){
 if(!project||!Array.isArray(project.lines)||typeof lineId!=='string'||!raw||typeof raw!=='object')
  return {status:'BLOCKED',code:'INPUT_INVALID',project:null};
 const matches=project.lines.filter(x=>x?.id===lineId);
 if(!matches.length)return {status:'BLOCKED',code:'LINE_NOT_FOUND',project:null};
 if(matches.length!==1)return {status:'BLOCKED',code:'LINE_NOT_UNIQUE',project:null};
 const parse=(value,max)=>{
  if(value===null||value===undefined||typeof value==='boolean'||typeof value==='object')return null;
  const s=String(value).trim().replace(',','.');
  if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(s))return null;
  const n=Number(s);return Number.isFinite(n)&&n>0&&n<=max?n:null;
 };
 const emptyIk=typeof raw.ikKa==='string'&&raw.ikKa.trim()==='';
 const ib=parse(raw.ibA,100000),iz=parse(raw.izA,100000),ik=emptyIk?null:parse(raw.ikKa,1000);
 if(ib===null||iz===null||(!emptyIk&&ik===null))return {status:'BLOCKED',code:'POSITIVE_DECLARATIONS_REQUIRED',project:null};
 if(ib>iz)return {status:'BLOCKED',code:'IB_EXCEEDS_IZ',project:null};
 const voltageSupplied=Object.prototype.hasOwnProperty.call(raw,'voltageV');
 const emptyVoltage=raw.voltageV===null||raw.voltageV===undefined||raw.voltageV==='';
 const voltage=voltageSupplied&&!emptyVoltage?parse(raw.voltageV,1500):null;
 if(voltageSupplied&&!emptyVoltage&&voltage===null)
  return {status:'BLOCKED',code:'FAULT_VOLTAGE_INVALID',project:null};
 const copy=JSON.parse(JSON.stringify(project));
 const target=copy.lines.find(x=>x.id===lineId);
 target.overloadInput={...(target.overloadInput||{}),ibA:ib,izA:iz};
 target.faultInput={...(target.faultInput||{})};
 // Ik is optional for a panel-only draft. Only an explicitly emptied form field
 // removes an earlier declaration; omitted, null and malformed values stay invalid.
 if(emptyIk)delete target.faultInput.ikKa;
 else target.faultInput.ikKa=ik;
 if(voltageSupplied){
  if(emptyVoltage)delete target.faultInput.voltageV;
  else target.faultInput.voltageV=voltage;
 }
 // Preserve outstanding checks when a manual declaration is edited.
 // A manually overridden Ib is no longer safe to auto-refresh as circuit-linked.
 const prior=target.loadCurrentCalculation;
 const rounded=prior?.roundedIbA;
 const numericCalculated=typeof rounded==='number'&&Number.isFinite(rounded)?rounded:null;
 const manualIbOverride=prior&&numericCalculated!==null&&Math.abs(numericCalculated-ib)>1e-9;
 if(manualIbOverride){
  prior.stale=true;
  prior.powerSource='manual';
 }
 if(typeof epMarkCalculationReviewV1==='function')
  epMarkCalculationReviewV1(target,'MANUAL_PROTECTION_INPUTS_CHANGED',undefined,true);
 else{
  const names=['overloadInput','faultInput','overloadV30','lv43Input','route44Input'];
  const priorReview=target.calculationReview&&typeof target.calculationReview==='object'?
   target.calculationReview:{};
  const pending=new Set(Array.isArray(priorReview.pending)?
   priorReview.pending.filter(k=>names.includes(k)):[]);
  if(priorReview.required&&!Array.isArray(priorReview.pending))
   for(const key of names)if(target[key])pending.add(key);
  for(const key of names)if(target[key])pending.add(key);
  target.calculationReview={...priorReview,required:true,reason:'MANUAL_PROTECTION_INPUTS_CHANGED',pending:[...pending]};
 }
 target.protectionInputSource='manual_declaration';
 return {status:'UNKNOWN',code:'MANUAL_INPUTS_RECORDED_REVIEW_REQUIRED',
  project:copy,lineId,values:{ibA:ib,izA:iz,ikKa:ik,...(voltageSupplied?{voltageV:voltage}: {})},
  manualIbOverride:!!manualIbOverride,affectedViews:['protection','singleLine','engineeringReview','loadCurrent'],
  engineeringApproved:false,ready_for_installation:false};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epProtectionInputsV1};

'use strict';
// Manual declarations only. Do not derive Ib, Iz or Ik from nominal power or manufacturer data.
function epProtectionInputsV1(project,lineId,raw){
 if(!project||!Array.isArray(project.lines)||typeof lineId!=='string'||!raw||typeof raw!=='object')
  return {status:'BLOCKED',code:'INPUT_INVALID',project:null};
 const line=project.lines.find(x=>x?.id===lineId);
 if(!line)return {status:'BLOCKED',code:'LINE_NOT_FOUND',project:null};
 const parse=(value,max)=>{
  if(value===null||value===undefined||typeof value==='boolean'||typeof value==='object')return null;
  const s=String(value).trim().replace(',','.');
  if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(s))return null;
  const n=Number(s);return Number.isFinite(n)&&n>0&&n<=max?n:null;
 };
 const ib=parse(raw.ibA,100000),iz=parse(raw.izA,100000),ik=parse(raw.ikKa,1000);
 if(ib===null||iz===null||ik===null)return {status:'BLOCKED',code:'POSITIVE_DECLARATIONS_REQUIRED',project:null};
 if(ib>iz)return {status:'BLOCKED',code:'IB_EXCEEDS_IZ',project:null};
 const copy=JSON.parse(JSON.stringify(project));
 const target=copy.lines.find(x=>x.id===lineId);
 target.overloadInput={...(target.overloadInput||{}),ibA:ib,izA:iz};
 target.faultInput={...(target.faultInput||{}),ikKa:ik};
 target.calculationReview={required:true,reason:'MANUAL_PROTECTION_INPUTS_CHANGED'};
 target.protectionInputSource='manual_declaration';
 return {status:'UNKNOWN',code:'MANUAL_INPUTS_RECORDED_REVIEW_REQUIRED',
  project:copy,lineId,values:{ibA:ib,izA:iz,ikKa:ik},
  engineeringApproved:false,ready_for_installation:false};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epProtectionInputsV1};

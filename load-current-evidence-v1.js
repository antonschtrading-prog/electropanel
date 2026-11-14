'use strict';
// Read-only audit of design-stage load-current calculation provenance.
// Re-evaluates declared arithmetic, never supplies missing voltage or cos(phi).
function epLoadCurrentEvidenceV1(project,calculator){
 const blocked=(code)=>({schema:'electropanel.load.current.evidence.1',status:'BLOCKED',
  rows:[],issues:[{code,level:'BLOCKED'}],engineeringApproved:false});
 if(!project||!Array.isArray(project.lines)||project.lines.length>400)
  return blocked('LOAD_CURRENT_PROJECT_INVALID');
 const calculate=typeof calculator==='function'?calculator:
  typeof epLoadCurrentV1==='function'?epLoadCurrentV1:
  typeof module!=='undefined'&&module.exports?require('./load-current-v1.js').epLoadCurrentV1:null;
 const num=v=>{
  if(v===null||v===undefined||typeof v==='boolean'||typeof v==='object')return null;
  const s=String(v).trim().replace(',','.');
  if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(s))return null;
  const n=Number(s);return Number.isFinite(n)&&n>0&&n<=100000?n:null;
 };
 const issues=[],rows=[],seen=new Set();
 const add=(lineId,code,level='UNKNOWN')=>issues.push({lineId,code,level});
 for(const line of project.lines){
  if(!line||typeof line.id!=='string'||!line.id||seen.has(line.id)){
   add(line?.id??null,'LOAD_CURRENT_CIRCUIT_INVALID','BLOCKED');continue;
  }
  seen.add(line.id);
  const data=line.loadCurrentCalculation,ib=num(line.overloadInput?.ibA);
  const pending=Array.isArray(line.calculationReview?.pending)?line.calculationReview.pending:[];
  if(!data){
   if(ib===null)add(line.id,'LOAD_CURRENT_IB_MISSING');
   rows.push({lineId:line.id,calculation:null,ibA:line.overloadInput?.ibA??null,
    source:ib===null?'MISSING':'MANUAL_DECLARATION',status:'UNKNOWN',
    reviewRequired:!!line.calculationReview?.required,pending:[...pending]});
   continue;
  }
  if(typeof data!=='object'||Array.isArray(data)){
   add(line.id,'LOAD_CURRENT_RECORD_INVALID','BLOCKED');
   rows.push({lineId:line.id,calculation:null,ibA:line.overloadInput?.ibA??null,
    source:'INVALID',status:'BLOCKED',reviewRequired:true,pending:[...pending]});continue;
  }
  const source=data.powerSource==='circuit'?'CIRCUIT_LINKED':
   data.powerSource==='manual'?'MANUAL_CALCULATION':'UNKNOWN';
  if(source==='UNKNOWN')add(line.id,'LOAD_CURRENT_SOURCE_UNKNOWN');
  if(typeof calculate!=='function')add(line.id,'LOAD_CURRENT_CALCULATOR_UNAVAILABLE','BLOCKED');
  let recalculated=null;
  if(typeof calculate==='function')
   try{recalculated=calculate({mode:data.mode,...(data.inputs||{})});}
   catch(_){add(line.id,'LOAD_CURRENT_RECALCULATION_FAILED','BLOCKED');}
  if(recalculated&&recalculated.status!=='CALCULATED')
   add(line.id,'LOAD_CURRENT_INPUTS_INVALID','BLOCKED');
  if(recalculated?.status==='CALCULATED'){
   if(num(data.roundedIbA)!==recalculated.roundedIbA)
    add(line.id,'LOAD_CURRENT_SAVED_RESULT_MISMATCH','BLOCKED');
   if(num(data.ibA)!==null&&Math.abs(Number(data.ibA)-recalculated.ibA)>1e-9)
    add(line.id,'LOAD_CURRENT_UNROUNDED_RESULT_MISMATCH','BLOCKED');
  }
  const expectedMode=line.phase==='3Ф'?'three_phase':
   ['L1','L2','L3'].includes(line.phase)?'single_phase':null;
  if(expectedMode&&data.mode!==expectedMode)
   add(line.id,'LOAD_CURRENT_PHASE_MODE_MISMATCH','BLOCKED');
  if(source==='CIRCUIT_LINKED'){
   const power=line.power??line.powerKw;
   if(num(power)===null||num(data.inputs?.powerKw)!==num(power))
    add(line.id,'LOAD_CURRENT_LINKED_POWER_MISMATCH','BLOCKED');
  }
  if(ib===null)add(line.id,'LOAD_CURRENT_IB_MISSING');
  else if(recalculated?.status==='CALCULATED'&&ib!==recalculated.roundedIbA)
   add(line.id,'LOAD_CURRENT_IB_DIFFERS_FROM_RESULT',
    data.stale===true&&source==='MANUAL_CALCULATION'?'UNKNOWN':'BLOCKED');
  if(data.stale===true)add(line.id,'LOAD_CURRENT_STALE');
  if(line.calculationReview?.required)add(line.id,'LOAD_CURRENT_REVIEW_REQUIRED');
  const currentIssues=issues.filter(x=>x.lineId===line.id);
  rows.push({lineId:line.id,calculation:data,ibA:line.overloadInput?.ibA??null,source,
   status:currentIssues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN',
   reviewRequired:!!line.calculationReview?.required,pending:[...pending]});
 }
 return {schema:'electropanel.load.current.evidence.1',
  status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN',rows,issues,
  summary:{circuits:rows.length,calculated:rows.filter(x=>x.calculation!==null).length,
   manual:rows.filter(x=>x.source==='MANUAL_DECLARATION').length,
   missing:rows.filter(x=>x.source==='MISSING').length,
   stale:rows.filter(x=>x.calculation?.stale===true).length,
   blocking:issues.filter(x=>x.level==='BLOCKED').length},
  engineeringApproved:false,ready_for_installation:false};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epLoadCurrentEvidenceV1};

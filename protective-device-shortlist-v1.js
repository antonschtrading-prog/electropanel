'use strict';
// Shortlist only. Does not establish normative selection or installation safety.
function epProtectiveDeviceShortlistV1(line,catalog){
 const issues=[],candidates=[];
 const add=(code,level='UNKNOWN')=>issues.push({code,level});
 const positive=v=>{
  if(v===null||v===undefined||typeof v==='boolean'||typeof v==='object')return null;
  const s=String(v).trim().replace(',','.');
  if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(s))return null;
  const n=Number(s);return Number.isFinite(n)&&n>0?n:null;
 };
 if(!line||typeof line!=='object')return {status:'BLOCKED',issues:[{code:'LINE_INVALID',level:'BLOCKED'}],
  candidates:[],engineeringApproved:false,ready_for_installation:false};
 const ib=positive(line.overloadInput?.ibA),iz=positive(line.overloadInput?.izA);
 const ik=positive(line.ikKa??line.breakingCapacityInput?.ikKa);
 if(ib===null)add('DESIGN_CURRENT_MISSING');
 if(iz===null)add('CABLE_CAPACITY_MISSING');
 if(ik===null)add('FAULT_CURRENT_MISSING');
 if(!['L1','L2','L3','3Ф'].includes(line.phase))add('PHASE_UNDECLARED');
 const records=Array.isArray(catalog)?catalog:[];
 if(records.length>10000)return {status:'BLOCKED',issues:[{code:'CATALOG_TOO_LARGE',level:'BLOCKED'}],
  candidates:[],engineeringApproved:false,ready_for_installation:false};
 for(const item of records){
  const d=item?.device??item,sku=item?.id??d?.sku;
  if(!d||d.kind!=='MCB'||!sku)continue;
  const reasons=[];
  if(!Number.isFinite(d.inA)||d.inA<=0||!Number.isFinite(d.icnKa)||d.icnKa<=0||
    !Number.isInteger(d.poles)||d.poles<1)reasons.push('CATALOG_SPEC_INVALID');
  if(!['L1','L2','L3','3Ф'].includes(line.phase))reasons.push('PHASE_UNDECLARED');
  else if(line.phase==='3Ф'?![3,4].includes(d.poles):d.poles!==1)reasons.push('POLES_INCOMPATIBLE');
  if(ib!==null&&d.inA<ib)reasons.push('IN_LT_IB');
  if(iz!==null&&d.inA>iz)reasons.push('IN_GT_IZ');
  if(ik!==null&&d.icnKa<ik)reasons.push('ICN_LT_DECLARED_IK');
  candidates.push({sku,maker:d.maker??null,series:d.series??null,
   inA:d.inA,icnKa:d.icnKa,poles:d.poles,
   status:reasons.length?'REJECTED':(ib===null||iz===null||ik===null?'INCOMPLETE':'POTENTIAL'),
   reasons,engineeringApproved:false});
 }
 candidates.sort((a,b)=>({POTENTIAL:0,INCOMPLETE:1,REJECTED:2}[a.status]-{POTENTIAL:0,INCOMPLETE:1,REJECTED:2}[b.status])||
  (Number.isFinite(a.inA)?a.inA:Infinity)-(Number.isFinite(b.inA)?b.inA:Infinity)||
  String(a.sku).localeCompare(String(b.sku)));
 if(!candidates.some(c=>c.status==='POTENTIAL'))add('NO_POTENTIAL_ARTICLES');
 add('I2_TRIP_CURVE_SELECTIVITY_AND_DISCONNECTION_NOT_VERIFIED');
 add('INSTALLATION_METHOD_AND_CABLE_EVIDENCE_NOT_VERIFIED');
 return {status:'UNKNOWN',issues,candidates,engineeringApproved:false,
  ready_for_installation:false,
  note:'Potential candidates satisfy only available arithmetic comparisons. Not an engineering selection.'};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epProtectiveDeviceShortlistV1};

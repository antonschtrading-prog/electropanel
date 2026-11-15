'use strict';
// Explanatory ranking of already screened candidate breakers. This is NOT
// electrical approval: no penalty weighting is allowed to override rejection.
// Ranking does not invent missing manufacturer ratings or short-circuit values.
function epProtectiveCandidateRankingV1(line,shortlist,faultBasis=null){
 const raw=Array.isArray(shortlist?.candidates)?shortlist.candidates:[];
 const num=v=>typeof v==='number'&&Number.isFinite(v)&&v>0?v:null;
 const parse=v=>{
  if(typeof v!=='number'&&typeof v!=='string')return null;
  const s=String(v).trim().replace(',','.');
  if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(s))return null;
  const x=Number(s);return Number.isFinite(x)&&x>0?x:null;
 };
 const ib=parse(line?.overloadInput?.ibA),iz=parse(line?.overloadInput?.izA);
 const ik=parse(line?.faultInput?.ikKa??line?.ikKa??line?.breakingCapacityInput?.ikKa);
 const volts=parse(line?.faultInput?.voltageV);
 const rows=[];
 for(const c of raw){
  const reasons=[...(c.reasons||[])],warnings=[...(c.caution||[])];
  if(faultBasis?.mode==='CALCULATED_UNUSABLE')
   warnings.push('SELECTION_MAXIMUM_CURRENT_UNUSABLE');
  if(faultBasis?.mode==='MANUAL_ONLY')
   warnings.push('SELECTION_ONLY_MANUAL_IK');
  for(const issue of faultBasis?.issues||[]){
   // These issues describe the originally selected apparatus, not every
   // alternative candidate. Re-evaluate Icn and voltage per candidate below.
   if(['SELECTION_MAX_FAULT_EXCEEDS_ICN',
        'SELECTION_MAX_FAULT_ICN_VOLTAGE_INSUFFICIENT'].includes(issue.code)){
    warnings.push('ORIGINAL_SELECTED_ARTICLE_'+issue.code);continue;
   }
   // A defective network calculation or contradictory manual basis cannot
   // prove that every candidate is electrically incapable. It suspends the
   // inspection classification until the fault study is resolved.
   if(faultBasis?.mode==='CALCULATED_UNUSABLE'||
      issue.code==='SELECTION_MANUAL_IK_UNDERSTATES_SAME_POINT_MAX')
    warnings.push(issue.code);
   else if(issue.level==='BLOCKED')reasons.push(issue.code);
   else warnings.push(issue.code);
  }
  const rated=num(c.inA),icn=num(c.icnKa),ratedVolts=num(c.icnVoltageV);
  const eligible=c.status==='POTENTIAL'&&reasons.length===0;
  const missing=[];
  if(ib===null)missing.push('IB_MISSING');
  if(iz===null)missing.push('IZ_MISSING');
  if(ik===null)missing.push('IK_MISSING');
  if(volts===null)missing.push('FAULT_VOLTAGE_UNDECLARED');
  if(ratedVolts===null)missing.push('ICN_APPLICATION_VOLTAGE_UNDECLARED');
  if(!c.icnStandard)missing.push('ICN_STANDARD_UNDECLARED');
  if(c.manufacturerEvidence?.status!=='FACTS_MATCH')
   missing.push(c.manufacturerEvidence?.status==='CONFLICT'?
    'MANUFACTURER_FACTS_CONFLICT':'PRIMARY_MANUFACTURER_FACTS_INCOMPLETE');
  if(c.verificationStatus!=='VERIFIED')
   missing.push('PASSPORT_VERIFICATION_OUTSTANDING');
  missing.push('I2_TRIP_TIME_SELECTIVITY_AND_ADS_OUTSTANDING');
  missing.push('CABLE_THERMAL_WITHSTAND_OUTSTANDING');
  const currentHeadroomA=rated!==null&&ib!==null?rated-ib:null;
  const cableHeadroomA=rated!==null&&iz!==null?iz-rated:null;
  const breakingHeadroomKa=icn!==null&&ik!==null?icn-ik:null;
  const voltageHeadroomV=ratedVolts!==null&&volts!==null?ratedVolts-volts:null;
  if(currentHeadroomA!==null&&currentHeadroomA<0&&!reasons.includes('IN_LT_IB'))
   reasons.push('RANKING_IB_EXCEEDS_IN');
  if(cableHeadroomA!==null&&cableHeadroomA<0&&!reasons.includes('IN_GT_IZ'))
   reasons.push('RANKING_IN_EXCEEDS_IZ');
  if(breakingHeadroomKa!==null&&breakingHeadroomKa<0&&!reasons.includes('ICN_LT_DECLARED_IK'))
   reasons.push('RANKING_IK_EXCEEDS_ICN');
  if(voltageHeadroomV!==null&&voltageHeadroomV<0&&!reasons.includes('ICN_VOLTAGE_LT_DECLARED'))
   reasons.push('RANKING_ICN_VOLTAGE_EXCEEDED');
  const contradiction=reasons.length>0||c.status==='REJECTED';
  // This is an inspection order only: first numerical suitability,
  // then fewer documentary gaps, then deterministic catalogue attributes.
  const essentialMissing=ib===null||iz===null||ik===null||volts===null||
   ratedVolts===null||!c.icnStandard||
   faultBasis?.mode==='CALCULATED_UNUSABLE'||
   (faultBasis?.issues||[]).some(i=>
    i.code==='SELECTION_MANUAL_IK_UNDERSTATES_SAME_POINT_MAX');
  const classification=contradiction?'EXCLUDED':
   !eligible||essentialMissing?'INCOMPLETE':'PRELIMINARY_CANDIDATE';
  rows.push({catalogKey:c.sku,manufacturerSku:c.manufacturerSku??null,
   maker:c.maker??null,series:c.series??null,inA:rated,icnKa:icn,
   classification,originalStatus:c.status,
   ikComparisonSource:faultBasis?.mode==='CALCULATED_MAXIMUM'?
    'CALCULATED_MAXIMUM':'MANUAL_OR_MISSING',
   calculatedFaultPoint:faultBasis?.comparisonPoint??null,
   calculatedFaultModel:faultBasis?.model??null,
   ikComparedKa:ik,
   manualIkKa:faultBasis?.manualIkKa??null,
   currentHeadroomA,cableHeadroomA,breakingHeadroomKa,voltageHeadroomV,
   blockingReasons:[...new Set(reasons)],
   openEvidence:[...new Set([...missing,...warnings])],
   sourceUrl:c.manufacturerEvidence?.sourceUrl??c.source??null,
   sourceStatus:c.manufacturerEvidence?.status??'UNKNOWN',
   engineeringApproved:false,ready_for_installation:false});
 }
 rows.sort((a,b)=>{
  const tier=x=>({PRELIMINARY_CANDIDATE:0,INCOMPLETE:1,EXCLUDED:2}[x.classification]??3);
  const t=tier(a)-tier(b);if(t)return t;
  if(a.openEvidence.length!==b.openEvidence.length)
   return a.openEvidence.length-b.openEvidence.length;
  if(a.inA!==b.inA)return (a.inA??Infinity)-(b.inA??Infinity);
  if(a.icnKa!==b.icnKa)return (a.icnKa??Infinity)-(b.icnKa??Infinity);
  return String(a.catalogKey).localeCompare(String(b.catalogKey));
 });
 return {schema:'electropanel.protection.candidate.ranking.draft.1',status:'UNKNOWN',
  rows,summary:{preliminary:rows.filter(x=>x.classification==='PRELIMINARY_CANDIDATE').length,
   incomplete:rows.filter(x=>x.classification==='INCOMPLETE').length,
   excluded:rows.filter(x=>x.classification==='EXCLUDED').length},
  engineeringApproved:false,ready_for_installation:false,
  notice:'Inspection order is based on declared numerical checks and documentary gaps. It does not select an apparatus, approve installation, or replace verified thermal, trip-time and normative calculations.'};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epProtectiveCandidateRankingV1};

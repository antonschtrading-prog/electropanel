'use strict';
// Shared constraint filter for preview, application and supplier export.
// All measurements are preliminary interior envelopes, not manufacturer-verified fit.
function epCabinetOptionConstraintsV1(report,limits={}){
 const fail=code=>({schema:'electropanel.cabinet.option.constraints.1',status:'BLOCKED',
  issues:[{code,level:'BLOCKED'}],eligible:[],excluded:[],summary:{total:0,eligible:0,excluded:0},
  engineeringApproved:false,confirmedCabinetFit:false});
 if(!report||report.schema!=='electropanel.universal.cabinet.options.1'||
  !Array.isArray(report.options)||!limits||typeof limits!=='object'||Array.isArray(limits))
  return fail('CABINET_CONSTRAINT_INPUT_INVALID');
 const fields=['maxUsableWidthMm','maxUsableHeightMm','maxUsableDepthMm'];
 if(Object.keys(limits).some(k=>!fields.includes(k)||limits[k]!==null&&
  (typeof limits[k]!=='number'||!Number.isFinite(limits[k])||limits[k]<=0)))
  return fail('CABINET_CONSTRAINT_LIMIT_INVALID');
 const eligible=[],excluded=[];
 for(const o of report.options){
  const reasons=[];
  if(o.status!=='REVIEW_REQUIRED')reasons.push('PATTERN_BLOCKED');
  for(const [axis,field,property] of [
   ['WIDTH','maxUsableWidthMm','preliminaryUsableWidthMm'],
   ['HEIGHT','maxUsableHeightMm','preliminaryUsableHeightMm'],
   ['DEPTH','maxUsableDepthMm','preliminaryUsableDepthMm']]){
   const max=limits[field];
   if(max==null)continue;
   const value=o.envelope?.[property];
   if(typeof value!=='number'||!Number.isFinite(value)||value<=0)
    reasons.push(axis+'_UNKNOWN');
   else if(value>max)reasons.push(axis+'_EXCEEDS_LIMIT');
  }
  const row={optionId:o.id,capacityModules:o.capacityModules,railCount:o.railCount,
   modulesPerRail:o.modulesPerRail,orientation:o.orientation,reasons,
   confirmedCabinetFit:false};
  (reasons.length?excluded:eligible).push(row);
 }
 return {schema:'electropanel.cabinet.option.constraints.1',
  status:eligible.length?'REVIEW_REQUIRED':'BLOCKED',
  eligible,excluded,summary:{total:report.options.length,eligible:eligible.length,excluded:excluded.length},
  issues:eligible.length?[]:[{code:'CABINET_CONSTRAINT_NO_ELIGIBLE_PATTERN',level:'BLOCKED'}],
  engineeringApproved:false,confirmedCabinetFit:false};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCabinetOptionConstraintsV1};

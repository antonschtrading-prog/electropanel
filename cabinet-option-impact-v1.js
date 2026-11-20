'use strict';
// Evaluate all eligible alternatives against the same unchanged project snapshot.
function epCabinetOptionImpactV1(project,report,lookup,settings={}){
 const fail=code=>({schema:'electropanel.cabinet.option.impact.1',status:'BLOCKED',code,
  rows:[],summary:{eligible:0,previewable:0,unavailable:0},engineeringApproved:false});
 if(!project||!report||!Array.isArray(report.options)||report.options.length>500||
  !settings||typeof settings!=='object'||Array.isArray(settings)||
  typeof epCabinetOptionPreviewV1!=='function')return fail('OPTION_IMPACT_INPUT_INVALID');
 const excluded=settings.excludedIds??[];
 if(!Array.isArray(excluded)||excluded.some(x=>typeof x!=='string'))
  return fail('OPTION_IMPACT_EXCLUSIONS_INVALID');
 const denied=new Set(excluded),ids=new Set(),rows=[];
 for(const option of report.options){
  if(!option||typeof option.id!=='string'||!option.id.trim()||ids.has(option.id))
   return fail('OPTION_IMPACT_ID_INVALID');
  ids.add(option.id);
  if(option.status==='BLOCKED'||denied.has(option.id))continue;
  const p=epCabinetOptionPreviewV1(project,option,lookup);
  const valid=p.status==='REVIEW_REQUIRED';
  rows.push({id:option.id,previewable:valid,
   reason:valid?'PREVIEW_AVAILABLE':p.code,
   moved:valid?p.summary.moved:null,
   changedRails:valid?p.summary.changedRails:null,
   changedSlots:valid?p.summary.changedSlots:null,
   unchanged:valid?p.summary.unchanged:null,
   capacityDelta:valid?p.summary.capacityDelta:null,
   geometryResetRequired:valid?p.summary.geometryResetRequired:null,
   engineeringApproved:false});
 }
 rows.sort((a,b)=>Number(b.previewable)-Number(a.previewable)||
  (a.moved??Infinity)-(b.moved??Infinity)||
  (a.changedRails??Infinity)-(b.changedRails??Infinity)||
  a.id.localeCompare(b.id));
 const previewable=rows.filter(x=>x.previewable).length;
 return {schema:'electropanel.cabinet.option.impact.1',
  status:previewable?'REVIEW_REQUIRED':'UNKNOWN',
  code:previewable?'OPTION_IMPACT_PRELIMINARY':'OPTION_IMPACT_UNAVAILABLE',
  rows,summary:{eligible:rows.length,previewable,unavailable:rows.length-previewable},
  engineeringApproved:false,
  note:'Changes to DIN positions are estimates from a valid current board; not an electrical approval.'};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCabinetOptionImpactV1};

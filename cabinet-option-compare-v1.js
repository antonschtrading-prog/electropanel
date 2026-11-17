'use strict';
// Manufacturer-neutral comparison of already computed cabinet variants.
// Ranking is a convenience for layout exploration, not engineering certification.
function epCabinetOptionCompareV1(report,options={}){
 const blocked=code=>({schema:'electropanel.cabinet.option.compare.1',status:'BLOCKED',code,
  rows:[],recommendedId:null,totals:{candidates:0,eligible:0,rejected:0},
  engineeringApproved:false,manufacturerCabinetFitVerified:false});
 if(!report||!Array.isArray(report.options)||report.options.length>500||
  !options||typeof options!=='object'||Array.isArray(options))
  return blocked('OPTION_COMPARE_INPUT_INVALID');
 const allowed=['balanced','compact','wide','tall','connections','stability'];
 const preference=options.preference??'balanced';
 if(!allowed.includes(preference))return blocked('OPTION_COMPARE_PREFERENCE_INVALID');
 const excluded=options.excludedIds??[];
 if(!Array.isArray(excluded)||excluded.some(x=>typeof x!=='string'||x.length>80))
  return blocked('OPTION_COMPARE_EXCLUSIONS_INVALID');
 const impact=options.impactRows??[];
 if(!Array.isArray(impact)||impact.some(r=>!r||typeof r.id!=='string'||
  typeof r.previewable!=='boolean'||r.previewable&&
  (!Number.isInteger(r.moved)||r.moved<0||!Number.isInteger(r.changedRails)||r.changedRails<0)))
  return blocked('OPTION_COMPARE_IMPACT_INVALID');
 const impactMap=new Map(impact.map(r=>[r.id,r]));
 if(impactMap.size!==impact.length)return blocked('OPTION_COMPARE_IMPACT_DUPLICATE');
 const excludedSet=new Set(excluded),seen=new Set();
 const rows=[];
 for(const o of report.options){
  if(!o||typeof o.id!=='string'||!o.id.trim()||seen.has(o.id)||!Number.isInteger(o.capacityModules)||
   !Number.isInteger(o.railCount)||!Number.isInteger(o.modulesPerRail)||
   o.capacityModules!==o.railCount*o.modulesPerRail||
   !Number.isFinite(o.envelope?.preliminaryUsableWidthMm)||
   !Number.isFinite(o.envelope?.preliminaryUsableHeightMm))
   return blocked('OPTION_COMPARE_VARIANT_INVALID');
  seen.add(o.id);
  const width=o.envelope.preliminaryUsableWidthMm,height=o.envelope.preliminaryUsableHeightMm;
  if(width<=0||height<=0)return blocked('OPTION_COMPARE_DIMENSIONS_INVALID');
  const reserve=Number.isInteger(o.reserveModules)?o.reserveModules:
   Number.isInteger(o.usedModules)?o.capacityModules-o.usedModules:null;
  const proximity=o.connectionProximity||{};
  const cross=Number.isInteger(proximity.crossRail)?proximity.crossRail:0;
  const unresolved=Number.isInteger(proximity.unresolved)?proximity.unresolved:0;
  const used=Number.isInteger(o.usedModules)?o.usedModules:null;
  const eligible=o.status!=='BLOCKED'&&!excludedSet.has(o.id)&&
   (o.packingMethod==='PACKED'||o.packingMethod==='PACKED_EXACT')&&
   reserve!==null&&reserve>=0&&used!==null&&used>=0&&used<=o.capacityModules;
  const aspect=width/height,aspectPenalty=Math.abs(Math.log(aspect));
  const area=width*height;
  const movement=impactMap.get(o.id);
  const score=preference==='stability'?
   (movement?.previewable?movement.moved*1000+movement.changedRails*100+area/1000:
    1000000000+area/1000):preference==='compact'?
   area/1000+o.capacityModules*0.1+cross*2+unresolved*10:
   preference==='wide'?height/10+width/100+cross*2+unresolved*10:
   preference==='tall'?width/10+height/100+cross*2+unresolved*10:
   preference==='connections'?cross*100+unresolved*1000+area/1000:
   area/1000+aspectPenalty*20+cross*5+unresolved*20;
  rows.push({id:o.id,orientation:o.orientation,railCount:o.railCount,
   modulesPerRail:o.modulesPerRail,capacityModules:o.capacityModules,usedModules:used,
   reserveModules:reserve,freePct:Math.round(100*reserve/o.capacityModules*10)/10,
   widthMm:width,heightMm:height,areaMm2:area,aspectRatio:Math.round(aspect*100)/100,
   crossRailLinks:cross,unresolvedLinks:unresolved,packingMethod:o.packingMethod,
   movedDevices:movement?.previewable?movement.moved:null,
   changedRailDevices:movement?.previewable?movement.changedRails:null,
   eligible,reason:excludedSet.has(o.id)?'CONSTRAINT_EXCLUDED':o.status==='BLOCKED'?'OPTION_BLOCKED':
    !eligible?'PACKING_NOT_CONFIRMED':'PRELIMINARY_ONLY',score:Math.round(score*1000)/1000,
   engineeringApproved:false});
 }
 rows.sort((a,b)=>Number(b.eligible)-Number(a.eligible)||a.score-b.score||
  a.capacityModules-b.capacityModules||a.id.localeCompare(b.id));
 const eligible=rows.filter(x=>x.eligible);
 const movementKnown=preference!=='stability'||eligible.some(x=>x.movedDevices!==null);
 return {schema:'electropanel.cabinet.option.compare.1',
  status:!eligible.length?'BLOCKED':movementKnown?'REVIEW_REQUIRED':'UNKNOWN',
  code:!eligible.length?'OPTION_COMPARE_NO_ELIGIBLE':movementKnown?
   'OPTION_COMPARE_PRELIMINARY':'OPTION_COMPARE_MOVEMENT_UNAVAILABLE',
  preference,recommendedId:movementKnown?eligible[0]?.id??null:null,rows,
  totals:{candidates:rows.length,eligible:eligible.length,rejected:rows.length-eligible.length},
  engineeringApproved:false,manufacturerCabinetFitVerified:false};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCabinetOptionCompareV1};

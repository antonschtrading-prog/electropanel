'use strict';
// Preliminary supplier-neutral schedule, NOT a verified product size or installer instruction.
function epCabinetCapacityCsvV1(report,limits={}){
 const cols=['pattern','capacity_modules','rows','modules_per_row','orientation','used_modules',
  'reserve_modules','usable_width_estimate_mm','usable_height_estimate_mm',
  'usable_depth_estimate_mm','side_wiring_corridor_each_mm','row_wiring_corridor_mm',
  'terminal_height_reserve_mm','assumption_status','within_user_limits','enclosure_sku',
  'constraint_reason','packing_method','source_dimension_status'];
 const esc=v=>{let s=String(v??'');if(/^[\s]*[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
 const serialize=row=>row.map(esc).join(';');
 const fail=code=>({schema:'electropanel.cabinet.sizing.csv.1',csv:'\uFEFF'+serialize(cols)+'\r\n',
  status:'BLOCKED',issues:[{code,level:'BLOCKED'}],engineeringApproved:false});
 if(!report||report.schema!=='electropanel.universal.cabinet.options.1'||
    !Array.isArray(report.options)||report.status==='BLOCKED')return fail('CABINET_CSV_INPUT_INVALID');
 if(!limits||typeof limits!=='object'||Array.isArray(limits)||
  Object.keys(limits).some(key=>!['maxUsableWidthMm','maxUsableHeightMm','maxUsableDepthMm'].includes(key)||
   limits[key]!==null&&(typeof limits[key]!=='number'||!Number.isFinite(limits[key])||limits[key]<=0)))
  return fail('CABINET_CSV_LIMITS_INVALID');
 const rows=[cols],issues=[];
 const summary={considered:0,withinLimits:0,exceedsLimits:0,unknownDimensions:0};
 for(const o of report.options){
  if(o.status==='BLOCKED')continue;
  const env=o.envelope||{},plan=env.spacePlan||{};
  const dimensions=[['WIDTH',env.preliminaryUsableWidthMm,limits.maxUsableWidthMm],
   ['HEIGHT',env.preliminaryUsableHeightMm,limits.maxUsableHeightMm],
   ['DEPTH',env.preliminaryUsableDepthMm,limits.maxUsableDepthMm]];
  const reasons=[];
  for(const [axis,value,max] of dimensions){
   if(max===undefined)continue;
   if(typeof value!=='number'||!Number.isFinite(value)||value<=0)
    reasons.push(axis+'_UNKNOWN');
   else if(value>max)reasons.push(axis+'_EXCEEDS_LIMIT');
  }
  const limitStatus=reasons.some(x=>x.endsWith('_EXCEEDS_LIMIT'))?'EXCEEDS_LIMITS':
   reasons.length?'DIMENSIONS_UNKNOWN':'REVIEW_REQUIRED';
  summary.considered++;
  if(limitStatus==='EXCEEDS_LIMITS')summary.exceedsLimits++;
  else if(limitStatus==='DIMENSIONS_UNKNOWN')summary.unknownDimensions++;
  else summary.withinLimits++;
  rows.push([o.id,o.capacityModules,o.railCount,o.modulesPerRail,o.orientation,
   o.usedModules,o.reserveModules,env.preliminaryUsableWidthMm??'UNKNOWN',
   env.preliminaryUsableHeightMm??'UNKNOWN',
   env.preliminaryUsableDepthMm??'UNKNOWN',
   plan.sideWiringCorridorMm??'UNKNOWN',
   plan.wiringCorridorPerRailMm??'UNKNOWN',
   plan.terminalReserveMm??'UNKNOWN',
   'PRELIMINARY_NOT_MANUFACTURER_FIT',limitStatus,'',reasons.join('|'),
   o.packingMethod||'UNKNOWN',
   env.preliminaryUsableDepthMm==null?'DEPTH_UNKNOWN':'DEPTH_ESTIMATE_ONLY']);
 }
 if(rows.length===1)issues.push({code:'CABINET_CSV_NO_FITTING_PATTERN',level:'BLOCKED'});
 return {schema:'electropanel.cabinet.sizing.csv.1',
  csv:'\uFEFF'+rows.map(serialize).join('\r\n')+'\r\n',
  status:issues.length?'BLOCKED':'REVIEW_REQUIRED',issues,summary,
  engineeringApproved:false,ready_for_installation:false};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCabinetCapacityCsvV1};

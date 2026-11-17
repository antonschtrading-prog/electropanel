'use strict';
// Preliminary supplier-neutral schedule, NOT a verified product size or installer instruction.
function epCabinetCapacityCsvV1(report,limits={}){
 const cols=['pattern','capacity_modules','rows','modules_per_row','orientation','used_modules',
  'reserve_modules','usable_width_estimate_mm','usable_height_estimate_mm',
  'usable_depth_estimate_mm','side_wiring_corridor_each_mm','row_wiring_corridor_mm',
  'terminal_height_reserve_mm','assumption_status','within_user_limits','enclosure_sku'];
 const esc=v=>{let s=String(v??'');if(/^[\s]*[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
 const serialize=row=>row.map(esc).join(';');
 const fail=code=>({schema:'electropanel.cabinet.sizing.csv.1',csv:'\uFEFF'+serialize(cols)+'\r\n',
  status:'BLOCKED',issues:[{code,level:'BLOCKED'}],engineeringApproved:false});
 if(!report||report.schema!=='electropanel.universal.cabinet.options.1'||
    !Array.isArray(report.options)||report.status==='BLOCKED')return fail('CABINET_CSV_INPUT_INVALID');
 if(!limits||typeof limits!=='object'||Array.isArray(limits))return fail('CABINET_CSV_LIMITS_INVALID');
 const rows=[cols],issues=[];
 for(const o of report.options){
  if(o.status==='BLOCKED')continue;
  const env=o.envelope||{},plan=env.spacePlan||{};
  const available=(!limits.maxUsableWidthMm||env.preliminaryUsableWidthMm<=limits.maxUsableWidthMm)&&
   (!limits.maxUsableHeightMm||env.preliminaryUsableHeightMm<=limits.maxUsableHeightMm);
  rows.push([o.id,o.capacityModules,o.railCount,o.modulesPerRail,o.orientation,
   o.usedModules,o.reserveModules,env.preliminaryUsableWidthMm??'UNKNOWN',
   env.preliminaryUsableHeightMm??'UNKNOWN',
   env.preliminaryUsableDepthMm??'UNKNOWN',
   plan.sideWiringCorridorMm??'UNKNOWN',
   plan.wiringCorridorPerRailMm??'UNKNOWN',
   plan.terminalReserveMm??'UNKNOWN',
   'PRELIMINARY_NOT_MANUFACTURER_FIT',available?'REVIEW_REQUIRED':'EXCEEDS_LIMITS','']);
 }
 if(rows.length===1)issues.push({code:'CABINET_CSV_NO_FITTING_PATTERN',level:'BLOCKED'});
 return {schema:'electropanel.cabinet.sizing.csv.1',
  csv:'\uFEFF'+rows.map(serialize).join('\r\n')+'\r\n',
  status:issues.length?'BLOCKED':'REVIEW_REQUIRED',issues,
  engineeringApproved:false,ready_for_installation:false};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCabinetCapacityCsvV1};

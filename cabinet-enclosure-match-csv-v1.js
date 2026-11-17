'use strict';
function epCabinetEnclosureMatchCsvV1(report){
 if(!report||!['REVIEW_REQUIRED','UNKNOWN'].includes(report.status)||
  !Array.isArray(report.rows)||!report.required)
  return {status:'BLOCKED',code:'ENCLOSURE_MATCH_CSV_INVALID',csv:null};
 const q=v=>{let s=String(v??'');if(/^[\s\u0000-\u001f]*[=+@-]/.test(s))s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';};
 const header=['enclosure_id','manufacturer','article','status','required_width_mm',
  'available_width_mm','width_result','required_height_mm','available_height_mm','height_result',
  'required_depth_mm','available_depth_mm','depth_result','required_rails','available_rails',
  'rail_result','missing_apparatus_dimensions','confirmed_fit'];
 const rows=report.rows.map(r=>[r.id,r.manufacturer,r.article,r.status,
  r.checks[0].requiredMm,r.checks[0].availableMm,r.checks[0].result,
  r.checks[1].requiredMm,r.checks[1].availableMm,r.checks[1].result,
  r.checks[2].requiredMm,r.checks[2].availableMm,r.checks[2].result,
  r.requiredRailCount,r.railCapacity,r.railCheck,r.missingApparatusDimensions,'NO']);
 return {status:report.status,rows:rows.length,confirmedFit:false,
  csv:'\uFEFF'+[header,...rows].map(row=>row.map(q).join(';')).join('\r\n')+'\r\n'};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCabinetEnclosureMatchCsvV1};

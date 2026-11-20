'use strict';
// Export auditable nominal/catlogue geometry without inventing missing values.
function epCabinetApparatusGeometryCsvV1(report){
 if(!report||!['UNKNOWN','REVIEW_REQUIRED'].includes(report.status)||!Array.isArray(report.rows))
  return {status:'BLOCKED',code:'GEOMETRY_CSV_INPUT_INVALID',csv:null};
 const q=v=>{let s=String(v??'');if(/^[\s\u0000-\u001f]*[=+@-]/.test(s))s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';};
 const cols=['device_id','article','rail','start_module','modules','nominal_width_mm',
  'catalog_width_mm','catalog_height_mm','catalog_depth_mm','width_basis','dimensions_known',
  'confirmed_fit'];
 const data=report.rows.map(r=>[r.deviceId,r.article,r.railIndex+1,r.startModule+1,r.modules,
  r.nominalWidthMm,r.widthMm,r.heightMm,r.depthMm,r.widthBasis,r.dimensionsKnown?'YES':'NO','NO']);
 return {status:report.status,rows:data.length,engineeringApproved:false,
  csv:'\uFEFF'+[cols,...data].map(row=>row.map(q).join(';')).join('\r\n')+'\r\n'};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCabinetApparatusGeometryCsvV1};

'use strict';
// Separate from the supplier-facing image inventory: engineering diagnostic
// for the *installed* board article front and DIN geometry evidence.
function epCabinetFrontAuditCsvV1(report){
 const invalid=()=>({schema:'electropanel.cabinet.front.audit.csv.1',
  status:'BLOCKED',csv:null,rowCount:0,engineeringApproved:false});
 if(!report||report.schema!=='electropanel.cabinet.front.gallery.1'||
  !Array.isArray(report.rows)||!report.totals)return invalid();
 const safe=value=>{
  let s=String(value??'');
  if(/^[\s\u0000-\u001f]*[=+@-]/.test(s))s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';
 };
 const columns=['sku','maker','series','kind','apparatus_count','device_ids',
  'modules','body_width_mm','nominal_slot_width_mm','geometry_status',
  'front_evidence_status','issue_codes','report_status','engineering_approved'];
 const lines=[columns,...report.rows.map(r=>[
  r.sku,r.maker,r.series,r.kind,r.count,(r.deviceIds||[]).join('|'),
  r.modules,r.widthMm,r.nominalSlotWidthMm,r.geometryStatus,
  r.status,(r.issues||[]).join('|'),report.status,'NO'
 ])];
 return {schema:'electropanel.cabinet.front.audit.csv.1',status:report.status,
  csv:'\uFEFF'+lines.map(r=>r.map(safe).join(';')).join('\r\n')+'\r\n',
  rowCount:report.rows.length,engineeringApproved:false,
  manufacturerCabinetFitVerified:false};
}
if(typeof module!=='undefined'&&module.exports)
 module.exports={epCabinetFrontAuditCsvV1};

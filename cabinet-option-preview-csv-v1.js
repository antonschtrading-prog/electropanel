'use strict';
// Export actual before/after DIN positions, not an engineering approval.
function epCabinetOptionPreviewCsvV1(preview){
 if(!preview||preview.status!=='REVIEW_REQUIRED'||!Array.isArray(preview.rows))
  return {status:'BLOCKED',csv:null,code:'OPTION_PREVIEW_EXPORT_INVALID'};
 const quote=v=>{let s=String(v??'');if(/^[\s\u0000-\u001f]*[=+@-]/.test(s))s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';};
 const header=['device_id','article','modules','from_rail','from_module','to_rail','to_module',
  'rail_changed','position_changed','engineering_approved'];
 const rows=preview.rows.map(r=>[r.deviceId,r.article,r.modules,
  Number.isInteger(r.fromRail)?r.fromRail+1:null,
  Number.isInteger(r.fromSlot)?r.fromSlot+1:null,
  Number.isInteger(r.toRail)?r.toRail+1:null,
  Number.isInteger(r.toSlot)?r.toSlot+1:null,
  r.railChanged?'YES':'NO',r.changed?'YES':'NO','NO']);
 return {status:'REVIEW_REQUIRED',rows:rows.length,engineeringApproved:false,
  csv:'\uFEFF'+[header,...rows].map(row=>row.map(quote).join(';')).join('\r\n')+'\r\n'};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCabinetOptionPreviewCsvV1};

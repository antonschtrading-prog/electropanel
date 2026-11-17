'use strict';
// Procurement-oriented missing-dimension checklist from actual selected articles.
// Never guesses terminal coordinates or product envelopes.
function epCabinetMissingGeometryCsvV1(project,lookup){
 const heads=['device_id','selected_article','maker','series','body_width_mm',
  'body_height_mm','body_depth_mm','missing_information','source_type',
  'source_reviewed_at','source_url','installation_status'];
 const esc=x=>{
  let s=String(x??'');
  if(/^[\s]*[=+@\-\t\r]/.test(s))s="'"+s;
  return '"'+s.replaceAll('"','""')+'"';
 };
 const lines=[heads.map(esc).join(';')],issues=[];
 const fail=code=>({schema:'electropanel.cabinet.missing.geometry.csv.1',
  csv:'\uFEFF'+lines.join('\r\n')+'\r\n',status:'BLOCKED',
  rows:0,issues:[{code,level:'BLOCKED'}],
  engineeringApproved:false,ready_for_installation:false});
 if(typeof epCabinetApparatusEvidenceV1!=='function')return fail('MISSING_GEOMETRY_EVIDENCE_MODULE');
 const r=epCabinetApparatusEvidenceV1(project,lookup);
 if(r.status==='BLOCKED')return fail('MISSING_GEOMETRY_INPUT_BLOCKED');
 let count=0;
 for(const row of r.rows){
  const missing=[];
  if(!row.articleId)missing.push('SELECT_ARTICLE');
  if(row.bodyWidthMm===null)missing.push('BODY_WIDTH');
  if(row.bodyHeightMm===null)missing.push('BODY_HEIGHT');
  if(row.bodyDepthMm===null)missing.push('BODY_DEPTH');
  if(row.sourceReviewedAt===null)missing.push('SOURCE_REVIEW');
  // Even a complete body cuboid has no actual terminal coordinate data.
  missing.push('DIN_MOUNT_OFFSET','TERMINAL_POSITIONS','CONNECTION_CLEARANCES');
  lines.push([row.deviceId,row.articleId||'',row.maker||'',row.series||'',
   row.bodyWidthMm??'UNKNOWN',row.bodyHeightMm??'UNKNOWN',row.bodyDepthMm??'UNKNOWN',
   missing.join('|'),row.sourceType,row.sourceReviewedAt||'NOT_REVIEWED',
   row.sourceUrl||'','NOT_VERIFIED'].map(esc).join(';'));
  count++;
 }
 if(!count)issues.push({code:'MISSING_GEOMETRY_NO_APPARATUS',level:'UNKNOWN'});
 return {schema:'electropanel.cabinet.missing.geometry.csv.1',
  csv:'\uFEFF'+lines.join('\r\n')+'\r\n',status:'REVIEW_REQUIRED',
  rows:count,issues,engineeringApproved:false,ready_for_installation:false};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCabinetMissingGeometryCsvV1};

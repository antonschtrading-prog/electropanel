'use strict';
// Procurement-oriented missing-dimension checklist from actual selected articles.
// Never guesses terminal coordinates or product envelopes.
function epCabinetMissingGeometryCsvV1(project,lookup){
 const heads=['device_id','selected_article','maker','series','body_width_mm',
  'body_height_mm','body_depth_mm','missing_information','source_type',
  'source_reviewed_at','source_url','installation_status','nominal_start_x_mm',
  'nominal_end_x_mm','actual_body_end_x_mm','remaining_band_mm','remaining_body_band_mm'];
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
 // Retain actionable article rows even when a geometry conflict blocks installation.
 // An empty blocked CSV would conceal precisely the data a supplier must correct.
 if(r.status==='BLOCKED'&&!(r.rows||[]).length)return fail('MISSING_GEOMETRY_INPUT_BLOCKED');
 let count=0;
 for(const row of r.rows){
  const missing=[];
  if(!row.articleId)missing.push('SELECT_ARTICLE');
  if(row.bodyWidthMm===null)missing.push('BODY_WIDTH');
  if(row.bodyHeightMm===null)missing.push('BODY_HEIGHT');
  if(row.bodyDepthMm===null)missing.push('BODY_DEPTH');
  if(row.sourceReviewedAt===null)missing.push('SOURCE_REVIEW');
  if(row.sourceUrl===null)missing.push('SOURCE_URL');
  if(row.sourceType==='PROJECT_DECLARATION')missing.push('INDEPENDENT_MANUFACTURER_EVIDENCE');
  if(row.sourceType==='SOURCE_CATEGORY_NOT_DECLARED'||row.sourceType==='NO_ARTICLE')
   missing.push('SOURCE_CATEGORY');
  if(row.issues.includes('APPARATUS_EVIDENCE_SOURCE_LINK_MISSING'))
   missing.push('VALID_SOURCE_LINK');
  if(row.issues.includes('APPARATUS_EVIDENCE_SOURCE_REVIEW_DATE_INVALID'))
   missing.push('CORRECT_REVIEW_DATE');
  // Even a complete body cuboid has no actual terminal coordinate data.
  missing.push('DIN_MOUNT_OFFSET','TERMINAL_POSITIONS','CONNECTION_CLEARANCES');
  lines.push([row.deviceId,row.articleId||'',row.maker||'',row.series||'',
   row.bodyWidthMm??'UNKNOWN',row.bodyHeightMm??'UNKNOWN',row.bodyDepthMm??'UNKNOWN',
   missing.join('|'),row.sourceType,row.sourceReviewedAt||'NOT_REVIEWED',
   row.sourceUrl||'','NOT_VERIFIED',row.nominalStartXMm??'UNKNOWN',
   row.nominalEndXMm??'UNKNOWN',row.actualBodyEndXMm??'UNKNOWN',
   row.remainingZoneWidthMm??'UNKNOWN',row.remainingBodyZoneWidthMm??'UNKNOWN'].map(esc).join(';'));
  count++;
 }
 if(!count)issues.push({code:'MISSING_GEOMETRY_NO_APPARATUS',level:'UNKNOWN'});
 if(r.status==='BLOCKED')issues.push({code:'MISSING_GEOMETRY_INPUT_BLOCKED',level:'BLOCKED'});
 return {schema:'electropanel.cabinet.missing.geometry.csv.1',
  csv:'\uFEFF'+lines.join('\r\n')+'\r\n',status:r.status==='BLOCKED'?'BLOCKED':'REVIEW_REQUIRED',
  rows:count,issues,engineeringApproved:false,ready_for_installation:false};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCabinetMissingGeometryCsvV1};

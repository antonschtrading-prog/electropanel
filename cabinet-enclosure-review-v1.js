'use strict';
// Actionable missing-input and physical-envelope deficits. No installation approval is implied.
function epCabinetEnclosureReviewV1(report){
 const fail=code=>({schema:'electropanel.cabinet.enclosure.review.1',status:'BLOCKED',
  code,rows:[],summary:null,engineeringApproved:false,confirmedFit:false});
 if(report?.schema!=='electropanel.cabinet.enclosure.match.1'||
  !['REVIEW_REQUIRED','UNKNOWN'].includes(report?.status)||
  !Array.isArray(report.rows)||!report.required)
  return fail('ENCLOSURE_REVIEW_INPUT_INVALID');
 const rows=[],ids=new Set();
 for(const r of report.rows){
  if(!r||typeof r.id!=='string'||!r.id||ids.has(r.id)||
   !['PRELIMINARY_MATCH','REJECTED','UNVERIFIED'].includes(r.status)||
   !Array.isArray(r.checks)||r.checks.length!==3||
   !['PASS','FAIL','UNKNOWN'].includes(r.railCheck)||
   !Number.isInteger(r.requiredRailCount)||
   !Number.isInteger(r.missingApparatusDimensions)||r.missingApparatusDimensions<0)
   return fail('ENCLOSURE_REVIEW_ROW_INVALID');
  ids.add(r.id);
  const deficits=[],spare=[],requests=[];
  for(let i=0;i<3;i++){
   const c=r.checks[i],axis=['width','height','depth'][i];
   if(!c||c.dimension!==axis||!['PASS','FAIL','UNKNOWN'].includes(c.result)||
    c.requiredMm!==null&&(!Number.isFinite(c.requiredMm)||c.requiredMm<0)||
    c.availableMm!==null&&(!Number.isFinite(c.availableMm)||c.availableMm<=0))
    return fail('ENCLOSURE_REVIEW_CHECK_INVALID');
   if(c.result==='UNKNOWN'){
    requests.push(c.requiredMm===null?'APPARATUS_'+axis.toUpperCase()+'_MISSING':
     'USABLE_INTERIOR_'+axis.toUpperCase()+'_MISSING');continue;
   }
   if(c.requiredMm===null||c.availableMm===null)
    return fail('ENCLOSURE_REVIEW_CONTRADICTORY_CHECK');
   const delta=Math.round((c.availableMm-c.requiredMm)*1000)/1000;
   if(c.result==='FAIL'){
    if(delta>=-1e-6)return fail('ENCLOSURE_REVIEW_CONTRADICTORY_CHECK');
    deficits.push({axis,missingMm:-delta});
   }else{
    if(delta< -1e-6)return fail('ENCLOSURE_REVIEW_CONTRADICTORY_CHECK');
    spare.push({axis,spareMm:delta});
   }
  }
  if(r.railCheck==='FAIL'){
   if(!Number.isInteger(r.railCapacity)||r.railCapacity>=r.requiredRailCount)
    return fail('ENCLOSURE_REVIEW_RAIL_CONTRADICTION');
   deficits.push({axis:'rails',missingCount:r.requiredRailCount-r.railCapacity});
  }
  if(r.railCheck==='UNKNOWN')requests.push('RAIL_CAPACITY_MISSING');
  if(r.missingApparatusDimensions>0)requests.push('SELECTED_APPARATUS_DIMENSIONS_INCOMPLETE');
  if(!r.manufacturer||!r.article)requests.push('CABINET_MANUFACTURER_ARTICLE_MISSING');
  if(r.status==='PRELIMINARY_MATCH'&&(deficits.length||requests.some(x=>x!=='CABINET_MANUFACTURER_ARTICLE_MISSING'))||
   r.status==='REJECTED'&&!deficits.length||
   r.status==='UNVERIFIED'&&deficits.length)
   return fail('ENCLOSURE_REVIEW_STATUS_CONTRADICTION');
  rows.push({id:r.id,manufacturer:r.manufacturer??null,article:r.article??null,
   status:r.status,deficits,spare,requests:[...new Set(requests)],
   confirmationStillRequired:['MANUFACTURER_USABLE_INTERIOR_EVIDENCE',
    'DIN_MOUNTING_AND_TERMINALS','WIRING_AND_THERMAL_REVIEW'],
   engineeringApproved:false,confirmedFit:false});
 }
 const summary={candidates:rows.length,preliminary:rows.filter(x=>x.status==='PRELIMINARY_MATCH').length,
  unverified:rows.filter(x=>x.status==='UNVERIFIED').length,
  rejected:rows.filter(x=>x.status==='REJECTED').length};
 return {schema:'electropanel.cabinet.enclosure.review.1',status:'REVIEW_REQUIRED',
  code:'ENCLOSURE_SUPPLIER_REVIEW_REQUIRED',summary,rows,
  engineeringApproved:false,confirmedFit:false,ready_for_installation:false};
}
function epCabinetEnclosureReviewCsvV1(report){
 if(report?.schema!=='electropanel.cabinet.enclosure.review.1'||
  report.status!=='REVIEW_REQUIRED'||!Array.isArray(report.rows))
  return {status:'BLOCKED',csv:null,code:'ENCLOSURE_REVIEW_CSV_INVALID'};
 const q=value=>{let s=String(value??'');
  if(/^[\s\u0000-\u001f\uFEFF\u200B]*[=+@-]/.test(s))s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';};
 const header=['cabinet_id','manufacturer','article','status','width_shortage_mm',
  'height_shortage_mm','depth_shortage_mm','rail_shortage_count',
  'width_spare_mm','height_spare_mm','depth_spare_mm',
  'missing_evidence','verification_still_required','confirmed_fit'];
 const rows=report.rows.map(r=>{
  const shortage=key=>r.deficits.find(s=>s.axis===key);
  const spare=key=>r.spare.find(s=>s.axis===key);
  return [r.id,r.manufacturer,r.article,r.status,shortage('width')?.missingMm,
   shortage('height')?.missingMm,shortage('depth')?.missingMm,
   shortage('rails')?.missingCount,spare('width')?.spareMm,spare('height')?.spareMm,
   spare('depth')?.spareMm,r.requests.join('|'),r.confirmationStillRequired.join('|'),'NO'];
 });
 return {status:'REVIEW_REQUIRED',rows:rows.length,confirmedFit:false,
  csv:'\uFEFF'+[header,...rows].map(r=>r.map(q).join(';')).join('\r\n')+'\r\n'};
}
if(typeof module!=='undefined'&&module.exports)module.exports={
 epCabinetEnclosureReviewV1,epCabinetEnclosureReviewCsvV1};

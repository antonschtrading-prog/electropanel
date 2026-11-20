'use strict';
// Read-only manufacturer-front evidence handoff for engineering and procurement.
// No approval is inferred from imagery, nor from user-declared geometry.
function epFrontEvidenceLedgerV1(rows,lookup,resolve){
 const fail=code=>({schema:'electropanel.front.evidence.ledger.1',status:'BLOCKED',code,
  entries:[],totals:{articles:0,quantity:0,reviewed:0,stylized:0,rejected:0,missing:0,unknownWidth:0,widthConflicts:0},
  engineeringApproved:false});
 if(!Array.isArray(rows)||rows.length>5000||typeof lookup!=='function'||typeof resolve!=='function')
  return fail('LEDGER_INPUT_INVALID');
 const map=new Map(),duplicateIds=new Set(),seenIds=new Set();
 for(const row of rows){
  const sku=typeof row?.boardSku==='string'?row.boardSku.trim():'';
  if(!sku||sku.length>200)continue;
  if(!map.has(sku))map.set(sku,{sku,quantity:0,ids:new Set()});
  const entry=map.get(sku);entry.quantity++;
  if(row.deviceId!==null&&row.deviceId!==undefined){
   const id=String(row.deviceId);
   if(seenIds.has(id))duplicateIds.add(id);
   seenIds.add(id);entry.ids.add(id);
  }
 }
 const entries=[...map.values()].map(item=>{
  let device=null,asset=null,lookupFailed=false,resolveFailed=false;
  try{device=lookup(item.sku)||null;}catch(_){lookupFailed=true;}
  if(device)try{asset=resolve(device)||null;}catch(_){resolveFailed=true;}
  const issues=[];
  if(!device)issues.push(lookupFailed?'LEDGER_LOOKUP_FAILED':'LEDGER_ARTICLE_MISSING');
  if(resolveFailed)issues.push('LEDGER_RESOLVE_FAILED');
  if(device&&device.sku!==item.sku)issues.push('LEDGER_ARTICLE_MISMATCH');
  if([...item.ids].some(id=>duplicateIds.has(id)))issues.push('LEDGER_DUPLICATE_DEVICE_ID');
  if(device&&(!device.maker||!device.series||!device.kind))issues.push('LEDGER_IDENTITY_INCOMPLETE');
  const frontStatus=!device?'CATALOGUE_MISSING':resolveFailed?'ASSET_REJECTED':
   asset?.status==='REVIEWED_IMAGE'&&typeof asset.image?.src==='string'&&
   /^assets\/device-fronts\/[a-z0-9][a-z0-9_-]{0,95}\.(png|jpe?g|webp)$/i.test(asset.image.src)?
   'REVIEWED_IMAGE':asset?.status==='REVIEWED_IMAGE'||asset?.status==='ASSET_REJECTED'?
   'ASSET_REJECTED':'STYLIZED_ONLY';
  if(frontStatus==='ASSET_REJECTED')issues.push(...(Array.isArray(asset?.issues)&&asset.issues.length?asset.issues:['LEDGER_ASSET_REJECTED']));
  const modules=Number.isInteger(device?.modules)&&device.modules>0?device.modules:null;
  const widthMm=Number.isFinite(device?.widthMm)&&device.widthMm>0?device.widthMm:null;
  const slotMm=modules===null?null:modules*18;
  const geometryStatus=slotMm===null||widthMm===null?'UNKNOWN':
   widthMm>slotMm+0.05?'EXCEEDS_DIN_SLOT':'DECLARED_WITHIN_SLOT';
  if(geometryStatus==='UNKNOWN')issues.push('LEDGER_WIDTH_UNKNOWN');
  if(geometryStatus==='EXCEEDS_DIN_SLOT')issues.push('LEDGER_WIDTH_CONFLICT');
  return {sku:item.sku,quantity:item.quantity,deviceIds:[...item.ids].sort(),
   maker:typeof device?.maker==='string'?device.maker:'',series:typeof device?.series==='string'?device.series:'',
   kind:typeof device?.kind==='string'?device.kind:'',modules,widthMm,slotMm,geometryStatus,frontStatus,
   imageSrc:frontStatus==='REVIEWED_IMAGE'?asset.image.src:null,
   productEvidenceUrl:frontStatus==='REVIEWED_IMAGE'?asset.image.productEvidenceUrl||null:null,
   imageReviewedAt:frontStatus==='REVIEWED_IMAGE'?asset.image.reviewedAt||null:null,
   issues:[...new Set(issues)],engineeringApproved:false};
 }).sort((a,b)=>a.maker.localeCompare(b.maker,'ru')||a.series.localeCompare(b.series,'ru')||a.sku.localeCompare(b.sku,'ru'));
 const totals={articles:entries.length,quantity:entries.reduce((s,x)=>s+x.quantity,0),
  reviewed:entries.filter(x=>x.frontStatus==='REVIEWED_IMAGE').length,
  stylized:entries.filter(x=>x.frontStatus==='STYLIZED_ONLY').length,
  rejected:entries.filter(x=>x.frontStatus==='ASSET_REJECTED').length,
  missing:entries.filter(x=>x.frontStatus==='CATALOGUE_MISSING').length,
  unknownWidth:entries.filter(x=>x.geometryStatus==='UNKNOWN').length,
  widthConflicts:entries.filter(x=>x.geometryStatus==='EXCEEDS_DIN_SLOT').length};
 return {schema:'electropanel.front.evidence.ledger.1',
  status:totals.rejected||totals.missing||totals.widthConflicts||entries.some(x=>x.issues.includes('LEDGER_ARTICLE_MISMATCH')||x.issues.includes('LEDGER_DUPLICATE_DEVICE_ID')||x.issues.includes('LEDGER_IDENTITY_INCOMPLETE'))?
   'BLOCKED':'REVIEW_REQUIRED',code:'LEDGER_NOT_ENGINEERING_APPROVAL',entries,totals,engineeringApproved:false};
}
function epFrontEvidenceLedgerCsvV1(ledger){
 if(!ledger||!Array.isArray(ledger.entries))return {status:'BLOCKED',csv:null,code:'LEDGER_EXPORT_INVALID'};
 const q=x=>{const s=String(x??'');return '"'+(/^[\s\uFEFF\u200B]*[=+@\-]/.test(s)||/^[\t\r\n]/.test(s)?"'"+s:s).replace(/"/g,'""')+'"';};
 const columns=['article','quantity','manufacturer','series','kind','modules','body_width_mm','slot_width_mm',
  'geometry_status','front_status','image_path','product_evidence','image_review_date','issues','engineering_approved'];
 const data=ledger.entries.map(x=>[x.sku,x.quantity,x.maker,x.series,x.kind,x.modules,x.widthMm,x.slotMm,
  x.geometryStatus,x.frontStatus,x.imageSrc,x.productEvidenceUrl,x.imageReviewedAt,x.issues.join('|'),'NO']);
 return {status:ledger.status,code:'LEDGER_NOT_ENGINEERING_APPROVAL',csv:'\uFEFF'+[columns,...data].map(r=>r.map(q).join(';')).join('\r\n')+'\r\n',
  rows:data.length,engineeringApproved:false};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epFrontEvidenceLedgerV1,epFrontEvidenceLedgerCsvV1};

'use strict';
// A deterministic project-only manufacturer/series visual index. No manufacturer
// image is treated as approved geometry or electrical evidence.
function epCabinetFrontGalleryV1(reconciliation,lookup,resolveImage){
 const empty=(code)=>({schema:'electropanel.cabinet.front.gallery.1',status:'BLOCKED',
  code,rows:[],groups:[],totals:{articles:0,apparatus:0,reviewedImages:0,
   vectorSketches:0,rejectedImages:0,missingArticles:0,unknownGeometry:0,widthConflicts:0},
  engineeringApproved:false,manufacturerCabinetFitVerified:false});
 if(!reconciliation||!Array.isArray(reconciliation.rows)||
  typeof lookup!=='function'||typeof resolveImage!=='function')
  return empty('FRONT_GALLERY_INPUT_INVALID');
 const articles=new Map(),cache=new Map(),seenDevices=new Set();
 const duplicatedDeviceIds=new Set();
 const lookupOnce=sku=>{
  if(cache.has(sku))return cache.get(sku);
  let item=null,failed=false;
  try{item=lookup(sku);}catch(_){failed=true;}
  const value={item,failed};cache.set(sku,value);return value;
 };
 for(const r of reconciliation.rows){
  const sku=typeof r?.boardSku==='string'?r.boardSku.trim():'';
  if(!sku)continue;
  if(!articles.has(sku))articles.set(sku,{sku,deviceIds:[],count:0});
  const entry=articles.get(sku);
  entry.count++;
  if(r.deviceId!==null&&r.deviceId!==undefined){
   const id=String(r.deviceId);
   if(seenDevices.has(id))duplicatedDeviceIds.add(id);
   seenDevices.add(id);entry.deviceIds.push(id);
  }
 }
 const rows=[...articles.values()].map(a=>{
  const {item,failed}=lookupOnce(a.sku);
  let asset=null;
  try{asset=item?resolveImage(item):null;}catch(_){asset={status:'ASSET_REJECTED',issues:['FRONT_RESOLVER_FAILED']};}
  const reviewedImage=asset?.status==='REVIEWED_IMAGE'&&
   typeof asset.image?.src==='string'&&
   /^assets\/device-fronts\/[a-z0-9][a-z0-9_-]{0,95}\.(png|jpe?g|webp)$/i.test(asset.image.src);
  const status=failed||!item?'MISSING_ARTICLE':
   reviewedImage?'REVIEWED_IMAGE':
   asset?.status==='REVIEWED_IMAGE'?'ASSET_REJECTED':
   asset?.status==='ASSET_REJECTED'?'ASSET_REJECTED':'STYLIZED_ONLY';
  const modules=Number.isInteger(item?.modules)&&item.modules>0?item.modules:null;
  const widthMm=Number.isFinite(item?.widthMm)&&item.widthMm>0?item.widthMm:null;
  const nominalSlotWidthMm=modules===null?null:modules*18;
  const geometryStatus=widthMm===null||nominalSlotWidthMm===null?'UNKNOWN':
   widthMm>nominalSlotWidthMm+0.05?'EXCEEDS_DIN_SLOT':'DECLARED_WITHIN_SLOT';
  const issues=status==='MISSING_ARTICLE'?['FRONT_GALLERY_CATALOGUE_MISSING']:
   Array.isArray(asset?.issues)?[...asset.issues]:[];
  if(asset?.status==='REVIEWED_IMAGE'&&!reviewedImage)
   issues.push('FRONT_GALLERY_REVIEWED_IMAGE_PATH_INVALID');
  if(item&&(!item.maker||!item.series))issues.push('FRONT_GALLERY_IDENTITY_INCOMPLETE');
  if(a.deviceIds.some(id=>duplicatedDeviceIds.has(id)))
   issues.push('FRONT_GALLERY_DUPLICATE_DEVICE_ID');
  if(geometryStatus==='UNKNOWN')issues.push('FRONT_GALLERY_GEOMETRY_UNKNOWN');
  if(geometryStatus==='EXCEEDS_DIN_SLOT')issues.push('FRONT_GALLERY_BODY_EXCEEDS_DIN_SLOT');
  return {sku:a.sku,count:a.count,deviceIds:a.deviceIds.sort(),status,
   maker:typeof item?.maker==='string'?item.maker:'',
   series:typeof item?.series==='string'?item.series:'',
   kind:typeof item?.kind==='string'?item.kind:'',
   modules,widthMm,nominalSlotWidthMm,geometryStatus,
   imageSrc:status==='REVIEWED_IMAGE'?asset.image?.src||null:null,
   imageSourceUrl:status==='REVIEWED_IMAGE'?asset.image?.productEvidenceUrl||null:null,
   imageReviewedAt:status==='REVIEWED_IMAGE'?asset.image?.reviewedAt||null:null,
   issues,engineeringApproved:false};
 }).sort((a,b)=>a.maker.localeCompare(b.maker)||a.series.localeCompare(b.series)||
  a.sku.localeCompare(b.sku));
 const groups=[];
 for(const row of rows){
  const key=[row.maker||'Неизвестный производитель',row.series||'Серия не указана'].join(' / ');
  let group=groups.find(x=>x.key===key);
  if(!group){group={key,maker:row.maker,series:row.series,articles:0,apparatus:0,
   reviewedImages:0,unknownGeometry:0,widthConflicts:0};groups.push(group);}
  group.articles++;group.apparatus+=row.count;
  if(row.status==='REVIEWED_IMAGE')group.reviewedImages++;
  if(row.geometryStatus==='UNKNOWN')group.unknownGeometry++;
  if(row.geometryStatus==='EXCEEDS_DIN_SLOT')group.widthConflicts++;
 }
 const totals={articles:rows.length,apparatus:rows.reduce((n,r)=>n+r.count,0),
  reviewedImages:rows.filter(r=>r.status==='REVIEWED_IMAGE').length,
  vectorSketches:rows.filter(r=>r.status==='STYLIZED_ONLY').length,
  rejectedImages:rows.filter(r=>r.status==='ASSET_REJECTED').length,
  missingArticles:rows.filter(r=>r.status==='MISSING_ARTICLE').length,
  unknownGeometry:rows.filter(r=>r.geometryStatus==='UNKNOWN').length,
  widthConflicts:rows.filter(r=>r.geometryStatus==='EXCEEDS_DIN_SLOT').length};
 return {schema:'electropanel.cabinet.front.gallery.1',
  status:rows.length===0?'UNKNOWN':rows.some(r=>r.status==='MISSING_ARTICLE'||r.status==='ASSET_REJECTED'||
   r.geometryStatus==='EXCEEDS_DIN_SLOT'||r.issues.includes('FRONT_GALLERY_IDENTITY_INCOMPLETE')||
   r.issues.includes('FRONT_GALLERY_DUPLICATE_DEVICE_ID'))?'BLOCKED':'REVIEW_REQUIRED',
  code:rows.length===0?'FRONT_GALLERY_NO_ARTICLES':'FRONT_GALLERY_PRELIMINARY',
  rows,groups,totals,
  engineeringApproved:false,manufacturerCabinetFitVerified:false};
}
if(typeof module!=='undefined'&&module.exports)
 module.exports={epCabinetFrontGalleryV1};

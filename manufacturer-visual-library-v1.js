'use strict';
// Rights-cleared, exact article images; empty until real images are licensed.
const EP_MANUFACTURER_FRONT_ASSETS_V1=Object.freeze({});
function epManufacturerFrontKeyV1(d){
 const norm=x=>typeof x==='string'?x.trim().toLowerCase():'';
 return norm(d?.maker)+'|'+norm(d?.sku);
}
function epManufacturerFrontHttpsV1(s){
 if(typeof s!=='string'||s.length>2048||/[\u0000-\u001f\u007f]/.test(s))return false;
 try{const u=new URL(s);return u.protocol==='https:'&&!!u.hostname&&!u.username&&!u.password;}
 catch(_){return false;}
}
function epManufacturerFrontResolveV1(device,library=EP_MANUFACTURER_FRONT_ASSETS_V1){
 const base={status:'STYLIZED_ONLY',image:null,issues:[],geometryVerified:false,
  manufacturerFaceVerified:false,engineeringApproved:false};
 const key=epManufacturerFrontKeyV1(device);
 if(!device||[device.maker,device.series,device.sku,device.kind].some(x=>typeof x!=='string'||!x.trim()))
  return {...base,issues:['FRONT_ARTICLE_UNSPECIFIED']};
 if(!library||typeof library!=='object'||Array.isArray(library))
  return {...base,status:'ASSET_REJECTED',issues:['FRONT_LIBRARY_INVALID']};
 if(!Object.prototype.hasOwnProperty.call(library,key))
  return {...base,issues:['FRONT_IMAGE_NOT_REGISTERED']};
 const a=library[key],issues=[];
 if(key==='|'||key.startsWith('|')||key.endsWith('|'))issues.push('FRONT_ARTICLE_KEY_INVALID');
 if(!a||typeof a!=='object'||Array.isArray(a))issues.push('FRONT_ASSET_INVALID');
 else{
  const norm=x=>typeof x==='string'?x.trim().toLowerCase():'';
  if(epManufacturerFrontKeyV1(a)!==key||norm(a.maker)!==norm(device.maker)||norm(a.sku)!==norm(device.sku)||
     norm(a.series)!==norm(device.series)||norm(a.kind)!==norm(device.kind))
   issues.push('FRONT_ARTICLE_IDENTITY_MISMATCH');
  if(!Number.isInteger(device.poles)||a.poles!==device.poles||
     !Number.isInteger(device.modules)||a.modules!==device.modules)
   issues.push('FRONT_POLES_MODULES_MISMATCH');
  if(!Number.isFinite(device.widthMm)||device.widthMm<=0||
     !Number.isFinite(a.widthMm)||Math.abs(a.widthMm-device.widthMm)>0.05)
   issues.push('FRONT_BODY_WIDTH_MISMATCH');
  if(typeof a.src!=='string'||!/^assets\/device-fronts\/[a-z0-9][a-z0-9_-]{0,95}\.(png|jpe?g|webp)$/i.test(a.src))
   issues.push('FRONT_ASSET_PATH_INVALID');
  if(!['FRONT_PHOTO','FRONT_RENDER'].includes(a.assetType))issues.push('FRONT_ASSET_TYPE_INVALID');
  if(a.rightsStatus!=='PERMISSION_RECORDED'||!epManufacturerFrontHttpsV1(a.rightsEvidenceUrl))
   issues.push('FRONT_RIGHTS_NOT_DOCUMENTED');
  const date=a.reviewedAt;
  const dateValid=typeof date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(date)&&
   Number.isFinite(Date.parse(date+'T00:00:00Z'))&&new Date(date+'T00:00:00Z').toISOString().slice(0,10)===date&&
   Date.parse(date+'T00:00:00Z')<=Date.now();
  if(!epManufacturerFrontHttpsV1(a.productEvidenceUrl)||!dateValid)
   issues.push('FRONT_SOURCE_NOT_REVIEWED');
 }
 if(issues.length)return {...base,status:'ASSET_REJECTED',issues};
 return {...base,status:'REVIEWED_IMAGE',image:{src:a.src,assetType:a.assetType,
  productEvidenceUrl:a.productEvidenceUrl,reviewedAt:a.reviewedAt}};
}
function epManufacturerVisualHtmlV1(device,id='',library=EP_MANUFACTURER_FRONT_ASSETS_V1){
 const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const r=epManufacturerFrontResolveV1(device,library);
 if(r.status==='REVIEWED_IMAGE')
  return '<img class="ep-manufacturer-front-image" src="'+safe(r.image.src)+
   '" alt="'+safe('Фасад '+device.maker+' '+device.series+' '+device.sku+'; изображение сверено по артикулу, монтаж не подтвержден')+
   '" loading="lazy" decoding="async" draggable="false">';
 if(typeof epCatalogFrontSvgV1==='function')return epCatalogFrontSvgV1(device,id);
 return '<span class="ep-manufacturer-front-fallback">Условный фасад</span>';
}
function epManufacturerFrontLibraryAuditV1(devices,library=EP_MANUFACTURER_FRONT_ASSETS_V1){
 const list=Array.isArray(devices)?devices:Object.values(devices&&typeof devices==='object'?devices:{});
 const rows=list.map(d=>({sku:d?.sku||'',maker:d?.maker||'',
  ...epManufacturerFrontResolveV1(d,library)}));
 return {status:rows.some(r=>r.status==='ASSET_REJECTED')?'REVIEW_REQUIRED':'UNKNOWN',
  total:rows.length,reviewedImages:rows.filter(r=>r.status==='REVIEWED_IMAGE').length,
  stylizedOnly:rows.filter(r=>r.status==='STYLIZED_ONLY').length,
  rejected:rows.filter(r=>r.status==='ASSET_REJECTED').length,
  rows,engineeringApproved:false};
}
if(typeof module!=='undefined'&&module.exports)module.exports={
 EP_MANUFACTURER_FRONT_ASSETS_V1,epManufacturerFrontKeyV1,epManufacturerFrontHttpsV1,
 epManufacturerFrontResolveV1,epManufacturerVisualHtmlV1,epManufacturerFrontLibraryAuditV1};

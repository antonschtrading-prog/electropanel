'use strict';
// Catalogue-to-DIN evidence boundary. No inferred passport approval.
function epCatalogSourceSafeV2(source){
 if(typeof source!=='string')return false;
 try{
  const u=new URL(source);
  return u.protocol==='https:'&&!!u.hostname&&!u.username&&!u.password&&
   !/[\u0000-\u001f\u007f]/.test(source);
 }catch(_){return false;}
}
function epCatalogDinBridgeV1(seed){
 const issues=[];
 if(!seed||typeof seed!=='object'||Array.isArray(seed))
  return {status:'BLOCKED',record:null,issues:[{code:'CATALOG_RECORD_INVALID',level:'BLOCKED'}],engineeringApproved:false,ready_for_installation:false};
 const maker=typeof seed.maker==='string'?seed.maker.trim():'';
 const series=typeof seed.series==='string'?seed.series.trim():'';
 const article=typeof seed.sku==='string'?seed.sku.trim():'';
 if(!maker||!series||!article)issues.push({code:'CATALOG_IDENTITY_INCOMPLETE',level:'BLOCKED'});
 const width=seed.widthMm,modules=seed.modules;
 if(!Number.isFinite(width)||width<=0)issues.push({code:'CATALOG_WIDTH_INVALID',level:'BLOCKED'});
 if(!Number.isInteger(modules)||modules<=0)issues.push({code:'CATALOG_MODULES_INVALID',level:'BLOCKED'});
 if(Number.isFinite(width)&&width>0&&Number.isInteger(modules)&&modules>0&&width>modules*18+0.001)
  issues.push({code:'CATALOG_MODULE_ENVELOPE_CONFLICT',level:'BLOCKED'});
 if(!epCatalogSourceSafeV2(seed.source))issues.push({code:'CATALOG_SOURCE_INVALID',level:'BLOCKED'});
 if(!Number.isInteger(seed.poles)||seed.poles<1||seed.poles>8)issues.push({code:'CATALOG_POLES_INVALID',level:'BLOCKED'});
 if(!Number.isFinite(seed.inA)||seed.inA<=0)issues.push({code:'CATALOG_CURRENT_INVALID',level:'BLOCKED'});
 const record={category:seed.kind,manufacturer:maker,series,article,
  verificationStatus:'UNVERIFIED',mounting:'DIN',
  geometry:{widthMm:Number.isFinite(width)&&width>0?width:null,heightMm:null,depthMm:null},
  evidence:epCatalogSourceSafeV2(seed.source)?{url:seed.source}:null,
  visual:{mode:'STYLIZED_PREVIEW',verified:false},
  electrical:{poles:seed.poles,inA:seed.inA,curve:seed.curve,icnKa:seed.icnKa},
  engineeringApproved:false,ready_for_installation:false};
 if(typeof epDinCatalogValidateV1==='function'){
  const audit=epDinCatalogValidateV1(record);
  for(const issue of audit.issues||[])issues.push({code:issue.code,level:issue.level||'REVIEW_REQUIRED'});
 }
 return {status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'REVIEW_REQUIRED',
  record,issues,engineeringApproved:false,ready_for_installation:false};
}
function epCatalogDinBridgeAuditV1(catalog){
 if(!catalog||typeof catalog!=='object'||Array.isArray(catalog))
  return {status:'BLOCKED',records:[],issues:[{code:'CATALOG_INVALID',level:'BLOCKED'}],engineeringApproved:false};
 const records=[],issues=[],identities=new Set();
 for(const [key,seed] of Object.entries(catalog)){
  const result=epCatalogDinBridgeV1(seed);
  if(result.record){
   const identity=result.record.manufacturer.toLocaleLowerCase('en')+'|'+result.record.article.toLocaleLowerCase('en');
   if(identities.has(identity))issues.push({key,code:'DUPLICATE_MANUFACTURER_ARTICLE',level:'BLOCKED'});
   identities.add(identity);
   records.push({key,...result});
  }
  for(const issue of result.issues)issues.push({key,...issue});
 }
 return {status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'REVIEW_REQUIRED',
  records,issues,engineeringApproved:false,ready_for_installation:false};
}
if(typeof module!=='undefined'&&module.exports)
 module.exports={epCatalogSourceSafeV2,epCatalogDinBridgeV1,epCatalogDinBridgeAuditV1};

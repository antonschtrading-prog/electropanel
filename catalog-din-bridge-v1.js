'use strict';
// Bridges curated catalogue records to the strict DIN schema without asserting passport verification.
// Source links and nominal dimensions remain evidence for review, not approval.
function epCatalogDinBridgeV1(seed, opts={}) {
 const issues=[];
 if(!seed||typeof seed!=='object'||Array.isArray(seed))
  return {status:'BLOCKED',record:null,issues:[{code:'CATALOG_RECORD_INVALID'}]};
 const maker=typeof seed.maker==='string'?seed.maker.trim():'';
 const series=typeof seed.series==='string'?seed.series.trim():'';
 const article=typeof seed.sku==='string'?seed.sku.trim():'';
 if(!maker||!series||!article)issues.push({code:'CATALOG_IDENTITY_INCOMPLETE'});
 const width=seed.widthMm;
 if(!Number.isFinite(width)||width<=0)issues.push({code:'CATALOG_WIDTH_INVALID'});
 const modules=seed.modules;
 if(!Number.isInteger(modules)||modules<=0)issues.push({code:'CATALOG_MODULES_INVALID'});
 if(Number.isFinite(width)&&width>0&&Number.isInteger(modules)&&modules>0&&width>modules*18+0.001)
  issues.push({code:'CATALOG_MODULE_ENVELOPE_CONFLICT'});
 const url=typeof seed.source==='string'?seed.source:'';
 if(!/^https:\/\/[^\s/@]+(?:\/|$)/i.test(url))issues.push({code:'CATALOG_SOURCE_INVALID'});
 const record={
  category:seed.kind,manufacturer:maker,series,article,
  verificationStatus:'UNVERIFIED',mounting:'DIN',
  geometry:{widthMm:Number.isFinite(width)&&width>0?width:null,heightMm:null,depthMm:null},
  evidence:url?{url}:null,
  visual:{mode:'STYLIZED_PREVIEW',verified:false},
  electrical:{poles:seed.poles,inA:seed.inA,curve:seed.curve,icnKa:seed.icnKa},
  engineeringApproved:false,ready_for_installation:false
 };
 if(typeof epDinCatalogValidateV1==='function'){
  const audit=epDinCatalogValidateV1(record);
  for(const issue of audit.issues)issues.push({code:issue.code,level:issue.level});
 }
 return {status:issues.some(x=>x.level==='BLOCKED'||!x.level)?'BLOCKED':'REVIEW_REQUIRED',
  record,issues,engineeringApproved:false,ready_for_installation:false};
}
function epCatalogDinBridgeAuditV1(catalog){
 if(!catalog||typeof catalog!=='object'||Array.isArray(catalog))
  return {status:'BLOCKED',records:[],issues:[{code:'CATALOG_INVALID'}]};
 const records=[],issues=[],identities=new Set();
 for(const [key,seed] of Object.entries(catalog)){
  const result=epCatalogDinBridgeV1(seed);
  if(result.record){
   const identity=result.record.manufacturer.toLowerCase()+'|'+result.record.article.toLowerCase();
   if(identities.has(identity))issues.push({key,code:'DUPLICATE_MANUFACTURER_ARTICLE'});
   identities.add(identity);
   records.push({key,...result});
  }
  for(const issue of result.issues)issues.push({key,...issue});
 }
 return {status:issues.some(x=>x.level==='BLOCKED'||!x.level)?'BLOCKED':'REVIEW_REQUIRED',
  records,issues,engineeringApproved:false,ready_for_installation:false};
}
if(typeof module!=='undefined'&&module.exports)
 module.exports={epCatalogDinBridgeV1,epCatalogDinBridgeAuditV1};

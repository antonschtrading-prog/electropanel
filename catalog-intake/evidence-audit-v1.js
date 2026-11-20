'use strict';
// Independent intake ledger for the integration team. This is NOT a replacement
// for catalog.js and makes no new manufacturer verification claims.
const {EP_CATALOG}=require('../catalog.js');
const REQUIRED_KINDS=Object.freeze(['MCB','RCD','RCBO','METER','RELAY','CONTACTOR']);
const NUMERIC_FIELDS=Object.freeze(['poles','modules','widthMm','heightMm','depthMm','inA','icnKa','icuKa','icnVoltageV','icuVoltageV','residualCurrentMa']);
function auditArticle(id,article){
 const issues=[];
 const add=(code,field)=>issues.push({code,field});
 if(!article||typeof article!=='object'||Array.isArray(article))return [{code:'INVALID_ARTICLE',field:null}];
 for(const field of ['maker','series','sku','kind'])
  if(typeof article[field]!=='string'||!article[field].trim())add('REQUIRED_FIELD_MISSING',field);
 for(const field of NUMERIC_FIELDS){
  const value=article[field];
  if(value===undefined||value===null)continue;
  if(typeof value!=='number'||!Number.isFinite(value)||value<=0)add('INVALID_NUMERIC_VALUE',field);
 }
 for(const field of ['poles','modules'])
  if(article[field]!==undefined&&(!Number.isInteger(article[field])||article[field]<=0))add('INVALID_INTEGER',field);
 if(article.modules!=null&&article.widthMm!=null&&article.widthMm>article.modules*18.5)
  add('BODY_WIDER_THAN_NOMINAL_MODULES','widthMm');
 if(article.icuKa!=null&&article.icnKa==null)add('ICU_NOT_SUBSTITUTE_FOR_ICN','icnKa');
 if(article.icnKa!=null&&(!article.icnStandard||!article.icnVoltageV))
  add('ICN_CONTEXT_INCOMPLETE',!article.icnStandard?'icnStandard':'icnVoltageV');
 if(!article.source||!/^https:\/\//.test(article.source))add('PRIMARY_SOURCE_MISSING','source');
 if(!article.sourceReviewedAt)add('REVIEW_DATE_MISSING','sourceReviewedAt');
 if(!article.sourceType)add('SOURCE_TYPE_MISSING','sourceType');
 if(!article.heightMm||!article.depthMm)add('BODY_GEOMETRY_INCOMPLETE','heightMm/depthMm');
 if(!REQUIRED_KINDS.includes(article.kind))add('KIND_OUTSIDE_V1_SCOPE','kind');
 return issues;
}
function auditCatalog(records=EP_CATALOG){
 const entries=Object.entries(records).map(([id,article])=>({
  id,sku:article?.sku??null,maker:article?.maker??null,kind:article?.kind??null,
  source:article?.source??null,productSource:article?.productSource??null,
  reviewDate:article?.sourceReviewedAt??null,
  status:'REQUIRES_INDEPENDENT_SOURCE_REVIEW',
  issues:auditArticle(id,article)
 }));
 const counts=Object.fromEntries(REQUIRED_KINDS.map(kind=>[kind,entries.filter(x=>x.kind===kind).length]));
 return {schemaVersion:1,source:'EXISTING_CATALOG_SNAPSHOT',engineeringApproved:false,
  entries,counts,missingKinds:REQUIRED_KINDS.filter(kind=>counts[kind]===0)};
}
module.exports={REQUIRED_KINDS,NUMERIC_FIELDS,auditArticle,auditCatalog};

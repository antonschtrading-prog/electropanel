'use strict';
// Draft provenance audit. A URL, SKU or manufacturer-looking string is NEVER an approval.
function epCatalogEvidenceAuditV1(project,lookup){
 const issues=[],items=[],seen=new Set();
 const add=(code,level,owner)=>issues.push({
  code,level,...(owner.role==='circuit'?{lineId:owner.id}:{owner:owner.id})});
 const result=()=>({
  schema:'electropanel.catalog.evidence.2',
  status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN',
  issues,items,
  summary:{selected:items.length,unverified:items.filter(x=>x.verificationStatus!=='VERIFIED').length,
   missingSource:items.filter(x=>!x.source).length,
   mirrorSources:items.filter(x=>x.sourceType==='MANUFACTURER_DATASHEET_MIRROR').length,
   blocking:issues.filter(x=>x.level==='BLOCKED').length},
  engineeringApproved:false,ready_for_installation:false
 });
 if(!project||!Array.isArray(project.lines)||project.lines.length>400||
  project.sharedDevices!==undefined&&!Array.isArray(project.sharedDevices)||
  (project.sharedDevices?.length||0)>200){
  issues.push({code:'CATALOG_EVIDENCE_PROJECT_INVALID',level:'BLOCKED'});
  return result();
 }
 const owners=[
  ...project.lines.map(l=>({role:'circuit',id:l?.id,sku:l?.catalogSku,kind:['MCB','RCBO']})),
  ...(project.sharedDevices||[]).map(g=>({role:'sharedRcd',id:g?.id,sku:g?.catalogSku,kind:['RCD']}))
 ];
 const safeUrl=value=>{
  if(typeof value!=='string'||!value.trim()||value.length>2000||
     /[\u0000-\u001f\u007f]/.test(value))return false;
  try{const u=new URL(value);return u.protocol==='https:'&&!!u.hostname&&!u.username&&!u.password;}
  catch(_){return false;}
 };
 const goodDate=value=>{
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
  const date=new Date(value+'T00:00:00.000Z');
  return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
 };
 const get=typeof lookup==='function'?lookup:
   typeof epCatalogSku==='function'?epCatalogSku:null;
 for(const o of owners){
  if(typeof o.id!=='string'||!o.id.trim()){
   add('CATALOG_OWNER_INVALID','BLOCKED',o);continue;
  }
  const key=o.role+':'+o.id;
  if(seen.has(key)){add('CATALOG_OWNER_DUPLICATE','BLOCKED',o);continue;}
  seen.add(key);
  if(!o.sku){
   add('CATALOG_SKU_MISSING','UNKNOWN',o);continue;
  }
  if(typeof o.sku!=='string'){add('CATALOG_SELECTED_SKU_INVALID','BLOCKED',o);continue;}
  if(typeof get!=='function'){add('CATALOG_LOOKUP_UNAVAILABLE','BLOCKED',o);continue;}
  let d=null;
  try{d=get(o.sku)||null;}
  catch(_){add('CATALOG_LOOKUP_FAILED','BLOCKED',o);continue;}
  if(!d||typeof d!=='object'||Array.isArray(d)){
   add('CATALOG_ARTICLE_UNKNOWN','BLOCKED',o);continue;
  }
  if(!d.kind)add('CATALOG_KIND_UNDECLARED','UNKNOWN',o);
  else if(!o.kind.includes(d.kind))add('CATALOG_ROLE_KIND_CONFLICT','BLOCKED',o);
  const item={
   role:o.role,ownerId:o.id,lineId:o.role==='circuit'?o.id:null,
   articleId:o.sku,sku:d.sku??null,manufacturer:d.maker??null,series:d.series??null,
   kind:d.kind??null,widthMm:d.widthMm??null,heightMm:d.heightMm??null,depthMm:d.depthMm??null,
   source:d.source??null,productSource:d.productSource??null,
   sourceType:d.sourceType??'UNCLASSIFIED',sourceReviewedAt:d.sourceReviewedAt??null,
   verificationStatus:d.verificationStatus??'UNVERIFIED',
   icnKa:d.icnKa??null,icnVoltageV:d.icnVoltageV??null,icnStandard:d.icnStandard??null,
   icuKa:d.icuKa??null,icuVoltageV:d.icuVoltageV??null,
   residualCurrentMa:d.residualCurrentMa??null,residualType:d.residualType??null,
   poleConfiguration:d.poleConfiguration??null
  };
  items.push(item);
  // Source URLs are useful catalogue metadata, not a prerequisite for an engineer-entered article.
  if(!d.maker||!d.series||!d.sku)
   add('CATALOG_EVIDENCE_INCOMPLETE','UNKNOWN',o);
  if(d.source&&!safeUrl(d.source))add('CATALOG_SOURCE_URL_INVALID','BLOCKED',o);
  if(d.productSource&&!safeUrl(d.productSource))add('CATALOG_PRODUCT_URL_INVALID','BLOCKED',o);
  if(d.sourceReviewedAt&&!goodDate(d.sourceReviewedAt))
   add('CATALOG_SOURCE_REVIEW_DATE_INVALID','BLOCKED',o);
  if(!d.sourceReviewedAt)add('CATALOG_SOURCE_REVIEW_NOT_RECORDED','UNKNOWN',o);
  if(![d.widthMm,d.heightMm,d.depthMm].every(x=>typeof x==='number'&&Number.isFinite(x)&&x>0))
   add('CATALOG_BODY_DIMENSIONS_UNDECLARED','UNKNOWN',o);
  if(d.sourceType==='MANUFACTURER_DATASHEET_MIRROR')
   add('CATALOG_MIRROR_REQUIRES_MANUFACTURER_CONFIRMATION','UNKNOWN',o);
  if(d.sourceType==='PROJECT_DECLARATION')
   add('CATALOG_USER_DECLARATION_NOT_INDEPENDENTLY_VERIFIED','UNKNOWN',o);
  if(d.verificationStatus!=='VERIFIED')
   add('CATALOG_ARTICLE_UNVERIFIED','UNKNOWN',o);
  // The complete device's terminals and factory body remain unverified by this
  // metadata: it is not an authenticated factory front or certified 3-D model.
  add('MANUFACTURER_TERMINALS_UNVERIFIED','UNKNOWN',o);
  if(['MCB','RCBO'].includes(d.kind)){
   if(typeof d.curve!=='string'||!d.curve.trim())
    add('CATALOG_TRIP_CURVE_UNDECLARED','UNKNOWN',o);
   if(typeof d.icnKa!=='number'||!Number.isFinite(d.icnKa)||d.icnKa<=0){
    add('CATALOG_BREAKING_CAPACITY_UNDECLARED','UNKNOWN',o);
    if(typeof d.icuKa==='number'&&Number.isFinite(d.icuKa)&&d.icuKa>0)
     add('CATALOG_ICU_NOT_ICN','UNKNOWN',o);
   }
   if(typeof d.icnVoltageV!=='number'||!Number.isFinite(d.icnVoltageV)||d.icnVoltageV<=0)
    add('CATALOG_BREAKING_VOLTAGE_UNDECLARED','UNKNOWN',o);
   if(typeof d.icnStandard!=='string'||!d.icnStandard.trim())
    add('CATALOG_BREAKING_STANDARD_UNDECLARED','UNKNOWN',o);
  }
  if(['RCD','RCBO'].includes(d.kind)){
   if(typeof d.residualCurrentMa!=='number'||!Number.isFinite(d.residualCurrentMa)||
      d.residualCurrentMa<=0)
    add('CATALOG_RESIDUAL_CURRENT_UNDECLARED','UNKNOWN',o);
   if(!['AC','A','F','B','B+'].includes(d.residualType))
    add('CATALOG_RESIDUAL_TYPE_UNDECLARED','UNKNOWN',o);
  }
 }
 return result();
}
if(typeof module!=='undefined'&&module.exports)
 module.exports={epCatalogEvidenceAuditV1};

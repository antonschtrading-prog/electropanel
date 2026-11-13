'use strict';
// Catalog evidence gate: article identity is not verified merely by a matching SKU.
function epCatalogEvidenceAuditV1(project,lookup){
 const issues=[],items=[];
 const lines=Array.isArray(project?.lines)?project.lines:[];
 const get=typeof lookup==='function'?lookup:(typeof epCatalogSku==='function'?epCatalogSku:null);
 for(const line of lines){
  const sku=line?.catalogSku;
  if(!sku){issues.push({code:'CATALOG_SKU_MISSING',level:'UNKNOWN',lineId:line?.id??null});continue;}
  let device=null;
  try{device=get?.(sku)??null;}catch(e){issues.push({code:'CATALOG_LOOKUP_FAILED',level:'BLOCKED',lineId:line?.id??null});continue;}
  if(!device){issues.push({code:'CATALOG_ARTICLE_UNKNOWN',level:'BLOCKED',lineId:line?.id??null});continue;}
  items.push({lineId:line?.id??null,sku,manufacturer:device.maker??null,
   series:device.series??null,source:device.source??null});
  if(!device.maker||!device.series||!device.source)
   issues.push({code:'CATALOG_EVIDENCE_INCOMPLETE',level:'UNKNOWN',lineId:line?.id??null});
  // Product front, terminals and rated data require separate authenticated evidence.
  issues.push({code:'MANUFACTURER_TERMINALS_UNVERIFIED',level:'UNKNOWN',lineId:line?.id??null});
 }
 return {status:issues.some(i=>i.level==='BLOCKED')?'BLOCKED':'UNKNOWN',issues,items,
  engineeringApproved:false,ready_for_installation:false};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCatalogEvidenceAuditV1};

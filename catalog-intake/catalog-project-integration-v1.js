'use strict';
// Production seed and user-declared project records are distinct from manufacturer intake.
// This module provides a non-mutating cross-check, never a normative selection decision.
const {EP_CATALOG}=require('../catalog.js');
const {epProjectCatalogV1}=require('../project-catalog-workbench-v1.js');
const {items}=require('./staged-selector-v1.js');
const {reviewCandidate}=require('./field-evidence-v1.js');
function norm(v){return String(v??'').trim().toUpperCase()}
function catalogIntegration(project={},seed=EP_CATALOG,staged=items){
 const projectCatalog=epProjectCatalogV1(project,seed);
 const seedBySku=new Map(),stagedBySku=new Map();
 for(const [id,d] of Object.entries(seed))if(d?.sku)seedBySku.set(norm(d.sku),{id,device:d});
 for(const item of staged){const sku=norm(item.record?.sku);if(!stagedBySku.has(sku))stagedBySku.set(sku,[]);stagedBySku.get(sku).push(item)}
 const records=[],issues=[...projectCatalog.issues.map(i=>({...i,scope:'PROJECT_CATALOG'}))];
 const sourceLines=Array.isArray(project.lines)?project.lines:[];
 for(const [index,line] of sourceLines.entries()){
  const id=String(line?.id??index),requested=String(line?.catalogSku||line?.articleId||'').trim();
  const sku=norm(line?.sku||'');
  const match=requested?projectCatalog.lookup(requested):null;
  const seedMatch=sku?seedBySku.get(sku):null;
  const selected=match||(seedMatch?.device||null);
  const selectedId=match?requested:seedMatch?.id||null;
  const staging=[...(stagedBySku.get(sku)||[]),...(requested&&norm(requested)!==sku?stagedBySku.get(norm(requested))||[]:[])];
  const source=match?(Object.hasOwn(projectCatalog.customArticles,requested)?'USER_DECLARED':'CURATED_SEED'):seedMatch?'CURATED_SEED':staging.length?'STAGING_ONLY':'UNRESOLVED';
  const warnings=[];
  if(requested&&!match)warnings.push('UNKNOWN_CATALOG_ID');
  if(selected&&line?.phase&&['MCB','RCBO'].includes(selected.kind)){
   const single=['L1','L2','L3'].includes(line.phase),three=line.phase==='3Ф';
   const compatible=single?(selected.poles===1||(selected.poles===2&&(selected.kind==='RCBO'||['1P+N','2P'].includes(selected.poleConfiguration)))):(three&&(selected.poles===3||selected.poles===4));
   if(!compatible)warnings.push('PHASE_POLES_CONFLICT');
  }
  if(!selected&&staging.length)warnings.push('STAGED_SKU_NOT_SELECTABLE');
  if(sku&&selected&&norm(selected.sku)!==sku)warnings.push('SKU_CONFLICT');
  if(selected&&Number.isFinite(line.modules)&&line.modules!==selected.modules)warnings.push('MODULE_COUNT_CONFLICT');
  if(selected&&Number.isFinite(line.inA)&&Number.isFinite(selected.inA)&&line.inA!==selected.inA)warnings.push('RATED_CURRENT_CONFLICT');
  if(selected&&typeof line.device==='string'&&line.device&&line.device!==selected.label)warnings.push('DEVICE_LABEL_CONFLICT');
  if(!selected&&requested)warnings.push('ARTICLE_NOT_FOUND');
  if(!selected&&!requested&&!sku)warnings.push('ARTICLE_UNASSIGNED');
  if(match&&Object.hasOwn(projectCatalog.customArticles,requested))warnings.push('USER_DECLARED_ARTICLE_UNVERIFIED');
  const row={lineId:id,lineName:String(line?.name||''),catalogId:selectedId,sku:selected?.sku||sku||null,
   source,kind:selected?.kind||null,manufacturer:selected?.maker||null,series:selected?.series||null,
   modules:selected?.modules??null,widthMm:selected?.widthMm??null,heightMm:selected?.heightMm??null,
   depthMm:selected?.depthMm??null,inA:selected?.inA??null,sourceUrl:selected?.source||null,
   warnings:[...new Set(warnings)],stagedMatches:staging.map(x=>({sku:x.record.sku,batch:x.batch,status:reviewCandidate(x.record,x.evidence).status,selectable:false})),
   manufacturerSuitabilityConfirmed:false,engineeringApproved:false};
  records.push(row);
 }
 const resolved=records.filter(x=>x.catalogId!==null);
 const totals={lines:records.length,resolved:resolved.length,unresolved:records.length-resolved.length,
  stagedOnly:records.filter(x=>x.source==='STAGING_ONLY').length,
  userDeclared:records.filter(x=>x.warnings.includes('USER_DECLARED_ARTICLE_UNVERIFIED')).length,
  withWarnings:records.filter(x=>x.warnings.length).length,
  knownWidth:resolved.filter(x=>Number.isFinite(x.widthMm)).length,
  missingHeight:resolved.filter(x=>!Number.isFinite(x.heightMm)).length,
  missingDepth:resolved.filter(x=>!Number.isFinite(x.depthMm)).length};
 return {mode:'PROJECT_CATALOG_AUDIT_ONLY',engineeringApproved:false,autoSelectionAllowed:false,
  projectMutationAllowed:false,totals,issues,records};
}
function projectMaterialDraft(project={},seed=EP_CATALOG,staged=items){
 const report=catalogIntegration(project,seed,staged),grouped=new Map();
 for(const row of report.records){
  if(!row.catalogId)continue;
  const key=row.catalogId;
  if(!grouped.has(key))grouped.set(key,{catalogId:key,sku:row.sku,manufacturer:row.manufacturer,
   series:row.series,kind:row.kind,quantity:0,modulesPerUnit:row.modules,widthMmPerUnit:row.widthMm,
   sourceUrl:row.sourceUrl,engineeringApproved:false,lines:[],warnings:[]});
  const g=grouped.get(key);g.quantity++;g.lines.push(row.lineId);
  for(const warning of row.warnings)if(!g.warnings.includes(warning))g.warnings.push(warning);
 }
 const articles=[...grouped.values()].sort((a,b)=>a.catalogId.localeCompare(b.catalogId));
 return {mode:'PRELIMINARY_BOM_ONLY',notForProcurement:true,engineeringApproved:false,
  quantity:articles.reduce((n,a)=>n+a.quantity,0),distinctArticles:articles.length,articles,
  articlesNeedingReview:articles.filter(a=>a.warnings.length).length,
  totalKnownWidthMm:articles.reduce((n,a)=>n+(Number.isFinite(a.widthMmPerUnit)?a.widthMmPerUnit*a.quantity:0),0),
  unresolved:report.records.filter(x=>!x.catalogId).map(x=>({lineId:x.lineId,sku:x.sku,reason:x.warnings})),
  issues:report.issues};
}
module.exports={catalogIntegration,projectMaterialDraft};

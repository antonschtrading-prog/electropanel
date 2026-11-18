'use strict';
// Preview export for the existing project-specific catalogue editor.
// No mutation and no automatic acceptance of staged manufacturer records.
const {items}=require('./staged-selector-v1.js');
const {epProjectCatalogV1}=require('../project-catalog-workbench-v1.js');
const {EP_CATALOG}=require('../catalog.js');
const {reviewCandidate}=require('./field-evidence-v1.js');
function previewProjectTransfer(project={lines:[]},source=items,seed=EP_CATALOG){
 const base=epProjectCatalogV1(project,seed),existingSku=new Set(Object.values(base.articles).map(a=>String(a?.sku||'').toUpperCase()));
 const results=source.map(({record,evidence,batch})=>{
  const review=reviewCandidate(record,evidence);
  const fields=['maker','series','sku','kind','modules','widthMm','heightMm','depthMm','poles','inA','source'];
  const missing=fields.filter(k=>record[k]==null||record[k]==='');
  const duplicate=existingSku.has(String(record.sku).toUpperCase());
  const draft=Object.fromEntries(fields.filter(k=>record[k]!=null).map(k=>[k,record[k]]));
  draft.id='INTAKE-'+record.sku;draft.label=record.sku;
  for(const field of ['curve','icnKa','icnVoltageV','icnStandard','poleConfiguration','residualCurrentMa','residualType'])
   if(record[field]!=null)draft[field]=record[field];
  const simulated=epProjectCatalogV1({...project,catalogArticles:[...(project.catalogArticles||[]),draft]},seed);
  const accepted=Object.values(simulated.customArticles).some(a=>a.sku===record.sku);
  const blockers=[
   ...(duplicate?['ALREADY_IN_PROJECT_OR_SEED']:[]),
   ...missing.map(k=>'MISSING_'+k.toUpperCase()),
   ...review.errors.map(e=>'EVIDENCE_'+e.code),
   ...(!accepted?simulated.issues.map(x=>'PROJECT_'+x.code):[])
  ];
  return {sku:record.sku,batch,kind:record.kind,projectSchemaAccepted:accepted,
   duplicate,blockers:[...new Set(blockers)],source:record.source,
   preview:draft,transferAllowed:false,engineeringApproved:false};
 });
 return {mode:'PREVIEW_ONLY',total:results.length,schemaCompatible:results.filter(x=>x.projectSchemaAccepted).length,
  withoutBlockers:results.filter(x=>!x.blockers.length).length,
  transferAllowed:false,results};
}
module.exports={previewProjectTransfer};

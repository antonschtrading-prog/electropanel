'use strict';
const {batches}=require('./portfolio-v1.js');
const {reviewCandidate}=require('./field-evidence-v1.js');
const {EP_CATALOG}=require('../catalog.js');
const {validateCandidate}=require('./candidate-schema-v1.js');
const ids=x=>String(x||'').trim().toUpperCase();
const records=batches.flatMap(([batch,data])=>(data.candidates||[]).map(record=>({batch,record,evidence:data.evidence?.[record.sku]||{}})));
function makeBacklog(items=records,existing=Object.values(EP_CATALOG)){
 const core=new Map(existing.map(x=>[ids(x.sku),x]));
 return items.map(({batch,record,evidence})=>{
  const schema=validateCandidate(record),review=reviewCandidate(record,evidence);
  const missing=[...new Set(schema.filter(x=>x.code==='REQUIRED_SPEC_UNKNOWN').map(x=>x.field))];
  const missingEvidence=review.errors.filter(x=>x.code==='FIELD_EVIDENCE_MISSING').map(x=>x.field);
  const lifecycle=record.lifecycle||record.marketStatus||'UNREVIEWED';
  const coreMatch=core.get(ids(record.sku));
  const tasks=[
   ...missing.map(field=>({type:'VERIFY_SPEC',field})),
   ...missingEvidence.map(field=>({type:'VERIFY_FIELD_SOURCE',field})),
   ...['widthMm','heightMm','depthMm'].filter(field=>record[field]==null).map(field=>({type:'VERIFY_GEOMETRY',field})),
   ...(lifecycle!=='CURRENT_CONFIRMED'?[{type:'CHECK_LIFECYCLE',field:null}]:[]),
   ...(coreMatch?[{type:'RECONCILE_CORE_SKU',field:'sku'}]:[]),
   ...(record.imageUrl&&!record.imageRightsEvidence?[{type:'VERIFY_IMAGE_RIGHTS',field:'imageUrl'}]:[])
  ];
  const unique=[...new Map(tasks.map(t=>[t.type+':'+t.field,t])).values()];
  const priority=coreMatch?'CORE_RECONCILIATION':record.kind==='RCBO'?'PROTECTION_CRITICAL':record.kind==='RCD'?'RCD_COORDINATION':record.kind==='CONTACTOR'?'COIL_AND_UTILIZATION':'SOURCE_COMPLETENESS';
  return {sku:record.sku,kind:record.kind,batch,priority,source:record.source||null,issues:review.errors.map(x=>x.code),tasks:unique,
   readyForLiveSelection:false,sourceReviewComplete:review.status==='READY_FOR_HUMAN_REVIEW'};
 }).sort((a,b)=>a.priority.localeCompare(b.priority)||a.sku.localeCompare(b.sku));
}
function summary(backlog=makeBacklog()){
 const counts={};for(const item of backlog)for(const t of item.tasks)counts[t.type]=(counts[t.type]||0)+1;
 return {articles:backlog.length,taskCount:Object.values(counts).reduce((a,b)=>a+b,0),taskTypes:counts,
  readyForLiveSelection:backlog.filter(x=>x.readyForLiveSelection).length,byPriority:Object.fromEntries([...new Set(backlog.map(x=>x.priority))].map(k=>[k,backlog.filter(x=>x.priority===k).length]))};
}
module.exports={makeBacklog,summary};

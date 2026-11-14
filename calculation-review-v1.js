'use strict';
// Lossless dependency invalidation for design-stage calculations.
// This records review obligations, not recalculation approval or normative compliance.
const EP_REVIEW_FIELDS_V1=Object.freeze(['overloadInput','faultInput','overloadV30','lv43Input','route44Input']);
function epMarkCalculationReviewV1(line,reason,fields,force=false){
 if(!line||typeof line!=='object'||Array.isArray(line))return null;
 const old=line.calculationReview&&typeof line.calculationReview==='object'?line.calculationReview:{};
 const pending=new Set(Array.isArray(old.pending)?old.pending.filter(k=>EP_REVIEW_FIELDS_V1.includes(k)):[]);
 if(old.required&&!Array.isArray(old.pending))
  for(const key of EP_REVIEW_FIELDS_V1)if(line[key])pending.add(key);
 const targets=Array.isArray(fields)?fields:EP_REVIEW_FIELDS_V1;
 for(const key of targets)if(EP_REVIEW_FIELDS_V1.includes(key)&&line[key])pending.add(key);
 if(!force&&!old.required&&!pending.size)return null;
 line.calculationReview={...old,required:true,reason:String(reason||'INPUT_CHANGED'),pending:[...pending]};
 return line.calculationReview;
}
function epAcknowledgeCalculationReviewV1(line,key){
 if(!line?.calculationReview?.required||!EP_REVIEW_FIELDS_V1.includes(key))return false;
 const old=line.calculationReview;
 const pending=Array.isArray(old.pending)?old.pending.filter(k=>EP_REVIEW_FIELDS_V1.includes(k)):
  EP_REVIEW_FIELDS_V1.filter(k=>!!line[k]);
 if(!pending.includes(key))return false;
 const remaining=pending.filter(k=>k!==key);
 if(remaining.length)line.calculationReview={...old,pending:remaining};
 else delete line.calculationReview;
 return true;
}
function epApplyCircuitDependencyReviewV1(before,after){
 const valid=x=>x&&typeof x==='object'&&!Array.isArray(x)&&Array.isArray(x.lines);
 if(!valid(before)||!valid(after))return {status:'BLOCKED',issues:[{code:'CIRCUIT_DEPENDENCY_PROJECT_INVALID',level:'BLOCKED'}],changedCircuits:[],affectedViews:[]};
 const stable=x=>JSON.stringify(x===undefined?null:x);
 const linesBefore=new Map(before.lines.filter(l=>l&&typeof l.id==='string').map(l=>[l.id,l]));
 const prevLoads=Array.isArray(before.loads)?before.loads:[];
 const nextLoads=Array.isArray(after.loads)?after.loads:[];
 const prevGroups=Array.isArray(before.sharedDevices)?before.sharedDevices:[];
 const nextGroups=Array.isArray(after.sharedDevices)?after.sharedDevices:[];
 const beforeArticles=Array.isArray(before.catalogArticles)?before.catalogArticles:[];
 const afterArticles=Array.isArray(after.catalogArticles)?after.catalogArticles:[];
 const refArticles=new Map(beforeArticles.map(a=>[a?.id,a])),curArticles=new Map(afterArticles.map(a=>[a?.id,a]));
 const sourceChanged=['network','earthing','voltage'].some(k=>stable(before[k])!==stable(after[k]));
 const topologyChanged=['wiringModelV18','endpointBindingsV1','terminalLinks','feedLinks','groupInputLinks'].some(k=>stable(before[k])!==stable(after[k]));
 const changed=new Map(),changes=[];
 const record=(line,reason,fields,staleLoad=false,staleFault=false)=>{
  const result=epMarkCalculationReviewV1(line,reason,fields,true);
  if(staleLoad&&line.loadCurrentCalculation)line.loadCurrentCalculation.stale=true;
  if(staleFault&&line.faultRouteInput)line.faultRouteInput.reviewRequired=true;
  if(!changed.has(line.id))changed.set(line.id,new Set());
  changed.get(line.id).add(reason);
  changes.push({lineId:line.id,reason,pending:result?.pending||[]});
 };
 const memberGroups=(groups,id)=>groups.filter(g=>Array.isArray(g?.circuitIds)&&g.circuitIds.includes(id))
  .map(g=>({id:g.id,templateId:g.templateId,catalogSku:g.catalogSku,label:g.label,modules:g.modules,
   circuitIds:[...g.circuitIds].sort()})).sort((a,b)=>String(a.id).localeCompare(String(b.id)));
 const usedArticleChanged=(a,b)=>{
  const oldId=a?.catalogSku||null,newId=b?.catalogSku||null;
  return oldId!==newId||!!newId&&stable(refArticles.get(newId))!==stable(curArticles.get(newId));
 };
 for(const line of after.lines){
  if(!line||typeof line.id!=='string')continue;
  const previous=linesBefore.get(line.id);
  if(!previous)continue; // a newly added line has no previous calculations to stale
  const loadFields=['overloadInput','overloadV30','lv43Input'];
  const networkFields=['faultInput','lv43Input','route44Input'];
  const cableFields=['overloadInput','overloadV30','lv43Input','route44Input','faultInput'];
  const allFields=EP_REVIEW_FIELDS_V1;
  const loadChanged=['power','powerKw','phase','source'].some(k=>stable(previous[k])!==stable(line[k]))||
   stable(prevLoads.filter(l=>l?.circuitId===line.id))!==stable(nextLoads.filter(l=>l?.circuitId===line.id));
  const electricalPhaseChanged=stable(previous.phase)!==stable(line.phase);
  if(loadChanged)record(line,'LOAD_SOURCE_CHANGED',loadFields,true,false);
  if(electricalPhaseChanged)record(line,'CIRCUIT_PHASE_CHANGED',allFields,true,true);
  if(sourceChanged)record(line,'NETWORK_INPUT_CHANGED',networkFields,false,true);
  if(['cableReferenceInput','cableDesignInput','voltageDropDesignInput','faultRouteInput'].some(k=>stable(previous[k])!==stable(line[k]))||
    stable((before.conductorRoutes||[]).filter(x=>x?.circuitId===line.id))!==
    stable((after.conductorRoutes||[]).filter(x=>x?.circuitId===line.id)))
   record(line,'CABLE_OR_ROUTE_CHANGED',cableFields,false,true);
  if(usedArticleChanged(previous,line)||
     ['device','modules','templateId'].some(k=>stable(previous[k])!==stable(line[k]))||
     stable((before.branchDevices||[]).filter(x=>x?.circuitId===line.id))!==
     stable((after.branchDevices||[]).filter(x=>x?.circuitId===line.id)))
   record(line,'PROTECTIVE_APPARATUS_CHANGED',allFields,false,true);
  if(stable(memberGroups(prevGroups,line.id))!==stable(memberGroups(nextGroups,line.id)))
   record(line,'UPSTREAM_DEVICE_CHANGED',networkFields,false,true);
  if(topologyChanged)record(line,'TOPOLOGY_CHANGED',['faultInput','route44Input'],false,true);
 }
 return {status:changed.size?'REVIEW_REQUIRED':'UNCHANGED',
  changedCircuits:[...changed].map(([lineId,reasons])=>({lineId,reasons:[...reasons]})),
  changes,affectedViews:changed.size?['calculations','protection','singleLine','bom','board','engineeringReview']:[],
  engineeringApproved:false};
}
if(typeof module!=='undefined'&&module.exports)
 module.exports={epMarkCalculationReviewV1,epAcknowledgeCalculationReviewV1,epApplyCircuitDependencyReviewV1,EP_REVIEW_FIELDS_V1};

'use strict';
// Five independent, conservative project preflight blocks. Never a normative approval.
function epProjectIntegrityV1(project,lookup){
 const issues=[],blocks={};
 const add=(block,code,level='UNKNOWN',lineId=null)=>issues.push({block,code,level,lineId});
 if(!project||!Array.isArray(project.lines))return {status:'BLOCKED',blocks:{},
 issues:[{block:'structure',code:'PROJECT_INVALID',level:'BLOCKED'}],engineeringApproved:false,ready_for_installation:false};
 const lines=project.lines,ids=new Set();
 for(const l of lines){
  if(!l||typeof l!=='object'||!l.id||ids.has(l.id))add('structure','DUPLICATE_OR_INVALID_LINE','BLOCKED',l?.id??null);
  if(l?.id)ids.add(l.id);
 }
 blocks.structure={lines:lines.length,uniqueIds:ids.size};
 const references=[];
 for(const l of lines){
  if(!l||typeof l!=='object')continue;
  if(!l.catalogSku){add('catalog','ARTICLE_NOT_SELECTED','UNKNOWN',l.id);continue;}
  let article=null;
  try{article=typeof lookup==='function'?lookup(l.catalogSku):null;}
  catch(_){add('catalog','LOOKUP_FAILED','BLOCKED',l.id);continue;}
  if(!article){add('catalog','ARTICLE_UNKNOWN','BLOCKED',l.id);continue;}
  references.push({lineId:l.id,article:l.catalogSku});
  if(!article.source||!/^https:\/\//.test(article.source))add('catalog','ARTICLE_SOURCE_NOT_DECLARED','UNKNOWN',l.id);
  if(article.kind!=='MCB')add('catalog','PROTECTION_TYPE_NOT_ASSESSED','UNKNOWN',l.id);
 }
 blocks.catalog={selected:references.length};
 let declared=0;
 for(const l of lines){
  if(!l||typeof l!=='object')continue;
  if(!l.overloadInput?.ibA||!l.overloadInput?.izA)
   add('calculations','IB_OR_IZ_NOT_DECLARED','UNKNOWN',l.id);
  else declared++;
  if(!l.route44Input)add('calculations','ROUTE_NOT_DECLARED','UNKNOWN',l.id);
  if(!l.ikKa&&!l.breakingCapacityInput?.ikKa)add('calculations','FAULT_CURRENT_NOT_DECLARED','UNKNOWN',l.id);
 }
 blocks.calculations={withCurrentInputs:declared};
 const branch=Array.isArray(project.branchDevices)?project.branchDevices:[];
 const byCircuit=new Map();
 for(const d of branch){
  if(!d||!d.circuitId||!ids.has(d.circuitId))add('binding','ORPHAN_BRANCH_DEVICE','BLOCKED',d?.circuitId??null);
  else byCircuit.set(d.circuitId,(byCircuit.get(d.circuitId)||0)+1);
 }
 for(const [id,n] of byCircuit)if(n>1)add('binding','DUPLICATE_BRANCH_DEVICE','BLOCKED',id);
 blocks.binding={branchDevices:branch.length};
 if(Number.isInteger(project.railCount)&&Number.isInteger(project.railCapacity)){
  const capacity=project.railCount*project.railCapacity;
  const width=branch.reduce((n,d)=>n+(Number.isInteger(d?.modules)&&d.modules>0?d.modules:0),0)+
   (Array.isArray(project.sharedDevices)?project.sharedDevices.reduce((n,d)=>n+(Number.isInteger(d?.modules)&&d.modules>0?d.modules:0),0):0);
  if(width>capacity)add('placement','TOTAL_MODULES_EXCEED_RAIL_CAPACITY','BLOCKED');
  blocks.placement={capacity,declaredModules:width};
 }else{add('placement','RAIL_DIMENSIONS_UNKNOWN');blocks.placement={capacity:null};}
 add('calculations','NORMATIVE_METHOD_AND_INPUT_EVIDENCE_NOT_VERIFIED');
 add('placement','THERMAL_AND_CLEARANCE_NOT_VERIFIED');
 return {status:issues.some(i=>i.level==='BLOCKED')?'BLOCKED':'UNKNOWN',blocks,issues,
  engineeringApproved:false,ready_for_installation:false};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epProjectIntegrityV1};

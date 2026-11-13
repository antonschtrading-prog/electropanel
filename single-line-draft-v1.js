'use strict';
// Project-structure one-line overview. Dashed associations are NOT physical wires.
function epSingleLineDraftV1(project,lookupSku){
 const result=(status,nodes,edges,issues)=>({schema:'electropanel.single.line.draft.1',
  status,nodes,edges,issues,engineeringApproved:false,ready_for_installation:false});
 if(!project||!Array.isArray(project.lines)||!Array.isArray(project.sharedDevices)||
 project.lines.length>200||project.sharedDevices.length>100)
  return result('BLOCKED',[],[],[{code:'SINGLE_LINE_PROJECT_INVALID',level:'BLOCKED'}]);
 const nodes=[{id:'SOURCE:MAIN',type:'source',name:'Ввод · источник не подтверждён',
  phase:null,sku:null,article:null}],edges=[],issues=[],seen=new Set(['SOURCE:MAIN']);
 const add=(code,level,lineId=null)=>issues.push({code,level,lineId});
 const groupFor=new Map();
 for(const group of project.sharedDevices){
  if(!group||typeof group.id!=='string'||!group.id||seen.has('RCD:'+group.id)||
   !Array.isArray(group.circuitIds)){add('SINGLE_LINE_RCD_INVALID','BLOCKED');continue;}
  const id='RCD:'+group.id;seen.add(id);
  nodes.push({id,type:'rcd',name:group.label||group.id,phase:null,sku:group.catalogSku||null,
   article:null,templateId:group.templateId||null});
  edges.push({from:'SOURCE:MAIN',to:id,kind:'declared_group_association'});
  for(const lineId of group.circuitIds){
   if(groupFor.has(lineId))add('SINGLE_LINE_MULTIPLE_RCD','BLOCKED',lineId);
   groupFor.set(lineId,id);
  }
 }
 const branchByCircuit=new Map();
 for(const b of Array.isArray(project.branchDevices)?project.branchDevices:[]){
  if(!b||typeof b.circuitId!=='string')continue;
  if(branchByCircuit.has(b.circuitId))add('SINGLE_LINE_DUPLICATE_BRANCH','BLOCKED',b.circuitId);
  branchByCircuit.set(b.circuitId,b);
 }
 for(const line of project.lines){
  if(!line||typeof line.id!=='string'||!line.id||seen.has('CIRCUIT:'+line.id)){
   add('SINGLE_LINE_CIRCUIT_INVALID','BLOCKED');continue;
  }
  const id='CIRCUIT:'+line.id;seen.add(id);
  const groupId=groupFor.get(line.id)||null;
  const branch=branchByCircuit.get(line.id);
  let article=null;
  if(line.catalogSku&&typeof lookupSku==='function')
   try{article=lookupSku(line.catalogSku);}catch(_){add('SINGLE_LINE_CATALOG_LOOKUP_FAILED','BLOCKED',line.id);}
  if(line.catalogSku&&!article)add('SINGLE_LINE_ARTICLE_UNKNOWN','BLOCKED',line.id);
  if(!line.catalogSku)add('SINGLE_LINE_ARTICLE_MISSING','UNKNOWN',line.id);
  if(!branch)add('SINGLE_LINE_BRANCH_UNBOUND','UNKNOWN',line.id);
  if(!['L1','L2','L3','3Ф'].includes(line.phase))add('SINGLE_LINE_PHASE_UNKNOWN','UNKNOWN',line.id);
  nodes.push({id,type:'circuit',lineId:line.id,name:line.name||line.id,phase:line.phase||null,
   sku:line.catalogSku||null,article:article?{maker:article.maker||null,series:article.series||null,
    label:article.label||null,inA:article.inA??null,icnKa:article.icnKa??null,
    poles:article.poles??null}:null,branchId:branch?.id||null});
  edges.push({from:groupId||'SOURCE:MAIN',to:id,kind:'declared_group_association'});
 }
 for(const [lineId] of groupFor)if(!project.lines.some(x=>x?.id===lineId))
  add('SINGLE_LINE_GROUP_ORPHAN','BLOCKED',lineId);
 for(const [lineId] of branchByCircuit)if(!project.lines.some(x=>x?.id===lineId))
  add('SINGLE_LINE_BRANCH_ORPHAN','BLOCKED',lineId);
 if(!project.lines.length)add('SINGLE_LINE_EMPTY','UNKNOWN');
 add('SINGLE_LINE_WIRING_AND_SELECTIVITY_UNVERIFIED','UNKNOWN');
 return result(issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN',nodes,edges,issues);
}
if(typeof module!=='undefined'&&module.exports)module.exports={epSingleLineDraftV1};

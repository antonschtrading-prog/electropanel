'use strict';
// Explicit topology audit for protection-device chains.
// No inferred upstream links and no selectivity verdict from nominal ratings.
function epProtectionTopologyV1(project, links) {
 const issues=[], edges=[], add=(code,level,detail={})=>issues.push({code,level,...detail});
 const finish=()=>({schema:'electropanel.protection.topology.1',
  status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN',
  edges,issues,selectivityStatus:'NOT_ASSESSED',
  engineeringApproved:false,ready_for_installation:false});
 if(!project||!Array.isArray(project.lines)||project.lines.length>1000) {
  add('TOPOLOGY_PROJECT_INVALID','BLOCKED');return finish();
 }
 const ids=new Set();
 for(const line of project.lines) {
  if(!line||typeof line.id!=='string'||!line.id.trim()||ids.has(line.id))
   add('TOPOLOGY_LINE_ID_INVALID_OR_DUPLICATE','BLOCKED');
  else ids.add(line.id);
 }
 if(!Array.isArray(links)||links.length>1000) {
  add('TOPOLOGY_LINKS_MISSING_OR_INVALID','UNKNOWN');return finish();
 }
 const parent=new Map();
 for(const link of links) {
  const child=link?.downstreamLineId,up=link?.upstreamLineId;
  if(typeof child!=='string'||typeof up!=='string'||!child.trim()||!up.trim()){
   add('TOPOLOGY_LINK_INVALID','BLOCKED');continue;
  }
  if(!ids.has(child)||!ids.has(up)){
   add('TOPOLOGY_ENDPOINT_UNKNOWN','BLOCKED',{downstreamLineId:child,upstreamLineId:up});continue;
  }
  if(child===up){add('TOPOLOGY_SELF_LINK','BLOCKED',{lineId:child});continue;}
  if(parent.has(child)){
   add('TOPOLOGY_MULTIPLE_UPSTREAM_LINKS','BLOCKED',{lineId:child});continue;
  }
  parent.set(child,up);edges.push({downstreamLineId:child,upstreamLineId:up});
 }
 const color=new Map();
 const visit=(node)=>{
  const state=color.get(node)||0;
  if(state===1){add('TOPOLOGY_CYCLE','BLOCKED',{lineId:node});return;}
  if(state===2)return;
  color.set(node,1);
  if(parent.has(node))visit(parent.get(node));
  color.set(node,2);
 };
 for(const node of ids)visit(node);
 if(links.length===0||edges.length===0)add('TOPOLOGY_NO_PROTECTION_PAIRS','UNKNOWN');
 if(edges.length)add('TOPOLOGY_SELECTIVITY_EVIDENCE_REQUIRED','UNKNOWN');
 return finish();
}
if(typeof module!=='undefined'&&module.exports)module.exports={epProtectionTopologyV1};

'use strict';
// Read-only symbolic-to-terminal trace. A declared wire path is NOT verified current flow.
function epCircuitWiringTraceV1(project){
 const result=(status,rows,issues,summary)=>({schema:'electropanel.circuit.wiring.trace.draft.1',
  status,rows,issues,summary,engineeringApproved:false,ready_for_installation:false});
 const lines=project?.lines;
 if(!Array.isArray(lines)||lines.length>1000)return result('BLOCKED',[],
  [{code:'CIRCUITS_INVALID',level:'BLOCKED',lineId:null}],{circuits:0,connections:0,declaredPaths:0,blocked:1,unknown:0});
 const issues=[],rows=[],summary={circuits:lines.length,connections:0,declaredPaths:0,blocked:0,unknown:0};
 const add=(code,level,lineId,linkId=null)=>{issues.push({code,level,lineId,linkId});
  summary[level==='BLOCKED'?'blocked':'unknown']++;};
 const wiring=project.wiringModelV18;
 if(!wiring||!Array.isArray(wiring.terminals)||!Array.isArray(wiring.wires)){
  for(const l of lines){
   const id=typeof l?.id==='string'?l.id:null;
   rows.push({lineId:id,status:'UNKNOWN',connections:[],declaredPaths:0,blocked:0,unknown:1});
   add('WIRING_MODEL_REQUIRED','UNKNOWN',id);
  }
  return result('UNKNOWN',rows,issues,summary);
 }
 if(typeof epSymbolicConnectionsV1!=='function'||typeof epNormalizeEndpointBindingsV1!=='function'||
  typeof epSymbolicEndpointRoleV1!=='function'||typeof epDeclaredWirePathV2!=='function')
  return result('BLOCKED',[],[{code:'WIRING_DEPENDENCIES_UNAVAILABLE',level:'BLOCKED',lineId:null}],summary);
 let links,bindings;
 try{links=epSymbolicConnectionsV1(project);
  bindings=epNormalizeEndpointBindingsV1(project.endpointBindingsV1||[]);
 }catch(_){return result('BLOCKED',[],[{code:'WIRING_SCHEMA_INVALID',level:'BLOCKED',lineId:null}],summary);}
 const bindingMap=new Map(bindings.map(x=>[x.symbolicRef,x.terminalId]));
 const branchMap=new Map((Array.isArray(project.branchDevices)?project.branchDevices:[])
  .filter(x=>x&&typeof x.id==='string').map(x=>[x.id,x.circuitId]));
 const loadMap=new Map((Array.isArray(project.loads)?project.loads:[])
  .filter(x=>x&&typeof x.id==='string').map(x=>[x.id,x.circuitId]));
 const lineIds=new Set(lines.map(x=>x?.id));
 const owners=ref=>{
  const m=String(ref).match(/^(BRANCH|LOAD):([^/]+)\//);
  if(!m)return null;
  return m[1]==='BRANCH'?(branchMap.get(m[2])??(lineIds.has(m[2])?m[2]:null)):(loadMap.get(m[2])??null);
 };
 const byLine=new Map();
 for(const link of links){
  const a=owners(link.from),c=owners(link.to);
  const explicit=typeof link.circuitId==='string'?link.circuitId:null;
  const ids=[...new Set([a,c,explicit].filter(x=>x!==null&&x!==undefined))];
  if(ids.length>1){add('CROSS_CIRCUIT_SYMBOLIC_LINK','BLOCKED',ids[0],link.id);continue;}
  const group=typeof link.groupId==='string'?
   (Array.isArray(project.sharedDevices)?project.sharedDevices:[]).find(g=>g?.id===link.groupId):null;
  const targets=ids.length?ids:(group&&Array.isArray(group.circuitIds)?group.circuitIds:[]);
  for(const id of new Set(targets)){
   if(!lineIds.has(id)){add('SYMBOLIC_LINK_ORPHAN_CIRCUIT','BLOCKED',id,link.id);continue;}
   if(!byLine.has(id))byLine.set(id,[]);
   byLine.get(id).push(link);
  }
 }
 for(const line of lines){
  const id=typeof line?.id==='string'?line.id:null;
  if(!id){add('LINE_ID_INVALID','BLOCKED',null);continue;}
  const connections=[],related=byLine.get(id)||[];
  let declaredPaths=0,blocked=0,unknown=0;
  if(!related.length){add('CIRCUIT_WIRING_LINKS_UNDECLARED','UNKNOWN',id);unknown++;}
  for(const link of related){
   summary.connections++;
   const roleA=epSymbolicEndpointRoleV1(link.from),roleB=epSymbolicEndpointRoleV1(link.to);
   const from=bindingMap.get(link.from),to=bindingMap.get(link.to);
   let code,status,path=[];
   if(!roleA||roleA!==roleB){code='SYMBOLIC_ROLE_MISMATCH';status='BLOCKED';}
   else if(!from||!to){code='SYMBOLIC_ENDPOINT_UNBOUND';status='UNKNOWN';}
   else{
    const trace=epDeclaredWirePathV2(wiring,from,to,roleA);
    code=trace.code;status=trace.status==='DECLARED_PATH'?'DECLARED_PATH':trace.status;
    path=Array.isArray(trace.path)?trace.path:[];
   }
   if(status==='DECLARED_PATH'){declaredPaths++;summary.declaredPaths++;
    add('DECLARED_WIRE_PATH_NOT_PHYSICALLY_VERIFIED','UNKNOWN',id,link.id);unknown++;
   }else{add(code,status==='BLOCKED'?'BLOCKED':'UNKNOWN',id,link.id);
    if(status==='BLOCKED')blocked++;else unknown++;}
   connections.push({id:link.id,group:link.group,from:link.from,to:link.to,
    role:roleA===roleB?roleA:null,status,code,path});
  }
  rows.push({lineId:id,status:blocked?'BLOCKED':'UNKNOWN',connections,declaredPaths,blocked,unknown});
 }
 return result(summary.blocked?'BLOCKED':'UNKNOWN',rows,issues,summary);
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCircuitWiringTraceV1};

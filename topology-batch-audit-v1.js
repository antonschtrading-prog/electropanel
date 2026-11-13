'use strict';
// Independent project-wide diagnostic; never an electrical installation approval.
function epTopologyBatchAuditV1(project){
 const report=(status,issues,summary)=>({schema_version:'1.0',status,issues,summary,
  engineeringApproved:false,ready_for_installation:false});
 const wiring=project?.wiringModelV18;
 if(!wiring||!Array.isArray(wiring.terminals)||!Array.isArray(wiring.wires))
  return report('UNKNOWN',[{code:'WIRING_MODEL_REQUIRED',level:'UNKNOWN'}],
   {connections:0,declaredPaths:0,blocked:0,unknown:0});
 if(typeof epSymbolicConnectionsV1!=='function'||
    typeof epDeclaredWirePathV2!=='function'||
    typeof epNormalizeEndpointBindingsV1!=='function')
  return report('UNKNOWN',[{code:'DEPENDENCIES_MISSING',level:'UNKNOWN'}],
   {connections:0,declaredPaths:0,blocked:0,unknown:0});
 let connections,bindings;
 try{
  connections=epSymbolicConnectionsV1(project);
  bindings=epNormalizeEndpointBindingsV1(project?.endpointBindingsV1||[]);
 }catch(e){
  return report('BLOCKED',[{code:'PROJECT_SCHEMA_INVALID',level:'BLOCKED'}],
   {connections:0,declaredPaths:0,blocked:1,unknown:0});
 }
 const byRef=new Map(bindings.map(x=>[x.symbolicRef,x.terminalId]));
 const issues=[],summary={connections:connections.length,declaredPaths:0,blocked:0,unknown:0};
 for(const link of connections){
  const from=byRef.get(link.from),to=byRef.get(link.to);
  const roleFrom=epSymbolicEndpointRoleV1(link.from);
  const roleTo=epSymbolicEndpointRoleV1(link.to);
  if(!from||!to||!roleFrom||roleFrom!==roleTo){
   summary.unknown++;
   issues.push({code:'LINK_ENDPOINT_UNVERIFIED',level:'UNKNOWN',link:link.id});
   continue;
  }
  const path=epDeclaredWirePathV2(wiring,from,to,roleFrom);
  if(path.status==='DECLARED_PATH'){
   summary.declaredPaths++;
   issues.push({code:'DECLARED_PATH_NOT_PHYSICALLY_VERIFIED',level:'UNKNOWN',
    link:link.id,path:path.path});
  }else{
   const level=path.status==='BLOCKED'?'BLOCKED':'UNKNOWN';
   summary[level==='BLOCKED'?'blocked':'unknown']++;
   issues.push({code:path.code,level,link:link.id});
  }
 }
 return report(summary.blocked?'BLOCKED':'UNKNOWN',issues,summary);
}
if(typeof module!=='undefined'&&module.exports)module.exports={epTopologyBatchAuditV1};

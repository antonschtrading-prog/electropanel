'use strict';
// Declared downstream neutral bus isolation; only explicit N wires, never device contact conduction.
function epNeutralWireIsolationV1(project){
 const result=(status,issues,pairs)=>({schema:'electropanel.neutral.wire.isolation.draft.1',
  status,issues,pairs,engineeringApproved:false,ready_for_installation:false});
 if(!project||!Array.isArray(project.sharedDevices)||!Array.isArray(project.endpointBindingsV1||[])||
  project.sharedDevices.length>100)
  return result('BLOCKED',[{code:'N_ISOLATION_PROJECT_INVALID',level:'BLOCKED'}],[]);
 const issues=[],pairs=[],bindings=project.endpointBindingsV1||[],wiring=project.wiringModelV18;
 const busNames=['N_MAIN',...project.sharedDevices.filter(x=>x&&typeof x.id==='string').map(x=>'N_'+x.id)];
 const busEntries=busNames.map(name=>({name,ref:'BUS:'+name+'/N'}));
 const byRef=new Map(),seen=new Set();
 for(const entry of bindings){
  if(!entry||typeof entry.symbolicRef!=='string'||typeof entry.terminalId!=='string'||
   !entry.terminalId||seen.has(entry.symbolicRef))
   return result('BLOCKED',[{code:'N_ISOLATION_BINDINGS_INVALID',level:'BLOCKED'}],[]);
  seen.add(entry.symbolicRef);byRef.set(entry.symbolicRef,entry.terminalId);
 }
 if(!wiring||!Array.isArray(wiring.terminals)||!Array.isArray(wiring.wires))
  return result('UNKNOWN',[{code:'N_ISOLATION_WIRING_REQUIRED',level:'UNKNOWN'}],[]);
 if(typeof epDeclaredWirePathV2!=='function')
  return result('BLOCKED',[{code:'N_ISOLATION_TRACER_UNAVAILABLE',level:'BLOCKED'}],[]);
 const terminalMap=new Map(wiring.terminals.map(x=>[x?.id,x]));
 // Build a conservative union-find of explicitly closed N wires once, rather than
 // rebuilding the entire graph for every pair of downstream N buses.
 const parents=new Map();
 for(const t of wiring.terminals)if(t?.conductor==='N'&&typeof t.id==='string')parents.set(t.id,t.id);
 const root=id=>{let p=id;while(parents.get(p)!==p)p=parents.get(p);
  while(id!==p){const next=parents.get(id);parents.set(id,p);id=next;}return p;};
 for(const wire of wiring.wires){
  if(!wire||(wire.state!==undefined&&wire.state!=='closed')||
   !parents.has(wire.from)||!parents.has(wire.to)||wire.from===wire.to)continue;
  const a=root(wire.from),b=root(wire.to);if(a!==b)parents.set(a,b);
 }

 for(let i=0;i<busEntries.length;i++)for(let j=i+1;j<busEntries.length;j++){
  const a=busEntries[i],b=busEntries[j],from=byRef.get(a.ref),to=byRef.get(b.ref);
  if(!from||!to){pairs.push({fromBus:a.name,toBus:b.name,status:'UNKNOWN',path:[]});
   issues.push({code:'N_ISOLATION_ENDPOINT_UNBOUND',level:'UNKNOWN',fromBus:a.name,toBus:b.name});continue;}
  if(!terminalMap.has(from)||!terminalMap.has(to)){
   pairs.push({fromBus:a.name,toBus:b.name,status:'BLOCKED',path:[]});
   issues.push({code:'N_ISOLATION_TERMINAL_MISSING',level:'BLOCKED',fromBus:a.name,toBus:b.name});continue;
  }
  // Missing paths stay UNKNOWN, never a claim of proven isolation.
  // Validate wrong-role terminals through the existing strict tracer.
  if(from!==to&&parents.has(from)&&parents.has(to)&&root(from)!==root(to)){
   pairs.push({fromBus:a.name,toBus:b.name,status:'UNKNOWN',path:[]});
   issues.push({code:'N_ISOLATION_NO_DECLARED_CROSS_BUS_PATH',level:'UNKNOWN',
    fromBus:a.name,toBus:b.name});continue;
  }
  const path=epDeclaredWirePathV2(wiring,from,to,'N');
  if(path.status==='DECLARED_PATH'||from===to||
   (parents.has(from)&&parents.has(to)&&root(from)===root(to))){
   pairs.push({fromBus:a.name,toBus:b.name,status:'BLOCKED',path:path.path||[]});
   issues.push({code:'N_ISOLATION_CROSS_BUS_DECLARED_PATH',level:'BLOCKED',
    fromBus:a.name,toBus:b.name,path:path.path||[]});
  }else if(path.status==='BLOCKED'&&path.code==='DECLARED_WIRE_PATH_MISSING'){
   pairs.push({fromBus:a.name,toBus:b.name,status:'UNKNOWN',path:[]});
   issues.push({code:'N_ISOLATION_NO_DECLARED_CROSS_BUS_PATH',level:'UNKNOWN',
    fromBus:a.name,toBus:b.name});
  }else{
   const level=path.status==='BLOCKED'?'BLOCKED':'UNKNOWN';
   pairs.push({fromBus:a.name,toBus:b.name,status:level,path:[]});
   issues.push({code:path.code,level,fromBus:a.name,toBus:b.name});
  }
 }
 issues.push({code:'N_ISOLATION_PHYSICAL_VERIFICATION_REQUIRED',level:'UNKNOWN'});
 return result(issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN',issues,pairs);
}
if(typeof module!=='undefined'&&module.exports)module.exports={epNeutralWireIsolationV1};

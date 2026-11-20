'use strict';
// Explicit symbolic Web connection -> terminal/wire v4.14 reconciliation.
// Does NOT manufacture a wire or infer continuity through a device contact.
const EP_ENDPOINT_ROLES=new Set(['L1','L2','L3','N','PE']);
function epSymbolicConnectionsV1(project){
 const groups=['terminalLinks','feedLinks','groupInputLinks'];
 const records=[];
 for(const group of groups){
  const entries=project?.[group]||[];
  if(!Array.isArray(entries)||entries.length>5000)throw Error('Invalid '+group);
  for(const link of entries){
   if(!link||typeof link.from!=='string'||typeof link.to!=='string'||
      link.from.length>150||link.to.length>150)
    throw Error('Invalid symbolic link');
   records.push({id:link.id??null,group,from:link.from,to:link.to,
    circuitId:typeof link.circuitId==='string'?link.circuitId:null,
    groupId:typeof link.groupId==='string'?link.groupId:null});
  }
 }
 return records;
}
function epSymbolicEndpointRoleV1(ref){
 if(typeof ref!=='string'||!ref.includes('/'))return null;
 const suffix=ref.slice(ref.lastIndexOf('/')+1);
 const normalized=suffix.replace(/^(?:IN-|OUT-)/,'');
 return EP_ENDPOINT_ROLES.has(normalized)?normalized:null;
}
function epNormalizeEndpointBindingsV1(input){
 if(!Array.isArray(input)||input.length>5000)throw Error('Invalid endpoint binding list');
 const seen=new Set();
 return input.map(entry=>{
  if(!entry||typeof entry!=='object'||Array.isArray(entry)||
     Object.keys(entry).some(k=>!['symbolicRef','terminalId'].includes(k))||
     typeof entry.symbolicRef!=='string'||entry.symbolicRef.length>150||
     !/^(SOURCE:|GROUP:|BRANCH:|BUS:|LOAD:)/.test(entry.symbolicRef)||
     typeof entry.terminalId!=='string'||entry.terminalId.length>128||
     !entry.terminalId.trim())
   throw Error('Invalid endpoint binding');
  if(seen.has(entry.symbolicRef))throw Error('Repeated symbolic endpoint');
  seen.add(entry.symbolicRef);
  return {symbolicRef:entry.symbolicRef,terminalId:entry.terminalId};
 });
}
function epEndpointBridgeAuditV1(project, options={}){
 const wiring=project?.wiringModelV18;
 const entries=project?.endpointBindingsV1||[];
 const report=(status,issues,expected,matched)=>({schema_version:'1.0',
  status,issues,expectedEndpoints:expected,matchedEndpoints:matched,
  engineeringApproved:false,ready_for_installation:false,
  explanation:'Matching symbolic references and explicitly drawn wires is not physical terminal or cable verification.'});
 if(!wiring||!Array.isArray(wiring.terminals)||!Array.isArray(wiring.wires))
  return report('UNKNOWN',[{code:'EXPLICIT_WIRING_MODEL_REQUIRED',level:'UNKNOWN'}],0,0);
 const connections=epSymbolicConnectionsV1(project);
 const refs=new Set(connections.flatMap(x=>[x.from,x.to]));
 const terminalMap=new Map(wiring.terminals.map(x=>[x.id,x]));
 const issues=[],add=(code,level,details={})=>issues.push({code,level,...details});
 let bindings;
 try{bindings=epNormalizeEndpointBindingsV1(entries);}
 catch(e){return report('BLOCKED',[{code:'BINDING_SCHEMA_INVALID',level:'BLOCKED'}],refs.size,0);}
 const byRef=new Map(bindings.map(x=>[x.symbolicRef,x.terminalId]));
 const boardMap=new Map((project?.boardBindingsV1||[]).map(b=>[b.boardDeviceId,b.modelDeviceId]));
 const branches=new Set((project?.branchDevices||[]).map(x=>x.id));
 const shared=new Set((project?.sharedDevices||[]).map(x=>x.id));
 for(const b of bindings){
  if(!refs.has(b.symbolicRef)){
   add('STALE_SYMBOLIC_ENDPOINT','BLOCKED',{symbolicRef:b.symbolicRef});continue;
  }
  const terminal=terminalMap.get(b.terminalId);
  if(!terminal){add('TERMINAL_NOT_FOUND','BLOCKED',{symbolicRef:b.symbolicRef});continue;}
  const expectedRole=epSymbolicEndpointRoleV1(b.symbolicRef);
  if(!expectedRole||terminal.conductor!==expectedRole)
   add('ROLE_MISMATCH','BLOCKED',{symbolicRef:b.symbolicRef,actual:terminal.conductor,expected:expectedRole});
  const match=b.symbolicRef.match(/^(BRANCH|GROUP):([^/]+)\//);
  if(match){
   const type=match[1],id=match[2];
   if(!(type==='BRANCH'?branches:shared).has(id))
    add('BOARD_ENTITY_MISSING','BLOCKED',{symbolicRef:b.symbolicRef});
   const modelId=boardMap.get(id);
   if(!modelId)add('BOARD_MODEL_BINDING_REQUIRED','UNKNOWN',{symbolicRef:b.symbolicRef});
   else if(terminal.device_id!==modelId)
    add('WRONG_DEVICE_TERMINAL','BLOCKED',
     {symbolicRef:b.symbolicRef,expectedDevice:modelId,actualDevice:terminal.device_id});
  }
  const load=b.symbolicRef.match(/^LOAD:([^/]+)\//);
  if(load&&!project?.loads?.some(x=>x.id===load[1]))
   add('LOAD_ENTITY_MISSING','BLOCKED',{symbolicRef:b.symbolicRef});
 }
 for(const ref of refs)if(!byRef.has(ref))
  add('ENDPOINT_UNBOUND','UNKNOWN',{symbolicRef:ref});
 const wires=new Set((wiring.wires||[]).map(w=>{
  const a=w.from||'',b=w.to||'';
  return JSON.stringify([a,b].sort());
 }));
 for(const connection of connections){
  const a=byRef.get(connection.from),b=byRef.get(connection.to);
  if(!a||!b)continue;
  if(a===b){add('WIRE_SELF_ENDPOINT','BLOCKED',{link:connection.id});continue;}
  if(!terminalMap.has(a)||!terminalMap.has(b))continue;
  if(!wires.has(JSON.stringify([a,b].sort()))){
   const roleA=epSymbolicEndpointRoleV1(connection.from);
   const roleB=epSymbolicEndpointRoleV1(connection.to);
   if(options?.allowDeclaredMultiSegment===true&&
      typeof epDeclaredWirePathV2==='function'&&roleA&&roleA===roleB){
    const pathReport=epDeclaredWirePathV2(wiring,a,b,roleA);
    if(pathReport.status==='DECLARED_PATH'){
     add('MULTI_SEGMENT_DECLARED_ONLY','UNKNOWN',
      {link:connection.id,from:a,to:b,path:pathReport.path});
    }else if(pathReport.status==='UNKNOWN'){
     add('WIRE_PATH_UNVERIFIED','UNKNOWN',
      {link:connection.id,from:a,to:b,reason:pathReport.code});
    }else add('DIRECT_WIRE_UNDECLARED','BLOCKED',{link:connection.id,from:a,to:b});
   }else add('DIRECT_WIRE_UNDECLARED','BLOCKED',{link:connection.id,from:a,to:b});
  }
 }
 const byTerminal=new Map();
 for(const b of bindings){
  if(!byTerminal.has(b.terminalId))byTerminal.set(b.terminalId,[]);
  byTerminal.get(b.terminalId).push(b.symbolicRef);
 }
 for(const [terminal,endpointNames] of byTerminal){
  if(endpointNames.length>1)add('TERMINAL_REUSE_NEEDS_CLAMP_REVIEW','UNKNOWN',
   {terminal,refs:endpointNames.slice().sort()});
 }
 add('PHYSICAL_TERMINALS_UNVERIFIED','UNKNOWN');
 return report(issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN',issues,
  refs.size,[...refs].filter(x=>byRef.has(x)).length);
}

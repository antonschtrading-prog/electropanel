'use strict';
// Port of electropanel/wiring_audit.py v1.8 from Electropanel v4.14.
// Explicit conductor-level terminal topology; no inferred apparatus continuity.
const EP_WIRING_KINDS=new Set(['L1','L2','L3','N','PE','CONTROL']);
const EP_WIRING_STATES=new Set(['closed','open','unknown']);
function epWiringAuditCoreV18(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Expected wiring object');
 const names=['terminals','wires','internal_links','sources','loads'],arrays={};
 for(const key of names){
  const arr=input[key]===undefined?[]:input[key];
  if(!Array.isArray(arr)||arr.length>10000||arr.some(x=>!x||typeof x!=='object'||Array.isArray(x)))
   throw Error(key+' must be an array of at most 10000 objects');
  arrays[key]=arr;
 }
 const validId=x=>typeof x==='string'&&!!x.trim()&&x.length<=128;
 const diagnostics=[],add=(code,status,message,details={})=>diagnostics.push({code,status,message,details});
 const terminals=new Map(),graph=new Map(),unknown=[];
 for(const t of arrays.terminals){
  const id=t.id,kind=t.conductor;
  if(!validId(id)){add('TERMINAL_ID_INVALID','FAIL','Invalid terminal ID');continue;}
  if(terminals.has(id)){add('TERMINAL_DUPLICATE','FAIL','Duplicate terminal ID',{terminal:id});continue;}
  if(!EP_WIRING_KINDS.has(kind)){add('TERMINAL_KIND_INVALID','FAIL','Unrecognized conductor kind',{terminal:id});continue;}
  terminals.set(id,{kind,device_id:t.device_id});
  if(!validId(t.device_id))add('TERMINAL_DEVICE_UNKNOWN','UNKNOWN','Terminal device identity missing',{terminal:id});
 }
 const edge=(a,b,identifier,origin,state='closed')=>{
  if(!validId(a)||!validId(b)||!terminals.has(a)||!terminals.has(b)){
   add('LINK_ENDPOINT_UNKNOWN','FAIL','Link references absent terminal',{link:identifier,kind:origin});return;
  }
  if(a===b){add('LINK_SELF','FAIL','Self link is invalid',{link:identifier});return;}
  const ka=terminals.get(a).kind,kb=terminals.get(b).kind;
  if(ka!==kb){add('CONDUCTOR_CROSS_CONNECTION','FAIL','Explicit link joins distinct conductor roles',
   {link:identifier,from_kind:ka,to_kind:kb});return;}
  if(state==='closed'){
   if(!graph.has(a))graph.set(a,new Set());if(!graph.has(b))graph.set(b,new Set());
   graph.get(a).add(b);graph.get(b).add(a);
  }else if(state==='unknown')unknown.push([a,b,identifier]);
 };
 const wireCount=new Map();
 for(const w of arrays.wires){
  if(!validId(w.id)){add('WIRE_ID_INVALID','FAIL','Wire ID missing');continue;}
  wireCount.set(w.id,(wireCount.get(w.id)||0)+1);
  edge(w.from,w.to,w.id,'wire');
 }
 for(const id of [...wireCount.keys()].sort())if(wireCount.get(id)>1)
  add('WIRE_ID_DUPLICATE','FAIL','Repeated wire ID',{wire:id});
 for(let i=0;i<arrays.internal_links.length;i++){
  const l=arrays.internal_links[i],state=l.state===undefined?'unknown':l.state;
  if(!EP_WIRING_STATES.has(state)){add('CONTACT_STATE_INVALID','FAIL','Invalid internal contact state',{index:i});continue;}
  if(!validId(l.device_id))add('CONTACT_DEVICE_UNKNOWN','UNKNOWN','Internal link lacks device identity',{index:i});
  if(terminals.has(l.from)&&terminals.has(l.to)&&
    (terminals.get(l.from).device_id!==l.device_id||terminals.get(l.to).device_id!==l.device_id)){
   add('CONTACT_DEVICE_MISMATCH','FAIL','Internal link crosses declared devices',{index:i});continue;
  }
  edge(l.from,l.to,l.id===undefined?'internal:'+i:l.id,'internal',state);
  if(state==='unknown')add('CONTACT_STATE_UNKNOWN','UNKNOWN',
   'No assumed continuity through unspecified device contact',{index:i});
 }
 function reachable(start,allowUnknown){
  const seen=new Set([start]),queue=[start],adj=new Map();
  if(allowUnknown){
   for(const [k,v] of graph)adj.set(k,new Set(v));
   for(const [a,b] of unknown){
    if(!adj.has(a))adj.set(a,new Set());if(!adj.has(b))adj.set(b,new Set());
    adj.get(a).add(b);adj.get(b).add(a);
   }
  }
  const edges=allowUnknown?adj:graph;
  for(let i=0;i<queue.length;i++)for(const n of edges.get(queue[i])||[])
   if(!seen.has(n)){seen.add(n);queue.push(n);}
  return seen;
 }
 const sources=new Map();
 for(let i=0;i<arrays.sources.length;i++){
  const source=arrays.sources[i],p=source.terminal,kind=source.conductor;
  if(!terminals.has(p)||!EP_WIRING_KINDS.has(kind)){
   add('SOURCE_INVALID','FAIL','Invalid supply endpoint',{index:i});continue;
  }
  if(terminals.get(p).kind!==kind){
   add('SOURCE_KIND_MISMATCH','FAIL','Supply type disagrees with terminal',{terminal:p});continue;
  }
  if(!sources.has(kind))sources.set(kind,[]);
  sources.get(kind).push(p);
 }
 for(let i=0;i<arrays.loads.length;i++){
  const load=arrays.loads[i],p=load.terminal,kind=load.conductor;
  const name=load.id===undefined?'index:'+i:load.id;
  if(!terminals.has(p)||!EP_WIRING_KINDS.has(kind)){
   add('LOAD_INVALID','FAIL','Invalid load endpoint',{load:name});continue;
  }
  if(terminals.get(p).kind!==kind){
   add('LOAD_KIND_MISMATCH','FAIL','Load type disagrees with terminal',{load:name});continue;
  }
  if(!sources.get(kind)?.length){
   add('LOAD_SOURCE_UNDEFINED','UNKNOWN','No source declared for conductor',{load:name});continue;
  }
  if(sources.get(kind).some(s=>reachable(p,false).has(s)))
   add('DECLARED_PATH_PRESENT','PASS',
    'Continuous path in explicitly closed schematic links only',{load:name});
  else if(sources.get(kind).some(s=>reachable(p,true).has(s)))
   add('PATH_CONTACT_STATE_UNRESOLVED','UNKNOWN',
    'Path depends on internal contact of unknown state',{load:name});
  else add('LOAD_PATH_DISCONNECTED','FAIL','No path in declared wiring model',{load:name});
 }
 if(!arrays.loads.length||!arrays.sources.length)
  add('ENDPOINT_COVERAGE_MISSING','UNKNOWN',
   'Cannot assess completeness without sources and loads');
 add('PHYSICAL_VERIFICATION_REQUIRED','UNKNOWN',
  'Drawn wires and asserted contact states do not prove electrical safety, real continuity or manufacturer compliance');
 const counts={PASS:0,FAIL:0,UNKNOWN:0};
 for(const d of diagnostics)counts[d.status]++;
 return {schema_version:'1.8',input_sha256:null,hash_status:'NOT_COMPUTED',
  diagnostics,counts,overall:'REQUIRES_ENGINEERING_REVIEW',ready_for_installation:false};
}
function epWiringCanonicalJSONV18(value){
 if(value===null||typeof value!=='object'){
  if(typeof value==='number'&&!Number.isFinite(value))throw Error('Invalid nonfinite JSON number');
  return JSON.stringify(value);
 }
 if(Array.isArray(value))return '['+value.map(epWiringCanonicalJSONV18).join(',')+']';
 const pairs=[];
 for(const key of Object.keys(value).sort()){
  if(value[key]===undefined||typeof value[key]==='function')
   throw Error('Unsupported JSON property');
  pairs.push(JSON.stringify(key)+':'+epWiringCanonicalJSONV18(value[key]));
 }
 return '{'+pairs.join(',')+'}';
}
async function epWiringAuditV18(input){
 const report=epWiringAuditCoreV18(input),subtle=globalThis.crypto?.subtle;
 if(!subtle)return report;
 const encoded=new TextEncoder().encode(epWiringCanonicalJSONV18(input));
 const hash=new Uint8Array(await subtle.digest('SHA-256',encoded));
 report.input_sha256=[...hash].map(x=>x.toString(16).padStart(2,'0')).join('');
 report.hash_status='CALCULATED_LOCAL_SHA256';
 return report;
}

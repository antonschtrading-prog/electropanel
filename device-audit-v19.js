'use strict';
// Exact structural screening port of electropanel/device_audit.py v1.9
// from the recovered Electropanel v4.14 Python archive.
// This is a *declared* model: not a guarantee that actual devices or N/PE
// connections correspond to their names, manufacturer data or drawings.
const EP_DEVICE19_ROLES=new Set(['L1','L2','L3','N','PE','CONTROL']);
const EP_DEVICE19_STATES=new Set(['open','closed','unknown']);
function epDeviceAuditCoreV19(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Expected object');
 const groups=['devices','terminals','internal_links','wires','neutral_zones'],data={};
 for(const name of groups){
  const arr=input[name]===undefined?[]:input[name];
  if(!Array.isArray(arr)||arr.length>10000||arr.some(x=>!x||typeof x!=='object'||Array.isArray(x)))
   throw Error(name+' must be an array of at most 10000 objects');
  data[name]=arr;
 }
 const diag=[],push=(code,status,message,details={})=>diag.push({code,status,message,details});
 const ident=v=>typeof v==='string'&&!!v.trim()&&v.length<=128;
 const devices=new Map(),terms=new Map(),gangs=new Map();
 for(const d of data.devices){
  const id=d.id;
  if(!ident(id)){push('DEVICE_ID_INVALID','FAIL','Invalid device ID');continue;}
  if(devices.has(id)){push('DEVICE_DUPLICATE','FAIL','Duplicate device identifier',{device:id});continue;}
  devices.set(id,d);
  if(!Number.isInteger(d.poles)||d.poles<1||d.poles>4)
   push('POLE_COUNT_INVALID','FAIL','Declared pole count must be integer 1..4',{device:id});
  if(typeof d.kind!=='string'||!d.kind.trim())
   push('DEVICE_KIND_UNKNOWN','UNKNOWN','Device functional type missing',{device:id});
  const ev=d.evidence;
  if(!ev||typeof ev!=='object'||Array.isArray(ev))
   push('DEVICE_SOURCE_MISSING','UNKNOWN','No manufacturer evidence supplied',{device:id});
  else {
   const required=['manufacturer','model','document_id','revision','source_url'];
   const missing=required.filter(k=>typeof ev[k]!=='string'||!ev[k].trim());
   if(missing.length)push('DEVICE_SOURCE_INCOMPLETE','UNKNOWN',
    'Manufacturer evidence metadata incomplete',{device:id,missing});
   if(ev.sha256!==undefined&&ev.sha256!==null&&
      (typeof ev.sha256!=='string'||!/^[a-fA-F0-9]{64}$/.test(ev.sha256)))
    push('DEVICE_SOURCE_HASH_INVALID','FAIL','Invalid SHA-256 digest format',{device:id});
   else if(!missing.length)
    push('DEVICE_SOURCE_UNVERIFIED','UNKNOWN',
     'Source metadata exists but authenticity and technical values have not been independently checked',{device:id});
  }
 }
 for(const t of data.terminals){
  const id=t.id,did=t.device_id,role=t.conductor;
  if(!ident(id)){push('TERMINAL_ID_INVALID','FAIL','Invalid terminal identifier');continue;}
  if(terms.has(id)){push('TERMINAL_DUPLICATE','FAIL','Duplicate terminal identifier',{terminal:id});continue;}
  terms.set(id,t);
  if(!EP_DEVICE19_ROLES.has(role))push('TERMINAL_ROLE_INVALID','FAIL','Unknown conductor role',{terminal:id});
  if(!devices.has(did))push('TERMINAL_DEVICE_MISSING','FAIL',
   'Terminal belongs to undeclared device',{terminal:id,device:did});
 }
 for(let i=0;i<data.internal_links.length;i++){
  const l=data.internal_links[i],did=l.device_id,a=l.from,b=l.to;
  const state=l.state===undefined?'unknown':l.state,g=l.gang_id;
  if(!EP_DEVICE19_STATES.has(state)){push('CONTACT_STATE_INVALID','FAIL','Unrecognized contact state',{index:i});continue;}
  if(!devices.has(did)){push('CONTACT_DEVICE_MISSING','FAIL','Contact belongs to undeclared device',{index:i});continue;}
  if(!terms.has(a)||!terms.has(b)){push('CONTACT_TERMINAL_MISSING','FAIL','Contact terminal missing',{index:i});continue;}
  if(terms.get(a).device_id!==did||terms.get(b).device_id!==did){
   push('CONTACT_CROSS_DEVICE','FAIL','Contact connects different device terminals',{index:i});continue;
  }
  const ra=terms.get(a).conductor,rb=terms.get(b).conductor;
  if(ra!==rb)push('CONTACT_ROLE_MISMATCH','FAIL','Contact changes conductor role',{index:i});
  if(ra==='PE'||rb==='PE')push('PE_THROUGH_SWITCH','FAIL',
    'Protective conductor is shown passing through a switchable contact',{device:did,index:i});
  if(g!==undefined&&g!==null){
   if(!ident(g))push('GANG_ID_INVALID','FAIL','Invalid gang identifier',{index:i});
   else {const key=JSON.stringify([did,g]);if(!gangs.has(key))gangs.set(key,[]);
    gangs.get(key).push([a,b,state,i,did,g]);}
  }else if((devices.get(did).poles||0)>1)
   push('MULTIPOLE_GROUP_MISSING','UNKNOWN','Multipole contact not assigned to coupled group',{device:did,index:i});
  if(state==='unknown')push('CONTACT_STATE_UNRESOLVED','UNKNOWN','Contact state is not known',{device:did,index:i});
 }
 for(const key of [...gangs.keys()].sort()){
  const items=gangs.get(key),[a,b,state,index,did,g]=items[0];
  const poles=devices.get(did).poles;
  if(!Number.isInteger(poles)||poles<1)continue;
  if(items.length!==poles)push('GANG_POLE_COUNT_MISMATCH','FAIL',
   'Contact count does not match declared pole count',{device:did,gang:g,expected:poles,observed:items.length});
  const states=[...new Set(items.map(x=>x[2]))].sort();
  if(states.length>1)push('GANG_STATE_CONFLICT','FAIL',
   'Coupled poles have inconsistent declared states',{device:did,gang:g,states});
  const count=new Map();
  for(const item of items)for(const id of [item[0],item[1]])count.set(id,(count.get(id)||0)+1);
  const repeats=[...count.keys()].filter(k=>count.get(k)>1).sort();
  if(repeats.length)push('GANG_TERMINAL_REUSE','FAIL',
   'Pole contacts reuse a terminal',{device:did,gang:g,terminals:repeats});
 }
 const zones=new Map();
 for(const z of data.neutral_zones){
  const zid=z.id,items=z.terminals;
  if(!ident(zid)||!Array.isArray(items)){push('NEUTRAL_ZONE_INVALID','FAIL','Zone ID or list invalid');continue;}
  if(zones.has(zid)){push('NEUTRAL_ZONE_DUPLICATE','FAIL','Neutral zone duplicated',{zone:zid});continue;}
  zones.set(zid,new Set());
  for(const id of items){
   if(!terms.has(id)){push('NEUTRAL_TERMINAL_MISSING','FAIL',
    'Neutral zone references missing terminal',{zone:zid,terminal:id});continue;}
   if(terms.get(id).conductor!=='N'){push('NEUTRAL_ZONE_WRONG_ROLE','FAIL',
    'Non-neutral terminal in neutral zone',{zone:zid,terminal:id});continue;}
   zones.get(zid).add(id);
  }
 }
 const assigned=new Map();
 for(const [zone,items] of zones)for(const id of items){
  if(!assigned.has(id))assigned.set(id,[]);assigned.get(id).push(zone);
 }
 for(const id of [...assigned.keys()].sort()){
  const zz=assigned.get(id);
  if(zz.length>1)push('NEUTRAL_ZONE_OVERLAP','FAIL',
   'Neutral terminal belongs to multiple asserted zones',{terminal:id,zones:zz.slice().sort()});
 }
 for(let i=0;i<data.wires.length;i++){
  const w=data.wires[i],a=w.from,b=w.to;
  if(!terms.has(a)||!terms.has(b))continue;
  if(terms.get(a).conductor!=='N'||terms.get(b).conductor!=='N')continue;
  const za=new Set(assigned.get(a)||[]),zb=new Set(assigned.get(b)||[]);
  if(za.size&&zb.size&&![...za].some(z=>zb.has(z)))
   push('NEUTRAL_ZONE_CROSS_LINK','FAIL',
    'Wire bridges separately declared neutral zones',{index:i,from_zone:[...za].sort(),to_zone:[...zb].sort()});
  else if(!za.size||!zb.size)
   push('NEUTRAL_ZONE_INCOMPLETE','UNKNOWN',
    'Neutral wire endpoint has no assigned neutral zone',{index:i});
 }
 if(!data.neutral_zones.length)push('NEUTRAL_SEPARATION_UNASSESSED','UNKNOWN','No neutral separation zones declared');
 if(!data.devices.length)push('DEVICE_COVERAGE_MISSING','UNKNOWN','No devices declared');
 push('NORMATIVE_AND_PHYSICAL_REVIEW_REQUIRED','UNKNOWN',
  'These are consistency checks, not proof of manufacturer characteristics, coordinated operation or installation compliance');
 const counts={PASS:0,FAIL:0,UNKNOWN:0};
 for(const item of diag)counts[item.status]++;
 return {schema_version:'1.9',input_sha256:null,hash_status:'NOT_COMPUTED',
  diagnostics:diag,counts,overall:'REQUIRES_ENGINEERING_REVIEW',ready_for_installation:false};
}
async function epDeviceAuditV19(input){
 const result=epDeviceAuditCoreV19(input),subtle=globalThis.crypto?.subtle;
 if(!subtle)return result;
 const bytes=new TextEncoder().encode(epWiringCanonicalJSONV18(input));
 const hash=new Uint8Array(await subtle.digest('SHA-256',bytes));
 result.input_sha256=[...hash].map(x=>x.toString(16).padStart(2,'0')).join('');
 result.hash_status='CALCULATED_LOCAL_SHA256';
 return result;
}
function epWiringDeviceModelConsistencyV19(wiring,device){
 if(!wiring||!device)return {status:'UNKNOWN',issues:['MODELS_NOT_BOTH_DECLARED']};
 for(const key of ['terminals','wires','internal_links']){
  const a=wiring[key],b=device[key];
  if(!Array.isArray(a)||!Array.isArray(b))
   return {status:'BLOCKED',issues:['MODEL_GROUP_MISSING_'+key]};
  // Coupled-pole gang_id belongs only to device_audit; the pure wiring
  // model intentionally does not contain manufacturer/pole metadata.
  const normalize=x=>[...x].map(obj=>{
   const copy={...obj};
   if(key==='internal_links')delete copy.gang_id;
   return epWiringCanonicalJSONV18(copy);
  }).sort();
  const aa=normalize(a),bb=normalize(b);
  if(aa.length!==bb.length||aa.some((x,i)=>x!==bb[i]))
   return {status:'BLOCKED',issues:['MODEL_GROUP_MISMATCH_'+key]};
 }
 return {status:'DECLARED_MATCH_ONLY',issues:[],
  engineeringApproved:false,ready_for_installation:false};
}

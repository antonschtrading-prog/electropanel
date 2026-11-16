'use strict';
// Engineer-authored point-to-point control connections, not inferred from logical commands.
function epFireControlWiringV1(project){
 const empty={schema:'electropanel.fire.wiring.1',status:'NOT_CONFIGURED',connections:[],issues:[],engineeringApproved:false,ready_for_installation:false};
 const raw=project?.fireControlV1;
 if(!raw)return empty;
 const wiring=raw.wiring,issues=[],connections=[];
 const issue=(code,level='BLOCKED',objectId=null)=>issues.push({code,level,objectId});
 const id=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(x);
 const validRef=x=>typeof x==='string'&&/^https:\/\/[^\s<>"']{3,500}$/.test(x);
 const signalIds=new Set((Array.isArray(raw.signals)?raw.signals:[]).map(x=>x?.id));
 const assignments=Array.isArray(raw.design?.assignments)?raw.design.assignments:[];
 const actions=Array.isArray(raw.actions)?raw.actions:[];
 const actionIds=new Set(actions.map(x=>x?.id));
 const devices=new Set(assignments.map(x=>x?.deviceId).filter(Boolean));
 const supplies=new Set(assignments.map(x=>x?.controlSupplyId).filter(Boolean));
 const terminalIds=new Set(assignments.flatMap(x=>Array.isArray(x?.terminalIds)?x.terminalIds:[]));
 const pins=new Set(assignments.flatMap(x=>Array.isArray(x?.pins)?x.pins.map(p=>x.deviceId+':'+p.devicePin):[]));
 const allowedTypes=new Set(['SIGNAL_CONTACT','CONTROL_SUPPLY','ACTUATOR_COIL','ACTUATOR_CONTACT','RETURN','PROTECTIVE_DEVICE','INTERLOCK','OTHER']);
 const allowedEndpoints=new Set(['SIGNAL','SUPPLY','TERMINAL','DEVICE_PIN','PROTECTION','JUNCTION']);
 const wires=Array.isArray(wiring?.connections)?wiring.connections:[];
 if(wiring===undefined)issue('FIRE_WIRING_NOT_DECLARED','UNKNOWN');
 else if(!wiring||typeof wiring!=='object'||Array.isArray(wiring)||Object.keys(wiring).some(k=>k!=='connections')||!Array.isArray(wiring.connections))
  issue('FIRE_WIRING_SCHEMA_INVALID');
 if(wires.length>1600)issue('FIRE_WIRING_LIMIT_EXCEEDED');
 const ids=new Set(),wireRefs=new Set(),pairRefs=new Set();
 const validateEndpoint=(endpoint,wireId,side)=>{
  if(!endpoint||typeof endpoint!=='object'||Array.isArray(endpoint)||Object.keys(endpoint).some(k=>!['kind','id','pin'].includes(k))||
   !allowedEndpoints.has(endpoint.kind)||!id(endpoint.id)||endpoint.pin!==undefined&&!id(endpoint.pin)){
   issue('FIRE_WIRING_ENDPOINT_INVALID','BLOCKED',wireId);return null;
  }
  if(endpoint.kind==='SIGNAL'&&!signalIds.has(endpoint.id))issue('FIRE_WIRING_SIGNAL_UNKNOWN','BLOCKED',wireId);
  if(endpoint.kind==='SUPPLY'&&!supplies.has(endpoint.id))issue('FIRE_WIRING_SUPPLY_UNKNOWN','BLOCKED',wireId);
  if(endpoint.kind==='TERMINAL'&&!terminalIds.has(endpoint.id))issue('FIRE_WIRING_TERMINAL_UNKNOWN','BLOCKED',wireId);
  if(endpoint.kind==='DEVICE_PIN'&&(!endpoint.pin||!pins.has(endpoint.id+':'+endpoint.pin)))issue('FIRE_WIRING_DEVICE_PIN_UNKNOWN','BLOCKED',wireId);
  if(endpoint.kind==='PROTECTION'&&!id(endpoint.id))issue('FIRE_WIRING_PROTECTION_UNKNOWN','BLOCKED',wireId);
  if(endpoint.kind==='JUNCTION'&&!id(endpoint.id))issue('FIRE_WIRING_JUNCTION_UNKNOWN','BLOCKED',wireId);
  return endpoint.kind+':'+endpoint.id+(endpoint.pin?':'+endpoint.pin:'');
 };
 for(const wire of wires){
  if(!wire||typeof wire!=='object'||Array.isArray(wire)||Object.keys(wire).some(k=>!['id','wireReference','from','to','purpose','actionId','conductor','verifiedSource','reviewed'].includes(k))||
   !id(wire.id)||!id(wire.wireReference)||!allowedTypes.has(wire.purpose)||!actionIds.has(wire.actionId)||
   typeof wire.reviewed!=='boolean'||!validRef(wire.verifiedSource)){
   issue('FIRE_WIRING_CONNECTION_INVALID','BLOCKED',wire?.id??null);continue;
  }
  if(ids.has(wire.id))issue('FIRE_WIRING_DUPLICATE_ID','BLOCKED',wire.id);
  ids.add(wire.id);
  if(wireRefs.has(wire.wireReference))issue('FIRE_WIRING_DUPLICATE_REFERENCE','BLOCKED',wire.id);
  wireRefs.add(wire.wireReference);
  if(wire.conductor!==undefined&&(!wire.conductor||typeof wire.conductor!=='object'||Array.isArray(wire.conductor)||
   Object.keys(wire.conductor).some(k=>!['sectionMm2','material','color'].includes(k))||
   !Number.isFinite(wire.conductor.sectionMm2)||wire.conductor.sectionMm2<=0||wire.conductor.sectionMm2>240||
   !['COPPER','ALUMINUM'].includes(wire.conductor.material)||
   wire.conductor.color!==undefined&&(!id(wire.conductor.color)||wire.conductor.color.length>32)))
   issue('FIRE_WIRING_CONDUCTOR_INVALID','BLOCKED',wire.id);
  const from=validateEndpoint(wire.from,wire.id,'from'),to=validateEndpoint(wire.to,wire.id,'to');
  if(from&&to){
   if(from===to)issue('FIRE_WIRING_SELF_LOOP','BLOCKED',wire.id);
   const pair=[from,to].sort().join('|');
   if(pairRefs.has(pair))issue('FIRE_WIRING_DUPLICATE_PAIR','UNKNOWN',wire.id);
   pairRefs.add(pair);
  }
  if(wire.reviewed!==true)issue('FIRE_WIRING_ENGINEER_REVIEW_REQUIRED','UNKNOWN',wire.id);
  if(wire.conductor===undefined)issue('FIRE_WIRING_CONDUCTOR_UNDECLARED','UNKNOWN',wire.id);
  connections.push({id:wire.id,wireReference:wire.wireReference,from:from??null,to:to??null,
   purpose:wire.purpose,actionId:wire.actionId,conductor:wire.conductor??null,verifiedSource:wire.verifiedSource,reviewed:wire.reviewed});
 }
 for(const action of actions)if(!connections.some(c=>c.actionId===action.id))
  issue('FIRE_WIRING_ACTION_NOT_CONNECTED','UNKNOWN',action.id);
 if(!connections.some(c=>c.purpose==='RETURN'))issue('FIRE_WIRING_RETURN_NOT_DECLARED','UNKNOWN');
 if(!connections.some(c=>c.purpose==='PROTECTIVE_DEVICE'))issue('FIRE_WIRING_CONTROL_PROTECTION_NOT_DECLARED','UNKNOWN');
 if(!connections.some(c=>c.purpose==='INTERLOCK'))issue('FIRE_WIRING_INTERLOCK_NOT_DECLARED','UNKNOWN');
 issue('FIRE_WIRING_ELECTRICAL_CONTINUITY_UNVERIFIED','UNKNOWN');
 issue('FIRE_WIRING_CONTACT_FUNCTION_UNVERIFIED','UNKNOWN');
 issue('FIRE_WIRING_SUPPLY_CAPACITY_UNVERIFIED','UNKNOWN');
 issue('FIRE_WIRING_CABLE_RATING_UNVERIFIED','UNKNOWN');
 return {schema:'electropanel.fire.wiring.1',status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'REVIEW_REQUIRED',
  connections,issues,engineeringApproved:false,ready_for_installation:false,
  note:'Engineer-declared wire references only. Connection evidence is not an electrical continuity or safety certification.'};
}
if(typeof module!=='undefined')module.exports={epFireControlWiringV1};

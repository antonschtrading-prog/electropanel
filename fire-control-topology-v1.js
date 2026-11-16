'use strict';
// Engineering topology: symbolic links only. Never invent manufacturer terminal pin numbers.
function epFireControlTopologyV1(project){
 const empty={schema:'electropanel.fire.topology.1',status:'NOT_CONFIGURED',nodes:[],edges:[],issues:[],engineeringApproved:false,ready_for_installation:false};
 if(!project?.fireControlV1)return empty;
 const issues=[],nodes=[],edges=[],nodeIds=new Set(),edgeIds=new Set();
 const issue=(code,level='UNKNOWN',id=null)=>issues.push({code,level,objectId:id});
 const addNode=(id,kind,label,meta={})=>{
  if(nodeIds.has(id)){issue('FIRE_TOPOLOGY_DUPLICATE_NODE','BLOCKED',id);return;}
  nodeIds.add(id);nodes.push({id,kind,label,...meta});
 };
 const addEdge=(id,from,to,kind,meta={})=>{
  if(edgeIds.has(id)){issue('FIRE_TOPOLOGY_DUPLICATE_EDGE','BLOCKED',id);return;}
  edgeIds.add(id);
  if(!nodeIds.has(from)||!nodeIds.has(to))issue('FIRE_TOPOLOGY_ORPHAN_EDGE','BLOCKED',id);
  edges.push({id,from,to,kind,...meta});
 };
 const raw=project.fireControlV1,signals=Array.isArray(raw.signals)?raw.signals:[],
  actions=Array.isArray(raw.actions)?raw.actions:[],
  assignments=Array.isArray(raw.design?.assignments)?raw.design.assignments:[];
 if(signals.length>200)issue('FIRE_TOPOLOGY_SIGNAL_LIMIT','BLOCKED');
 if(actions.length>800)issue('FIRE_TOPOLOGY_ACTION_LIMIT','BLOCKED');
 if(assignments.length>800)issue('FIRE_TOPOLOGY_ASSIGNMENT_LIMIT','BLOCKED');
 const signalMap=new Map(),loadMap=new Map(),lineMap=new Map(),assignMap=new Map();
 for(const s of signals)if(s&&typeof s.id==='string'){
  signalMap.set(s.id,s);
  addNode('SIG:'+s.id,'EXTERNAL_SIGNAL',s.id,{signalKind:s.kind,zoneId:s.zoneId,contactType:s.contactType});
 }
 for(const l of Array.isArray(project.lines)?project.lines:[])if(l&&typeof l.id==='string'){
  lineMap.set(l.id,l);addNode('LINE:'+l.id,'CIRCUIT',l.name||l.id);
 }
 for(const l of Array.isArray(project.loads)?project.loads:[])if(l&&typeof l.id==='string'){
  loadMap.set(l.id,l);addNode('LOAD:'+l.id,'CONSUMER',l.name||l.id);
  if(lineMap.has(l.circuitId))addEdge('POWER:'+l.id,'LINE:'+l.circuitId,'LOAD:'+l.id,'POWER_RELATION');
  else issue('FIRE_TOPOLOGY_CONSUMER_CIRCUIT_MISSING','BLOCKED',l.id);
 }
 for(const a of assignments)if(a&&typeof a.actionId==='string')assignMap.set(a.actionId,a);
 const deviceActions=new Map(),terminalOwners=new Map(),wireOwners=new Map(),supplyRefs=new Set();
 for(const a of actions){
  if(!a||typeof a.id!=='string'){issue('FIRE_TOPOLOGY_ACTION_ID_INVALID','BLOCKED');continue;}
  const key='ACT:'+a.id,entry=assignMap.get(a.id)||{};
  addNode(key,'COMMAND',a.id,{action:a.action,actuator:a.actuator,onSignalLoss:a.onSignalLoss});
  if(signalMap.has(a.signalId))addEdge('TRIGGER:'+a.id,'SIG:'+a.signalId,key,'LOGICAL_TRIGGER');
  else issue('FIRE_TOPOLOGY_SIGNAL_ORPHAN','BLOCKED',a.id);
  if(loadMap.has(a.loadId))addEdge('TARGET:'+a.id,key,'LOAD:'+a.loadId,'LOGICAL_COMMAND');
  else issue('FIRE_TOPOLOGY_LOAD_ORPHAN','BLOCKED',a.id);
  if(entry.deviceId){
   const device='DEV:'+entry.deviceId;
   if(!nodeIds.has(device))addNode(device,'ACTUATOR',entry.deviceId,{actuator:a.actuator,articleSku:entry.articleSku||null});
   if(!deviceActions.has(device))deviceActions.set(device,[]);
   deviceActions.get(device).push(a.id);
   addEdge('ACTUATES:'+a.id,key,device,'ACTUATOR_ASSIGNMENT');
   if(entry.controlSupplyId){
    const supply='SUP:'+entry.controlSupplyId;
    if(!supplyRefs.has(supply)){supplyRefs.add(supply);addNode(supply,'CONTROL_SUPPLY',entry.controlSupplyId);}
    addEdge('SUPPLY:'+a.id,supply,device,'CONTROL_SUPPLY_REFERENCE',{controlVoltageV:entry.controlVoltageV??null});
   }else issue('FIRE_TOPOLOGY_SUPPLY_MISSING','UNKNOWN',a.id);
   if(Array.isArray(entry.terminalIds))for(const terminalId of entry.terminalIds){
    const term='TERM:'+terminalId;
    if(terminalOwners.has(term))issue('FIRE_TOPOLOGY_TERMINAL_REUSED','BLOCKED',a.id);
    else{terminalOwners.set(term,a.id);addNode(term,'TERMINAL',terminalId);addEdge('TERMINAL:'+a.id+':'+terminalId,term,device,'TERMINAL_ASSIGNMENT');}
   }
   else issue('FIRE_TOPOLOGY_TERMINALS_MISSING','UNKNOWN',a.id);
   if(entry.wireReference){
    if(wireOwners.has(entry.wireReference))issue('FIRE_TOPOLOGY_WIRE_REFERENCE_REUSED','UNKNOWN',a.id);
    wireOwners.set(entry.wireReference,a.id);
   }else issue('FIRE_TOPOLOGY_WIRE_REFERENCE_MISSING','UNKNOWN',a.id);
  }else issue('FIRE_TOPOLOGY_DEVICE_UNASSIGNED','UNKNOWN',a.id);
  if(!entry.articleSku)issue('FIRE_TOPOLOGY_ARTICLE_UNSELECTED','UNKNOWN',a.id);
  if(!entry.reviewed)issue('FIRE_TOPOLOGY_ASSIGNMENT_UNREVIEWED','UNKNOWN',a.id);
  if(entry.controlVoltageV!==undefined&&(!Number.isFinite(entry.controlVoltageV)||entry.controlVoltageV<=0||entry.controlVoltageV>1000))issue('FIRE_TOPOLOGY_CONTROL_VOLTAGE_INVALID','BLOCKED',a.id);
  if(entry.terminalIds!==undefined&&!Array.isArray(entry.terminalIds))issue('FIRE_TOPOLOGY_TERMINAL_LIST_INVALID','BLOCKED',a.id);
  if(a.actuator==='SHUNT_TRIP')issue('FIRE_TOPOLOGY_SHUNT_PULSE_LOGIC_UNVERIFIED','UNKNOWN',a.id);
  if(a.actuator==='UNDERVOLTAGE_RELEASE')issue('FIRE_TOPOLOGY_UVR_CONTINUITY_UNVERIFIED','UNKNOWN',a.id);
  if(a.action==='ENABLE')issue('FIRE_TOPOLOGY_RESTART_INTERLOCK_UNVERIFIED','UNKNOWN',a.id);
  if(a.action==='MAINTAIN')issue('FIRE_TOPOLOGY_MAINTAIN_PRIORITY_UNVERIFIED','UNKNOWN',a.id);
  if(a.onSignalLoss==='UNSPECIFIED')issue('FIRE_TOPOLOGY_LOSS_STATE_UNVERIFIED','UNKNOWN',a.id);
 }
 for(const [id,ids] of deviceActions)if(ids.length>1)issue('FIRE_TOPOLOGY_SHARED_ACTUATOR_REVIEW','UNKNOWN',id);
 if(!signals.length)issue('FIRE_TOPOLOGY_NO_EXTERNAL_SIGNALS','UNKNOWN');
 if(!actions.length)issue('FIRE_TOPOLOGY_NO_COMMANDS','UNKNOWN');
 issue('FIRE_TOPOLOGY_MANUFACTURER_PIN_MAPPING_NOT_VERIFIED','UNKNOWN');
 issue('FIRE_TOPOLOGY_CONTACT_ELECTRICAL_POLARITY_NOT_VERIFIED','UNKNOWN');
 issue('FIRE_TOPOLOGY_CONTROL_CABLE_SIZING_NOT_VERIFIED','UNKNOWN');
 issue('FIRE_TOPOLOGY_PROTECTION_OF_CONTROL_SUPPLY_NOT_VERIFIED','UNKNOWN');
 return {schema:'electropanel.fire.topology.1',status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'REVIEW_REQUIRED',
  nodes,edges,issues,engineeringApproved:false,ready_for_installation:false,
  note:'Symbolic connectivity only. Not a point-to-point wiring drawing.'};
}
if(typeof module!=='undefined')module.exports={epFireControlTopologyV1};

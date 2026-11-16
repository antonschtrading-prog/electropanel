'use strict';
// Graph review of engineer-declared conductors. Connectivity is not an electrical proof:
// contacts, protective devices and supply polarity are not inferred from endpoints.
const epWiringGraphDependencyV1=typeof module!=='undefined'&&typeof require==='function'?require('./fire-control-wiring-v1'):null;
function epFireControlContinuityV1(project){
 const engine=typeof epFireControlWiringV1==='function'?epFireControlWiringV1:epWiringGraphDependencyV1?.epFireControlWiringV1;
 if(typeof engine!=='function')throw Error('FIRE_CONTINUITY_WIRING_MISSING');
 const report=engine(project);
 const empty={schema:'electropanel.fire.continuity.1',status:'NOT_CONFIGURED',actions:[],components:[],issues:[],engineeringApproved:false,ready_for_installation:false};
 if(report.status==='NOT_CONFIGURED')return empty;
 const issues=[...report.issues],actions=[],components=[];
 const add=(code,level='UNKNOWN',objectId=null)=>issues.push({code,level,objectId});
 const declared=report.connections.filter(w=>w.from&&w.to);
 const raw=project.fireControlV1;
 const actionList=Array.isArray(raw.actions)?raw.actions:[];
 const assignments=Array.isArray(raw.design?.assignments)?raw.design.assignments:[];
 const assignmentsByAction=new Map(assignments.filter(x=>x&&typeof x.actionId==='string').map(x=>[x.actionId,x]));
 const edgesByAction=new Map();
 for(const w of declared){
  if(!edgesByAction.has(w.actionId))edgesByAction.set(w.actionId,[]);
  edgesByAction.get(w.actionId).push(w);
 }
 const reach=(start,adj)=>{
  const seen=new Set([start]),queue=[start];
  for(let i=0;i<queue.length;i++)for(const next of adj.get(queue[i])||[]){
   if(!seen.has(next)){seen.add(next);queue.push(next);}
  }
  return seen;
 };
 for(const action of actionList){
  if(!action||typeof action.id!=='string')continue;
  const wires=edgesByAction.get(action.id)||[];
  const adj=new Map(),nodes=new Set(),purposes=new Set();
  for(const w of wires){
   nodes.add(w.from);nodes.add(w.to);purposes.add(w.purpose);
   if(!adj.has(w.from))adj.set(w.from,new Set());
   if(!adj.has(w.to))adj.set(w.to,new Set());
   adj.get(w.from).add(w.to);adj.get(w.to).add(w.from);
  }
  const supplies=[...nodes].filter(x=>x.startsWith('SUPPLY:'));
  const pins=[...nodes].filter(x=>x.startsWith('DEVICE_PIN:'));
  const signals=[...nodes].filter(x=>x.startsWith('SIGNAL:'));
  const protections=[...nodes].filter(x=>x.startsWith('PROTECTION:'));
  const groups=[],visited=new Set();
  for(const node of nodes){
   if(visited.has(node))continue;
   const group=reach(node,adj);for(const x of group)visited.add(x);
   groups.push([...group].sort());
  }
  const assignment=assignmentsByAction.get(action.id);
  const assignedSupply=assignment?.controlSupplyId?'SUPPLY:'+assignment.controlSupplyId:null;
  const assignedDevice=assignment?.deviceId?'DEVICE_PIN:'+assignment.deviceId+':':null;
  const connectedToSupply=assignedSupply?reach(assignedSupply,adj):new Set();
  const declaredPins=assignedDevice?pins.filter(x=>x.startsWith(assignedDevice)):[];
  const reachablePins=declaredPins.filter(x=>connectedToSupply.has(x));
  const unreachablePins=declaredPins.filter(x=>!connectedToSupply.has(x));
  const isolated=groups.filter(group=>!group.some(x=>x.startsWith('SUPPLY:')));
  const dangling=[...adj].filter(([,links])=>links.size===1).map(([node])=>node);
  if(wires.length===0)add('FIRE_CONTINUITY_ACTION_EMPTY','UNKNOWN',action.id);
  if(!assignedSupply)add('FIRE_CONTINUITY_SUPPLY_UNDECLARED','UNKNOWN',action.id);
  else if(!nodes.has(assignedSupply))add('FIRE_CONTINUITY_ASSIGNED_SUPPLY_DISCONNECTED','UNKNOWN',action.id);
  if(!assignedDevice)add('FIRE_CONTINUITY_DEVICE_UNDECLARED','UNKNOWN',action.id);
  else if(!declaredPins.length)add('FIRE_CONTINUITY_DEVICE_PINS_DISCONNECTED','UNKNOWN',action.id);
  if(unreachablePins.length)add('FIRE_CONTINUITY_DEVICE_PIN_UNREACHABLE','UNKNOWN',action.id);
  if(isolated.length)add('FIRE_CONTINUITY_ISOLATED_COMPONENT','UNKNOWN',action.id);
  if(!purposes.has('RETURN'))add('FIRE_CONTINUITY_RETURN_PATH_NOT_DECLARED','UNKNOWN',action.id);
  if(!purposes.has('PROTECTIVE_DEVICE'))add('FIRE_CONTINUITY_PROTECTION_NOT_DECLARED','UNKNOWN',action.id);
  if(!purposes.has('INTERLOCK'))add('FIRE_CONTINUITY_INTERLOCK_NOT_DECLARED','UNKNOWN',action.id);
  if(!signals.includes('SIGNAL:'+action.signalId))add('FIRE_CONTINUITY_COMMAND_SIGNAL_DISCONNECTED','UNKNOWN',action.id);
  if(!protections.length)add('FIRE_CONTINUITY_PROTECTIVE_ENDPOINT_ABSENT','UNKNOWN',action.id);
  if(dangling.length)add('FIRE_CONTINUITY_DANGLING_ENDPOINTS_REVIEW','UNKNOWN',action.id);
  if(groups.length>1)add('FIRE_CONTINUITY_MULTIPLE_COMPONENTS_REVIEW','UNKNOWN',action.id);
  if(supplies.length>1)add('FIRE_CONTINUITY_MULTIPLE_SUPPLIES_REVIEW','UNKNOWN',action.id);
  if(purposes.has('ACTUATOR_COIL')&&!declaredPins.length)add('FIRE_CONTINUITY_COIL_PIN_MISSING','UNKNOWN',action.id);
  if(purposes.has('ACTUATOR_CONTACT')&&!declaredPins.length)add('FIRE_CONTINUITY_CONTACT_PIN_MISSING','UNKNOWN',action.id);
  if(wires.some(w=>w.reviewed!==true))add('FIRE_CONTINUITY_UNREVIEWED_WIRES','UNKNOWN',action.id);
  if(wires.some(w=>!w.conductor))add('FIRE_CONTINUITY_UNSPECIFIED_CONDUCTOR','UNKNOWN',action.id);
  if(wires.some(w=>w.from===w.to))add('FIRE_CONTINUITY_SELF_LOOP','BLOCKED',action.id);
  if(wires.some(w=>w.from.startsWith('SUPPLY:')&&w.to.startsWith('SUPPLY:')&&w.from!==w.to))
   add('FIRE_CONTINUITY_SUPPLY_TO_SUPPLY_REVIEW','UNKNOWN',action.id);
  actions.push({actionId:action.id,wireCount:wires.length,nodeCount:nodes.size,componentCount:groups.length,
   supplies,signals,pins,protections,reachablePins,unreachablePins,dangling,isolatedComponentCount:isolated.length,
   hasDeclaredReturn:purposes.has('RETURN'),hasDeclaredProtection:purposes.has('PROTECTIVE_DEVICE'),
   hasDeclaredInterlock:purposes.has('INTERLOCK'),connectivityVerified:false,engineeringApproved:false});
  components.push(...groups.map((nodes,i)=>({actionId:action.id,index:i+1,nodes})));
 }
 // A graph path does not establish a conductive path across a relay, breaker or contact.
 add('FIRE_CONTINUITY_CONTACT_STATES_UNVERIFIED');
 add('FIRE_CONTINUITY_POLARITY_UNVERIFIED');
 add('FIRE_CONTINUITY_PROTECTION_COORDINATION_UNVERIFIED');
 add('FIRE_CONTINUITY_FAIL_SAFE_SEQUENCE_UNVERIFIED');
 return {schema:'electropanel.fire.continuity.1',status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'REVIEW_REQUIRED',
  actions,components,issues,engineeringApproved:false,ready_for_installation:false,
  note:'Undirected graph reachability is diagnostic only. Contacts and switching devices are not treated as conductive edges.'};
}
if(typeof module!=='undefined')module.exports={epFireControlContinuityV1};

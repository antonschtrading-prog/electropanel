'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epFireControlTopologyV1}=require('../fire-control-topology-v1');
const {epFireControlDiagramV1}=require('../fire-control-diagram-v1');
const project=()=>({lines:[{id:'L1',name:'HVAC feeder'},{id:'L2',name:'Audio feeder'}],
 loads:[{id:'AC',circuitId:'L1',name:'Air conditioning'},{id:'MUSIC',circuitId:'L2',name:'Audio'}],
 fireControlV1:{version:1,signals:[{id:'S1',kind:'FIRE',zoneId:'Z1',contactType:'NC'}],
 actions:[{id:'A1',loadId:'AC',signalId:'S1',action:'DISCONNECT',actuator:'CONTACTOR',onSignalLoss:'DEENERGIZED'},
 {id:'A2',loadId:'MUSIC',signalId:'S1',action:'DISCONNECT',actuator:'SHUNT_TRIP',onSignalLoss:'ENERGIZED'}],
 design:{assignments:[
 {actionId:'A1',deviceId:'K1',articleSku:'SKU1',controlVoltageV:24,controlSupplyId:'PS1',terminalIds:['T1','T2'],dinRailId:'R1',dinStartModule:1,moduleWidth:2,wireReference:'W1',reviewed:true},
 {actionId:'A2',deviceId:'Q1',articleSku:'SKU2',controlVoltageV:24,controlSupplyId:'PS1',terminalIds:['T3','T4'],dinRailId:'R1',dinStartModule:3,moduleWidth:1,wireReference:'W2',reviewed:true}
 ]}}});
const topo=p=>epFireControlTopologyV1(p);
const node=(p,id)=>topo(p).nodes.find(x=>x.id===id);
const edge=(p,id)=>topo(p).edges.find(x=>x.id===id);
test('unconfigured topology is explicit',()=>assert.equal(topo({}).status,'NOT_CONFIGURED'));
test('unconfigured diagram has no SVG',()=>assert.equal(epFireControlDiagramV1({}).svg,''));
test('configured graph contains all typed nodes',()=>{
 const types=new Set(topo(project()).nodes.map(x=>x.kind));
 for(const t of ['EXTERNAL_SIGNAL','COMMAND','ACTUATOR','CONSUMER','CIRCUIT','CONTROL_SUPPLY','TERMINAL'])assert.ok(types.has(t));
});
test('graph contains all typed relations',()=>{
 const types=new Set(topo(project()).edges.map(x=>x.kind));
 for(const t of ['LOGICAL_TRIGGER','LOGICAL_COMMAND','ACTUATOR_ASSIGNMENT','CONTROL_SUPPLY_REFERENCE','TERMINAL_ASSIGNMENT','POWER_RELATION'])assert.ok(types.has(t));
});
test('graph maintains original load-to-circuit mapping',()=>{
 const e=edge(project(),'POWER:AC');assert.equal(e.from,'LINE:L1');assert.equal(e.to,'LOAD:AC');
});
test('graph does not invent manufacturer pin numbers',()=>{
 const r=topo(project());assert.ok(r.issues.some(x=>x.code==='FIRE_TOPOLOGY_MANUFACTURER_PIN_MAPPING_NOT_VERIFIED'));
});
test('diagram is marked not for installation',()=>{
 const r=epFireControlDiagramV1(project());assert.match(r.svg,/NOT FOR INSTALLATION/);assert.equal(r.ready_for_installation,false);
});
test('SVG has actual signal and actuator nodes',()=>{
 const svg=epFireControlDiagramV1(project()).svg;assert.match(svg,/S1/);assert.match(svg,/K1/);assert.match(svg,/Air conditioning/);
});
test('SVG escapes untrusted consumer names',()=>{
 const p=project();p.loads[0].name='<script>alert(1)</script>';
 const svg=epFireControlDiagramV1(p).svg;
 assert.ok(!svg.includes('<script>'));assert.match(svg,/&lt;script&gt;/);
});
test('SVG escapes untrusted SVG attribute text',()=>{
 const p=project();p.loads[0].name='&quot; onload=&quot;alert(1)';
 const svg=epFireControlDiagramV1(p).svg;assert.match(svg,/&amp;quot;/);
});
test('SVG has unique stable viewbox',()=>{
 const svg=epFireControlDiagramV1(project()).svg;assert.match(svg,/viewBox="0 0 1200/);
});
test('SVG is deterministic for identical inputs',()=>{
 const p=project();assert.equal(epFireControlDiagramV1(p).svg,epFireControlDiagramV1(p).svg);
});
test('graph is deterministic for identical inputs',()=>{
 const p=project();assert.deepEqual(topo(p),topo(p));
});
const failures=[
 ['FIRE_TOPOLOGY_SIGNAL_ORPHAN',p=>p.fireControlV1.actions[0].signalId='MISSING'],
 ['FIRE_TOPOLOGY_LOAD_ORPHAN',p=>p.fireControlV1.actions[0].loadId='MISSING'],
 ['FIRE_TOPOLOGY_CONSUMER_CIRCUIT_MISSING',p=>p.loads[0].circuitId='MISSING'],
 ['FIRE_TOPOLOGY_DEVICE_UNASSIGNED',p=>delete p.fireControlV1.design.assignments[0].deviceId],
 ['FIRE_TOPOLOGY_SUPPLY_MISSING',p=>delete p.fireControlV1.design.assignments[0].controlSupplyId],
 ['FIRE_TOPOLOGY_TERMINALS_MISSING',p=>delete p.fireControlV1.design.assignments[0].terminalIds],
 ['FIRE_TOPOLOGY_WIRE_REFERENCE_MISSING',p=>delete p.fireControlV1.design.assignments[0].wireReference],
 ['FIRE_TOPOLOGY_ARTICLE_UNSELECTED',p=>delete p.fireControlV1.design.assignments[0].articleSku],
 ['FIRE_TOPOLOGY_ASSIGNMENT_UNREVIEWED',p=>p.fireControlV1.design.assignments[0].reviewed=false],
 ['FIRE_TOPOLOGY_TERMINAL_REUSED',p=>p.fireControlV1.design.assignments[1].terminalIds=['T1']],
 ['FIRE_TOPOLOGY_WIRE_REFERENCE_REUSED',p=>p.fireControlV1.design.assignments[1].wireReference='W1'],
 ['FIRE_TOPOLOGY_SHARED_ACTUATOR_REVIEW',p=>p.fireControlV1.design.assignments[1].deviceId='K1'],
 ['FIRE_TOPOLOGY_NO_EXTERNAL_SIGNALS',p=>p.fireControlV1.signals=[]],
 ['FIRE_TOPOLOGY_NO_COMMANDS',p=>p.fireControlV1.actions=[]],
 ['FIRE_TOPOLOGY_SHUNT_PULSE_LOGIC_UNVERIFIED',p=>{}],
 ['FIRE_TOPOLOGY_UVR_CONTINUITY_UNVERIFIED',p=>p.fireControlV1.actions[0].actuator='UNDERVOLTAGE_RELEASE'],
 ['FIRE_TOPOLOGY_RESTART_INTERLOCK_UNVERIFIED',p=>p.fireControlV1.actions[0].action='ENABLE'],
 ['FIRE_TOPOLOGY_MAINTAIN_PRIORITY_UNVERIFIED',p=>p.fireControlV1.actions[0].action='MAINTAIN'],
 ['FIRE_TOPOLOGY_LOSS_STATE_UNVERIFIED',p=>p.fireControlV1.actions[0].onSignalLoss='UNSPECIFIED']
];
for(const [code,mutate] of failures)test('detect '+code,()=>{
 const p=project();mutate(p);assert.ok(topo(p).issues.some(x=>x.code===code));
});
for(const code of ['FIRE_TOPOLOGY_MANUFACTURER_PIN_MAPPING_NOT_VERIFIED',
 'FIRE_TOPOLOGY_CONTACT_ELECTRICAL_POLARITY_NOT_VERIFIED',
 'FIRE_TOPOLOGY_CONTROL_CABLE_SIZING_NOT_VERIFIED',
 'FIRE_TOPOLOGY_PROTECTION_OF_CONTROL_SUPPLY_NOT_VERIFIED'])
 test('persistent review requirement '+code,()=>assert.ok(topo(project()).issues.some(x=>x.code===code)));
test('graph never declares engineering approval',()=>assert.equal(topo(project()).engineeringApproved,false));
test('graph never declares installation readiness',()=>assert.equal(topo(project()).ready_for_installation,false));
test('diagram never declares engineering approval',()=>assert.equal(epFireControlDiagramV1(project()).engineeringApproved,false));
test('diagram preserves topology status',()=>assert.equal(epFireControlDiagramV1(project()).status,topo(project()).status));
test('two loads remain independent logical targets',()=>{
 const p=project();assert.equal(edge(p,'TARGET:A1').to,'LOAD:AC');assert.equal(edge(p,'TARGET:A2').to,'LOAD:MUSIC');
});
test('two actuators remain independent',()=>{
 const p=project();assert.equal(edge(p,'ACTUATES:A1').to,'DEV:K1');assert.equal(edge(p,'ACTUATES:A2').to,'DEV:Q1');
});
test('supply edges preserve explicit voltage',()=>assert.equal(edge(project(),'SUPPLY:A1').controlVoltageV,24));
test('external signal retains dry-contact type',()=>assert.equal(node(project(),'SIG:S1').contactType,'NC'));
test('external signal retains zone reference',()=>assert.equal(node(project(),'SIG:S1').zoneId,'Z1'));
test('action retains loss-state declaration',()=>assert.equal(node(project(),'ACT:A1').onSignalLoss,'DEENERGIZED'));
test('actuator retains exact article SKU',()=>assert.equal(node(project(),'DEV:K1').articleSku,'SKU1'));
test('terminal assignments are distinct',()=>{
 const p=project();assert.ok(node(p,'TERM:T1'));assert.ok(node(p,'TERM:T4'));
});
test('topology does not mutate project',()=>{
 const p=project(),before=JSON.stringify(p);topo(p);assert.equal(JSON.stringify(p),before);
});
test('diagram does not mutate project',()=>{
 const p=project(),before=JSON.stringify(p);epFireControlDiagramV1(p);assert.equal(JSON.stringify(p),before);
});
test('duplicate action identifiers are blocked',()=>{
 const p=project();p.fireControlV1.actions[1].id='A1';assert.equal(topo(p).status,'BLOCKED');
});
test('duplicate signal identifiers are blocked',()=>{
 const p=project();p.fireControlV1.signals.push({...p.fireControlV1.signals[0]});assert.equal(topo(p).status,'BLOCKED');
});
test('duplicate circuit identifiers are blocked',()=>{
 const p=project();p.lines.push({...p.lines[0]});assert.equal(topo(p).status,'BLOCKED');
});
test('duplicate consumer identifiers are blocked',()=>{
 const p=project();p.loads.push({...p.loads[0]});assert.equal(topo(p).status,'BLOCKED');
});
test('missing terminal array does not create fake terminals',()=>{
 const p=project();delete p.fireControlV1.design.assignments[0].terminalIds;
 assert.ok(!edge(p,'TERMINAL:A1:T1'));
});
test('missing actuator does not create fake device',()=>{
 const p=project();delete p.fireControlV1.design.assignments[0].deviceId;
 assert.ok(!node(p,'DEV:K1'));
});
test('missing supply does not create fake supply edge',()=>{
 const p=project();delete p.fireControlV1.design.assignments[0].controlSupplyId;
 assert.ok(!edge(p,'SUPPLY:A1'));
});
test('rendering SVG does not embed JavaScript handlers',()=>{
 const svg=epFireControlDiagramV1(project()).svg;assert.ok(!svg.includes('onclick='));assert.ok(!svg.includes('onload='));
});
test('graph nodes contain only declared signal IDs',()=>{
 const p=project();assert.equal(topo(p).nodes.filter(n=>n.kind==='EXTERNAL_SIGNAL').length,1);
});
test('graph edges contain one logical trigger per action',()=>{
 const p=project();assert.equal(topo(p).edges.filter(e=>e.kind==='LOGICAL_TRIGGER').length,2);
});
test('graph edges contain one logical target per action',()=>{
 const p=project();assert.equal(topo(p).edges.filter(e=>e.kind==='LOGICAL_COMMAND').length,2);
});
test('graph edges contain one actuator assignment per action',()=>{
 const p=project();assert.equal(topo(p).edges.filter(e=>e.kind==='ACTUATOR_ASSIGNMENT').length,2);
});
test('graph edges contain one supply reference per action',()=>{
 const p=project();assert.equal(topo(p).edges.filter(e=>e.kind==='CONTROL_SUPPLY_REFERENCE').length,2);
});
test('graph edges contain four terminal assignments',()=>{
 const p=project();assert.equal(topo(p).edges.filter(e=>e.kind==='TERMINAL_ASSIGNMENT').length,4);
});
test('graph does not include physical wire continuity',()=>{
 const p=project();assert.ok(!topo(p).edges.some(e=>e.kind==='PHYSICAL_WIRE'));
});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epFireControlContinuityV1:run}=require('../fire-control-continuity-v1');
const {epFireControlContinuityCsvV1}=require('../fire-control-export-v1');
const wire=(id,from,to,purpose='OTHER')=>({id,wireReference:'REF_'+id,from,to,purpose,actionId:'A1',verifiedSource:'https://example.org/source',reviewed:true,conductor:{sectionMm2:1.5,material:'COPPER'}});
const endpoint=(kind,id,pin)=>({kind,id,...(pin?{pin}:{})});
const S=endpoint('SUPPLY','PS1'),T1=endpoint('TERMINAL','T1'),T2=endpoint('TERMINAL','T2'),T3=endpoint('TERMINAL','T3'),K1=endpoint('DEVICE_PIN','K1','A1'),K2=endpoint('DEVICE_PIN','K1','A2'),F=endpoint('PROTECTION','F1'),SIG=endpoint('SIGNAL','S1');
const base=()=>({lines:[{id:'L1'}],loads:[{id:'AC',circuitId:'L1'}],fireControlV1:{
 signals:[{id:'S1',kind:'FIRE',zoneId:'Z1',contactType:'NC'}],
 actions:[{id:'A1',signalId:'S1',loadId:'AC',action:'DISCONNECT',actuator:'CONTACTOR',onSignalLoss:'DEENERGIZED'}],
 design:{assignments:[{actionId:'A1',deviceId:'K1',articleSku:'SKU1',controlVoltageV:24,controlSupplyId:'PS1',terminalIds:['T1','T2','T3'],pins:[
 {terminalId:'T1',devicePin:'A1',role:'COIL_A1',verifiedSource:'https://example.org/pin'},
 {terminalId:'T2',devicePin:'A2',role:'COIL_A2',verifiedSource:'https://example.org/pin'}]}]},
 wiring:{connections:[
 wire('W1',S,T1,'CONTROL_SUPPLY'),
 wire('W2',T1,K1,'ACTUATOR_COIL'),
 wire('W3',K2,T2,'RETURN'),
 wire('W4',T2,F,'PROTECTIVE_DEVICE'),
 wire('W5',SIG,T3,'SIGNAL_CONTACT'),
 wire('W6',T3,K1,'INTERLOCK')
 ]}}});
const row=p=>run(p).actions[0];
const has=(p,code)=>run(p).issues.some(x=>x.code===code);
test('unconfigured returns NOT_CONFIGURED',()=>assert.equal(run({}).status,'NOT_CONFIGURED'));
test('unconfigured has no actions',()=>assert.equal(run({}).actions.length,0));
test('unconfigured has no components',()=>assert.equal(run({}).components.length,0));
test('unconfigured not approved',()=>assert.equal(run({}).engineeringApproved,false));
test('unconfigured not installation ready',()=>assert.equal(run({}).ready_for_installation,false));
test('configured has one action',()=>assert.equal(run(base()).actions.length,1));
test('configured action ID preserved',()=>assert.equal(row(base()).actionId,'A1'));
test('configured wires count preserved',()=>assert.equal(row(base()).wireCount,6));
test('configured has 8 distinct graph nodes',()=>assert.equal(row(base()).nodeCount,8));
test('configured graph has two disconnected groups',()=>assert.equal(row(base()).componentCount,2));
test('configured graph is not approved',()=>assert.equal(run(base()).engineeringApproved,false));
test('configured graph is not installation ready',()=>assert.equal(run(base()).ready_for_installation,false));
test('configured action not connectivity verified',()=>assert.equal(row(base()).connectivityVerified,false));
test('configured action not approved',()=>assert.equal(row(base()).engineeringApproved,false));
test('configured graph status requires review',()=>assert.equal(run(base()).status,'REVIEW_REQUIRED'));
test('configured retains supply node',()=>assert.ok(row(base()).supplies.includes('SUPPLY:PS1')));
test('configured retains signal node',()=>assert.ok(row(base()).signals.includes('SIGNAL:S1')));
test('configured retains protection node',()=>assert.ok(row(base()).protections.includes('PROTECTION:F1')));
test('configured retains A1 device pin',()=>assert.ok(row(base()).pins.includes('DEVICE_PIN:K1:A1')));
test('configured retains A2 device pin',()=>assert.ok(row(base()).pins.includes('DEVICE_PIN:K1:A2')));
test('configured reaches coil A1 from supply',()=>assert.ok(row(base()).reachablePins.includes('DEVICE_PIN:K1:A1')));
test('configured cannot reach A2 from supply',()=>assert.ok(row(base()).unreachablePins.includes('DEVICE_PIN:K1:A2')));
test('configured detects unreachable device pin',()=>assert.ok(has(base(),'FIRE_CONTINUITY_DEVICE_PIN_UNREACHABLE')));
test('configured detects isolated component',()=>assert.ok(has(base(),'FIRE_CONTINUITY_ISOLATED_COMPONENT')));
test('configured detects multiple components',()=>assert.ok(has(base(),'FIRE_CONTINUITY_MULTIPLE_COMPONENTS_REVIEW')));
test('configured return is declared',()=>assert.equal(row(base()).hasDeclaredReturn,true));
test('configured protection is declared',()=>assert.equal(row(base()).hasDeclaredProtection,true));
test('configured interlock is declared',()=>assert.equal(row(base()).hasDeclaredInterlock,true));
test('configured protection endpoint exists',()=>assert.ok(!has(base(),'FIRE_CONTINUITY_PROTECTIVE_ENDPOINT_ABSENT')));
test('configured signal is connected',()=>assert.ok(!has(base(),'FIRE_CONTINUITY_COMMAND_SIGNAL_DISCONNECTED')));
test('configured has no empty action',()=>assert.ok(!has(base(),'FIRE_CONTINUITY_ACTION_EMPTY')));
test('configured has no missing supply',()=>assert.ok(!has(base(),'FIRE_CONTINUITY_SUPPLY_UNDECLARED')));
test('configured has no missing device',()=>assert.ok(!has(base(),'FIRE_CONTINUITY_DEVICE_UNDECLARED')));
test('configured has no missing return category',()=>assert.ok(!has(base(),'FIRE_CONTINUITY_RETURN_PATH_NOT_DECLARED')));
test('configured has no missing protection category',()=>assert.ok(!has(base(),'FIRE_CONTINUITY_PROTECTION_NOT_DECLARED')));
test('configured has no missing interlock category',()=>assert.ok(!has(base(),'FIRE_CONTINUITY_INTERLOCK_NOT_DECLARED')));
test('configured has no missing coil pin',()=>assert.ok(!has(base(),'FIRE_CONTINUITY_COIL_PIN_MISSING')));
test('configured has no unreviewed wires',()=>assert.ok(!has(base(),'FIRE_CONTINUITY_UNREVIEWED_WIRES')));
test('configured has no unspecified conductors',()=>assert.ok(!has(base(),'FIRE_CONTINUITY_UNSPECIFIED_CONDUCTOR')));
test('contact states remain unverified',()=>assert.ok(has(base(),'FIRE_CONTINUITY_CONTACT_STATES_UNVERIFIED')));
test('polarity remains unverified',()=>assert.ok(has(base(),'FIRE_CONTINUITY_POLARITY_UNVERIFIED')));
test('protection coordination remains unverified',()=>assert.ok(has(base(),'FIRE_CONTINUITY_PROTECTION_COORDINATION_UNVERIFIED')));
test('fail safe remains unverified',()=>assert.ok(has(base(),'FIRE_CONTINUITY_FAIL_SAFE_SEQUENCE_UNVERIFIED')));
test('project remains unchanged',()=>{const p=base(),before=JSON.stringify(p);run(p);assert.equal(JSON.stringify(p),before)});
test('repeatable result',()=>{const p=base();assert.deepEqual(run(p),run(p))});
const cases=[
 ['FIRE_CONTINUITY_ACTION_EMPTY',p=>p.fireControlV1.wiring.connections=[]],
 ['FIRE_CONTINUITY_SUPPLY_UNDECLARED',p=>delete p.fireControlV1.design.assignments[0].controlSupplyId],
 ['FIRE_CONTINUITY_ASSIGNED_SUPPLY_DISCONNECTED',p=>p.fireControlV1.wiring.connections=p.fireControlV1.wiring.connections.filter(x=>x.id!=='W1')],
 ['FIRE_CONTINUITY_DEVICE_UNDECLARED',p=>delete p.fireControlV1.design.assignments[0].deviceId],
 ['FIRE_CONTINUITY_DEVICE_PINS_DISCONNECTED',p=>p.fireControlV1.wiring.connections=p.fireControlV1.wiring.connections.filter(x=>x.id!=='W2'&&x.id!=='W3'&&x.id!=='W6')],
 ['FIRE_CONTINUITY_RETURN_PATH_NOT_DECLARED',p=>p.fireControlV1.wiring.connections[2].purpose='OTHER'],
 ['FIRE_CONTINUITY_PROTECTION_NOT_DECLARED',p=>p.fireControlV1.wiring.connections[3].purpose='OTHER'],
 ['FIRE_CONTINUITY_INTERLOCK_NOT_DECLARED',p=>p.fireControlV1.wiring.connections[5].purpose='OTHER'],
 ['FIRE_CONTINUITY_COMMAND_SIGNAL_DISCONNECTED',p=>p.fireControlV1.wiring.connections=p.fireControlV1.wiring.connections.filter(x=>x.id!=='W5')],
 ['FIRE_CONTINUITY_PROTECTIVE_ENDPOINT_ABSENT',p=>p.fireControlV1.wiring.connections[3].to=T1],
 ['FIRE_CONTINUITY_COIL_PIN_MISSING',p=>{p.fireControlV1.wiring.connections=p.fireControlV1.wiring.connections.filter(x=>x.id!=='W2'&&x.id!=='W3'&&x.id!=='W6');p.fireControlV1.wiring.connections[0].purpose='ACTUATOR_COIL'}],
 ['FIRE_CONTINUITY_CONTACT_PIN_MISSING',p=>{p.fireControlV1.wiring.connections=p.fireControlV1.wiring.connections.filter(x=>x.id!=='W2'&&x.id!=='W3'&&x.id!=='W6');p.fireControlV1.wiring.connections[0].purpose='ACTUATOR_CONTACT'}],
 ['FIRE_CONTINUITY_UNREVIEWED_WIRES',p=>p.fireControlV1.wiring.connections[0].reviewed=false],
 ['FIRE_CONTINUITY_UNSPECIFIED_CONDUCTOR',p=>delete p.fireControlV1.wiring.connections[0].conductor],
 ['FIRE_CONTINUITY_MULTIPLE_SUPPLIES_REVIEW',p=>{p.fireControlV1.design.assignments[0].controlSupplyId='PS1';p.fireControlV1.design.assignments.push({...p.fireControlV1.design.assignments[0],actionId:'OTHER',controlSupplyId:'PS2'});p.fireControlV1.wiring.connections.push(wire('W7',endpoint('SUPPLY','PS2'),T2))}],
 ['FIRE_CONTINUITY_DANGLING_ENDPOINTS_REVIEW',p=>p.fireControlV1.wiring.connections=[]]
];
for(const [code,mutate] of cases)test('detect '+code,()=>{const p=base();mutate(p);assert.ok(has(p,code),code)});
test('empty action has no nodes',()=>{const p=base();p.fireControlV1.wiring.connections=[];assert.equal(row(p).nodeCount,0)});
test('empty action has zero components',()=>{const p=base();p.fireControlV1.wiring.connections=[];assert.equal(row(p).componentCount,0)});
test('empty action has zero reachable pins',()=>{const p=base();p.fireControlV1.wiring.connections=[];assert.equal(row(p).reachablePins.length,0)});
test('empty action still requires review',()=>{const p=base();p.fireControlV1.wiring.connections=[];assert.equal(run(p).status,'REVIEW_REQUIRED')});
test('per action separation',()=>{
 const p=base();p.fireControlV1.actions.push({...p.fireControlV1.actions[0],id:'A2'});
 assert.equal(run(p).actions.length,2);assert.equal(run(p).actions[1].wireCount,0);
});
test('component list references action',()=>assert.ok(run(base()).components.every(x=>x.actionId==='A1')));
test('component nodes sorted',()=>assert.ok(run(base()).components.every(x=>JSON.stringify(x.nodes)===JSON.stringify([...x.nodes].sort()))));
test('source wiring issues preserved',()=>{
 const p=base();p.fireControlV1.wiring.connections[0].from={kind:'SUPPLY',id:'MISSING'};
 assert.ok(has(p,'FIRE_WIRING_SUPPLY_UNKNOWN'));
});
test('source wiring blocking propagated',()=>{
 const p=base();p.fireControlV1.wiring.connections[0].from={kind:'SUPPLY',id:'MISSING'};
 assert.equal(run(p).status,'BLOCKED');
});
test('unknown conductor does not imply approval',()=>{
 const p=base();delete p.fireControlV1.wiring.connections[0].conductor;
 assert.equal(run(p).engineeringApproved,false);
});
test('graph never invents wires',()=>{
 const p=base();p.fireControlV1.wiring.connections=[];
 assert.equal(run(p).actions[0].wireCount,0);
});
test('one added wire updates count',()=>{
 const p=base();p.fireControlV1.wiring.connections.push(wire('W7',T2,K1));
 assert.equal(row(p).wireCount,7);
});
test('additional wire can connect graph components',()=>{
 const p=base();p.fireControlV1.wiring.connections.push(wire('W7',T2,K1));
 assert.equal(row(p).componentCount,1);
});
test('added wire reaches previously isolated A2',()=>{
 const p=base();p.fireControlV1.wiring.connections.push(wire('W7',T2,K1));
 assert.ok(row(p).reachablePins.includes('DEVICE_PIN:K1:A2'));
});
test('additional connection still cannot verify contacts',()=>{
 const p=base();p.fireControlV1.wiring.connections.push(wire('W7',T2,K1));
 assert.ok(has(p,'FIRE_CONTINUITY_CONTACT_STATES_UNVERIFIED'));
});
test('connected graph is still review required',()=>{
 const p=base();p.fireControlV1.wiring.connections.push(wire('W7',T2,K1));
 assert.equal(run(p).status,'REVIEW_REQUIRED');
});

test('continuity CSV includes action',()=>assert.match(epFireControlContinuityCsvV1(base()).csv,/A1/));
test('continuity CSV includes supply',()=>assert.match(epFireControlContinuityCsvV1(base()).csv,/SUPPLY:PS1/));
test('continuity CSV includes reachable pin',()=>assert.match(epFireControlContinuityCsvV1(base()).csv,/DEVICE_PIN:K1:A1/));
test('continuity CSV includes unreachable pin',()=>assert.match(epFireControlContinuityCsvV1(base()).csv,/DEVICE_PIN:K1:A2/));
test('continuity CSV includes header',()=>assert.match(epFireControlContinuityCsvV1(base()).csv,/action_id/));
test('continuity CSV includes component count',()=>assert.match(epFireControlContinuityCsvV1(base()).csv,/component_count/));
test('continuity CSV includes unresolved status',()=>assert.match(epFireControlContinuityCsvV1(base()).csv,/false/));
test('continuity CSV is never approved',()=>assert.equal(epFireControlContinuityCsvV1(base()).engineeringApproved,false));
test('continuity CSV is never installation ready',()=>assert.equal(epFireControlContinuityCsvV1(base()).ready_for_installation,false));
test('continuity CSV empty project has header',()=>assert.match(epFireControlContinuityCsvV1({}).csv,/action_id/));
test('continuity CSV preserves diagnostic issues',()=>assert.ok(epFireControlContinuityCsvV1(base()).issues.length>0));
test('continuity CSV is deterministic',()=>{const p=base();assert.equal(epFireControlContinuityCsvV1(p).csv,epFireControlContinuityCsvV1(p).csv)});

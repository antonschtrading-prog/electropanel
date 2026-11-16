'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epFireControlWiringV1}=require('../fire-control-wiring-v1');
const project=()=>({lines:[{id:'L1'}],loads:[{id:'AC',circuitId:'L1'}],fireControlV1:{
 signals:[{id:'S1',kind:'FIRE',zoneId:'Z1',contactType:'NC'}],
 actions:[{id:'A1',signalId:'S1',loadId:'AC',action:'DISCONNECT',actuator:'CONTACTOR',onSignalLoss:'DEENERGIZED'}],
 design:{assignments:[{actionId:'A1',deviceId:'K1',articleSku:'SKU1',controlVoltageV:24,controlSupplyId:'PS1',
 terminalIds:['T1','T2'],pins:[{terminalId:'T1',devicePin:'A1',role:'COIL_A1',verifiedSource:'https://example.org/pins'}]}]},
 wiring:{connections:[{id:'W1',wireReference:'WIRE1',from:{kind:'SUPPLY',id:'PS1'},to:{kind:'TERMINAL',id:'T1'},
 purpose:'CONTROL_SUPPLY',actionId:'A1',conductor:{sectionMm2:1.5,material:'COPPER',color:'RED'},
 verifiedSource:'https://example.org/schematic',reviewed:true}]}
}});
const result=p=>epFireControlWiringV1(p);
const issue=(p,code)=>result(p).issues.some(x=>x.code===code);
test('unconfigured project is not configured',()=>assert.equal(result({}).status,'NOT_CONFIGURED'));
test('missing wiring is unresolved',()=>{const p=project();delete p.fireControlV1.wiring;assert.ok(issue(p,'FIRE_WIRING_NOT_DECLARED'))});
test('baseline declared connection is preserved',()=>assert.equal(result(project()).connections[0].wireReference,'WIRE1'));
test('baseline is not approved',()=>assert.equal(result(project()).engineeringApproved,false));
test('baseline is not installation ready',()=>assert.equal(result(project()).ready_for_installation,false));
test('baseline has no blocked issues',()=>assert.equal(result(project()).status,'REVIEW_REQUIRED'));
test('connection preserves control supply',()=>assert.equal(result(project()).connections[0].from,'SUPPLY:PS1'));
test('connection preserves terminal',()=>assert.equal(result(project()).connections[0].to,'TERMINAL:T1'));
test('connection preserves conductor cross section',()=>assert.equal(result(project()).connections[0].conductor.sectionMm2,1.5));
test('connection preserves source evidence',()=>assert.equal(result(project()).connections[0].verifiedSource,'https://example.org/schematic'));
test('connection preserves engineer review',()=>assert.equal(result(project()).connections[0].reviewed,true));
test('connection preserves purpose',()=>assert.equal(result(project()).connections[0].purpose,'CONTROL_SUPPLY'));
test('connection preserves action mapping',()=>assert.equal(result(project()).connections[0].actionId,'A1'));
test('model never modifies project',()=>{const p=project(),before=JSON.stringify(p);result(p);assert.equal(JSON.stringify(p),before)});
test('model is deterministic',()=>{const p=project();assert.deepEqual(result(p),result(p))});
const mutations=[
 ['FIRE_WIRING_SCHEMA_INVALID',p=>p.fireControlV1.wiring={connections:{}}],
 ['FIRE_WIRING_CONNECTION_INVALID',p=>p.fireControlV1.wiring.connections[0].id='bad id'],
 ['FIRE_WIRING_CONNECTION_INVALID',p=>delete p.fireControlV1.wiring.connections[0].actionId],
 ['FIRE_WIRING_CONNECTION_INVALID',p=>p.fireControlV1.wiring.connections[0].purpose='UNLISTED'],
 ['FIRE_WIRING_CONNECTION_INVALID',p=>p.fireControlV1.wiring.connections[0].verifiedSource='http://example.org'],
 ['FIRE_WIRING_CONNECTION_INVALID',p=>p.fireControlV1.wiring.connections[0].reviewed='true'],
 ['FIRE_WIRING_CONNECTION_INVALID',p=>p.fireControlV1.wiring.connections[0].extra=true],
 ['FIRE_WIRING_DUPLICATE_ID',p=>p.fireControlV1.wiring.connections.push({...p.fireControlV1.wiring.connections[0],wireReference:'WIRE2'})],
 ['FIRE_WIRING_DUPLICATE_REFERENCE',p=>p.fireControlV1.wiring.connections.push({...p.fireControlV1.wiring.connections[0],id:'W2'})],
 ['FIRE_WIRING_ENDPOINT_INVALID',p=>p.fireControlV1.wiring.connections[0].from={kind:'MAGIC',id:'X'}],
 ['FIRE_WIRING_ENDPOINT_INVALID',p=>p.fireControlV1.wiring.connections[0].to={kind:'TERMINAL',id:'bad id'}],
 ['FIRE_WIRING_ENDPOINT_INVALID',p=>p.fireControlV1.wiring.connections[0].from={kind:'SUPPLY',id:'PS1',script:true}],
 ['FIRE_WIRING_SIGNAL_UNKNOWN',p=>p.fireControlV1.wiring.connections[0].from={kind:'SIGNAL',id:'MISSING'}],
 ['FIRE_WIRING_SUPPLY_UNKNOWN',p=>p.fireControlV1.wiring.connections[0].from={kind:'SUPPLY',id:'MISSING'}],
 ['FIRE_WIRING_TERMINAL_UNKNOWN',p=>p.fireControlV1.wiring.connections[0].to={kind:'TERMINAL',id:'MISSING'}],
 ['FIRE_WIRING_DEVICE_PIN_UNKNOWN',p=>p.fireControlV1.wiring.connections[0].to={kind:'DEVICE_PIN',id:'K1',pin:'A9'}],
 ['FIRE_WIRING_DEVICE_PIN_UNKNOWN',p=>p.fireControlV1.wiring.connections[0].to={kind:'DEVICE_PIN',id:'K1'}],
 ['FIRE_WIRING_SELF_LOOP',p=>p.fireControlV1.wiring.connections[0].to={kind:'SUPPLY',id:'PS1'}],
 ['FIRE_WIRING_CONDUCTOR_INVALID',p=>p.fireControlV1.wiring.connections[0].conductor.sectionMm2=0],
 ['FIRE_WIRING_CONDUCTOR_INVALID',p=>p.fireControlV1.wiring.connections[0].conductor.sectionMm2=241],
 ['FIRE_WIRING_CONDUCTOR_INVALID',p=>p.fireControlV1.wiring.connections[0].conductor.material='STEEL'],
 ['FIRE_WIRING_CONDUCTOR_INVALID',p=>p.fireControlV1.wiring.connections[0].conductor.color='bad color'],
 ['FIRE_WIRING_CONDUCTOR_INVALID',p=>p.fireControlV1.wiring.connections[0].conductor.extra='hidden'],
 ['FIRE_WIRING_ENGINEER_REVIEW_REQUIRED',p=>p.fireControlV1.wiring.connections[0].reviewed=false],
 ['FIRE_WIRING_CONDUCTOR_UNDECLARED',p=>delete p.fireControlV1.wiring.connections[0].conductor],
 ['FIRE_WIRING_ACTION_NOT_CONNECTED',p=>p.fireControlV1.wiring.connections=[]],
 ['FIRE_WIRING_RETURN_NOT_DECLARED',p=>{}],
 ['FIRE_WIRING_CONTROL_PROTECTION_NOT_DECLARED',p=>{}],
 ['FIRE_WIRING_INTERLOCK_NOT_DECLARED',p=>{}],
 ['FIRE_WIRING_ELECTRICAL_CONTINUITY_UNVERIFIED',p=>{}],
 ['FIRE_WIRING_CONTACT_FUNCTION_UNVERIFIED',p=>{}],
 ['FIRE_WIRING_SUPPLY_CAPACITY_UNVERIFIED',p=>{}],
 ['FIRE_WIRING_CABLE_RATING_UNVERIFIED',p=>{}]
];
for(const [code,mutate] of mutations)test('detect '+code,()=>{const p=project();mutate(p);assert.ok(issue(p,code),code)});
test('valid manufacturer pin endpoint accepted',()=>{
 const p=project();p.fireControlV1.wiring.connections[0].to={kind:'DEVICE_PIN',id:'K1',pin:'A1'};
 assert.ok(!issue(p,'FIRE_WIRING_DEVICE_PIN_UNKNOWN'));
});
test('valid external signal endpoint accepted',()=>{
 const p=project();p.fireControlV1.wiring.connections[0].from={kind:'SIGNAL',id:'S1'};
 assert.ok(!issue(p,'FIRE_WIRING_SIGNAL_UNKNOWN'));
});
test('valid junction endpoint accepted',()=>{
 const p=project();p.fireControlV1.wiring.connections[0].from={kind:'JUNCTION',id:'J1'};
 assert.ok(!issue(p,'FIRE_WIRING_ENDPOINT_INVALID'));
});
test('valid protection endpoint accepted',()=>{
 const p=project();p.fireControlV1.wiring.connections[0].from={kind:'PROTECTION',id:'F1'};
 assert.ok(!issue(p,'FIRE_WIRING_ENDPOINT_INVALID'));
});
test('aluminium conductor accepted as declared',()=>{
 const p=project();p.fireControlV1.wiring.connections[0].conductor.material='ALUMINUM';
 assert.ok(!issue(p,'FIRE_WIRING_CONDUCTOR_INVALID'));
});
test('duplicate pair remains review warning',()=>{
 const p=project(),w=p.fireControlV1.wiring.connections[0];p.fireControlV1.wiring.connections.push({...w,id:'W2',wireReference:'WIRE2'});
 assert.ok(issue(p,'FIRE_WIRING_DUPLICATE_PAIR'));
});
test('missing wire reference is blocked',()=>{
 const p=project();delete p.fireControlV1.wiring.connections[0].wireReference;
 assert.ok(issue(p,'FIRE_WIRING_CONNECTION_INVALID'));
});
test('empty connections do not fabricate wires',()=>{
 const p=project();p.fireControlV1.wiring.connections=[];assert.equal(result(p).connections.length,0);
});
test('empty connections retain unresolved return',()=>{
 const p=project();p.fireControlV1.wiring.connections=[];assert.ok(issue(p,'FIRE_WIRING_RETURN_NOT_DECLARED'));
});
test('wiring schema rejects extra keys',()=>{
 const p=project();p.fireControlV1.wiring.automaticApproval=true;assert.ok(issue(p,'FIRE_WIRING_SCHEMA_INVALID'));
});
test('connections cap is enforced',()=>{
 const p=project(),w=p.fireControlV1.wiring.connections[0];
 p.fireControlV1.wiring.connections=Array.from({length:1601},(_,i)=>({...w,id:'W'+i,wireReference:'WIRE'+i}));
 assert.ok(issue(p,'FIRE_WIRING_LIMIT_EXCEEDED'));
});
test('wiring can include explicitly declared return',()=>{
 const p=project(),w=p.fireControlV1.wiring.connections[0];
 p.fireControlV1.wiring.connections.push({...w,id:'W2',wireReference:'WIRE2',purpose:'RETURN',from:{kind:'TERMINAL',id:'T2'},to:{kind:'SUPPLY',id:'PS1'}});
 assert.ok(!issue(p,'FIRE_WIRING_RETURN_NOT_DECLARED'));
});
test('wiring can include explicitly declared protection',()=>{
 const p=project(),w=p.fireControlV1.wiring.connections[0];
 p.fireControlV1.wiring.connections.push({...w,id:'W2',wireReference:'WIRE2',purpose:'PROTECTIVE_DEVICE',from:{kind:'PROTECTION',id:'F1'},to:{kind:'TERMINAL',id:'T2'}});
 assert.ok(!issue(p,'FIRE_WIRING_CONTROL_PROTECTION_NOT_DECLARED'));
});
test('wiring can include explicitly declared interlock',()=>{
 const p=project(),w=p.fireControlV1.wiring.connections[0];
 p.fireControlV1.wiring.connections.push({...w,id:'W2',wireReference:'WIRE2',purpose:'INTERLOCK',from:{kind:'TERMINAL',id:'T2'},to:{kind:'DEVICE_PIN',id:'K1',pin:'A1'}});
 assert.ok(!issue(p,'FIRE_WIRING_INTERLOCK_NOT_DECLARED'));
});
test('wiring retains no certification despite all connection categories',()=>{
 const p=project(),w=p.fireControlV1.wiring.connections[0];
 for(const [i,purpose] of ['RETURN','PROTECTIVE_DEVICE','INTERLOCK'].entries())
 p.fireControlV1.wiring.connections.push({...w,id:'W'+(i+2),wireReference:'WIRE'+(i+2),purpose,from:{kind:'JUNCTION',id:'J'+i}});
 assert.equal(result(p).engineeringApproved,false);
});

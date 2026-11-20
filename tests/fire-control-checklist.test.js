'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epFireControlChecklistV1}=require('../fire-control-checklist-v1');
const project=()=>({railCapacity:12,lines:[{id:'L1'}],loads:[{id:'A',circuitId:'L1'}],dinPlacementsV1:[],
 fireControlV1:{signals:[{id:'S1',kind:'FIRE',zoneId:'Z',contactType:'NC'},{id:'S2',kind:'CONTROL_POWER_LOSS',zoneId:'Z',contactType:'NC'},{id:'S3',kind:'RESET',zoneId:'Z',contactType:'NO'}],
 actions:[{id:'X1',signalId:'S1',loadId:'A',action:'DISCONNECT',actuator:'CONTACTOR',onSignalLoss:'DEENERGIZED'},
 {id:'X2',signalId:'S2',loadId:'A',action:'MAINTAIN',actuator:'INTERFACE_RELAY',onSignalLoss:'ENERGIZED'},
 {id:'X3',signalId:'S3',loadId:'A',action:'MAINTAIN',actuator:'INTERFACE_RELAY',onSignalLoss:'ENERGIZED'}],
 design:{assignments:[{actionId:'X1',deviceId:'K1',articleSku:'SKU1',controlVoltageV:24,controlSupplyId:'PS1',terminalIds:['T1'],dinRailId:'R1',dinStartModule:1,moduleWidth:2,wireReference:'W1',reviewed:true},
 {actionId:'X2',deviceId:'K2',articleSku:'SKU2',controlVoltageV:24,controlSupplyId:'PS1',terminalIds:['T2'],dinRailId:'R1',dinStartModule:3,moduleWidth:1,wireReference:'W2',reviewed:true},
 {actionId:'X3',deviceId:'K3',articleSku:'SKU3',controlVoltageV:24,controlSupplyId:'PS1',terminalIds:['T3'],dinRailId:'R1',dinStartModule:4,moduleWidth:1,wireReference:'W3',reviewed:true}]}}});
const check=(p,code)=>epFireControlChecklistV1(p).checks.find(x=>x.code===code);
const codes=["FCHK_01_PROJECT_LINES","FCHK_02_PROJECT_LOADS","FCHK_03_LINE_IDS","FCHK_04_LOAD_IDS","FCHK_05_UNIQUE_LINES","FCHK_06_UNIQUE_LOADS","FCHK_07_LOAD_CIRCUITS","FCHK_08_SIGNAL_LIST","FCHK_09_ACTION_LIST","FCHK_10_ASSIGNMENTS_LIST","FCHK_11_SIGNAL_IDENTIFIERS","FCHK_12_UNIQUE_SIGNALS","FCHK_13_SIGNAL_KINDS","FCHK_14_SIGNAL_ZONES","FCHK_15_CONTACT_TYPES","FCHK_16_SIGNAL_LIMIT","FCHK_17_SIGNAL_USED","FCHK_18_FIRE_SIGNAL","FCHK_19_POWER_LOSS_SIGNAL","FCHK_20_RESET_SIGNAL","FCHK_21_ACTION_IDS","FCHK_22_UNIQUE_ACTIONS","FCHK_23_ACTION_LIMIT","FCHK_24_ACTION_LOADS","FCHK_25_ACTION_SIGNALS","FCHK_26_COMMANDS","FCHK_27_ACTUATORS","FCHK_28_LOSS_STATES","FCHK_29_LOSS_STATES_EXPLICIT","FCHK_30_SHUNT_UVR_NOT_ENABLE","FCHK_31_ASSIGNMENT_IDS","FCHK_32_UNIQUE_ASSIGNMENTS","FCHK_33_ASSIGNMENT_LINKS","FCHK_34_ASSIGNMENT_COVERAGE","FCHK_35_DEVICE_IDENTIFIERS","FCHK_36_DEVICE_UNIQUENESS","FCHK_37_SKU_DECLARED","FCHK_38_COIL_VOLTAGE","FCHK_39_SUPPLY_REFERENCES","FCHK_40_ENGINEER_REVIEW","FCHK_41_TERMINALS_DECLARED","FCHK_42_TERMINALS_VALID","FCHK_43_TERMINALS_UNIQUE","FCHK_44_WIRE_REFERENCES","FCHK_45_DIN_RAILS","FCHK_46_DIN_START","FCHK_47_DIN_WIDTH","FCHK_48_DIN_CAPACITY","FCHK_49_FULL_BOARD_LAYOUT","FCHK_50_TERMINAL_PIN_MAPPING"];
for(const code of codes)test('baseline evidence criterion '+code,()=>{
 const row=check(project(),code);assert.ok(row,'Missing criterion '+code);
 assert.equal(row.status,code.startsWith('FCHK_50_')?'REVIEW_REQUIRED':'PASS');
});
test('checklist has exactly 50 unique criteria',()=>{
 const r=epFireControlChecklistV1(project());assert.equal(r.total,50);
 assert.equal(new Set(r.checks.map(x=>x.code)).size,50);
});
test('checklist never asserts installation readiness',()=>{
 const r=epFireControlChecklistV1(project());assert.equal(r.engineeringApproved,false);assert.equal(r.ready_for_installation,false);
});
const mutations=[
 ['FCHK_01_PROJECT_LINES',p=>{delete p.lines}],
 ['FCHK_02_PROJECT_LOADS',p=>{delete p.loads}],
 ['FCHK_03_LINE_IDS',p=>{p.lines[0].id='bad id'}],
 ['FCHK_04_LOAD_IDS',p=>{p.loads[0].id='bad id'}],
 ['FCHK_05_UNIQUE_LINES',p=>{p.lines.push({...p.lines[0]})}],
 ['FCHK_06_UNIQUE_LOADS',p=>{p.loads.push({...p.loads[0]})}],
 ['FCHK_07_LOAD_CIRCUITS',p=>{p.loads[0].circuitId='MISSING'}],
 ['FCHK_08_SIGNAL_LIST',p=>{delete p.fireControlV1.signals}],
 ['FCHK_09_ACTION_LIST',p=>{delete p.fireControlV1.actions}],
 ['FCHK_10_ASSIGNMENTS_LIST',p=>{p.fireControlV1.design.assignments={}}],
 ['FCHK_11_SIGNAL_IDENTIFIERS',p=>{p.fireControlV1.signals[0].id='bad id'}],
 ['FCHK_12_UNIQUE_SIGNALS',p=>{p.fireControlV1.signals[1].id='S1'}],
 ['FCHK_13_SIGNAL_KINDS',p=>{p.fireControlV1.signals[0].kind='OTHER'}],
 ['FCHK_14_SIGNAL_ZONES',p=>{p.fireControlV1.signals[0].zoneId='bad id'}],
 ['FCHK_15_CONTACT_TYPES',p=>{p.fireControlV1.signals[0].contactType='SPDT'}],
 ['FCHK_17_SIGNAL_USED',p=>{p.fireControlV1.actions=p.fireControlV1.actions.slice(0,2)}],
 ['FCHK_18_FIRE_SIGNAL',p=>{p.fireControlV1.signals[0].kind='FAULT'}],
 ['FCHK_19_POWER_LOSS_SIGNAL',p=>{p.fireControlV1.signals[1].kind='FAULT'}],
 ['FCHK_20_RESET_SIGNAL',p=>{p.fireControlV1.signals[2].kind='FAULT'}],
 ['FCHK_21_ACTION_IDS',p=>{p.fireControlV1.actions[0].id='bad id'}],
 ['FCHK_22_UNIQUE_ACTIONS',p=>{p.fireControlV1.actions[1].id='X1'}],
 ['FCHK_24_ACTION_LOADS',p=>{p.fireControlV1.actions[0].loadId='MISSING'}],
 ['FCHK_25_ACTION_SIGNALS',p=>{p.fireControlV1.actions[0].signalId='MISSING'}],
 ['FCHK_26_COMMANDS',p=>{p.fireControlV1.actions[0].action='INVALID'}],
 ['FCHK_27_ACTUATORS',p=>{p.fireControlV1.actions[0].actuator='INVALID'}],
 ['FCHK_28_LOSS_STATES',p=>{p.fireControlV1.actions[0].onSignalLoss='INVALID'}],
 ['FCHK_29_LOSS_STATES_EXPLICIT',p=>{p.fireControlV1.actions[0].onSignalLoss='UNSPECIFIED'}],
 ['FCHK_30_SHUNT_UVR_NOT_ENABLE',p=>{p.fireControlV1.actions[0].actuator='SHUNT_TRIP';p.fireControlV1.actions[0].action='ENABLE'}],
 ['FCHK_31_ASSIGNMENT_IDS',p=>{p.fireControlV1.design.assignments[0].actionId='bad id'}],
 ['FCHK_32_UNIQUE_ASSIGNMENTS',p=>{p.fireControlV1.design.assignments[1].actionId='X1'}],
 ['FCHK_33_ASSIGNMENT_LINKS',p=>{p.fireControlV1.design.assignments[0].actionId='ORPHAN'}],
 ['FCHK_34_ASSIGNMENT_COVERAGE',p=>{p.fireControlV1.design.assignments.pop()}],
 ['FCHK_35_DEVICE_IDENTIFIERS',p=>{delete p.fireControlV1.design.assignments[0].deviceId}],
 ['FCHK_36_DEVICE_UNIQUENESS',p=>{p.fireControlV1.design.assignments[1].deviceId='K1'}],
 ['FCHK_37_SKU_DECLARED',p=>{delete p.fireControlV1.design.assignments[0].articleSku}],
 ['FCHK_38_COIL_VOLTAGE',p=>{p.fireControlV1.design.assignments[0].controlVoltageV=0}],
 ['FCHK_39_SUPPLY_REFERENCES',p=>{delete p.fireControlV1.design.assignments[0].controlSupplyId}],
 ['FCHK_40_ENGINEER_REVIEW',p=>{p.fireControlV1.design.assignments[0].reviewed=false}],
 ['FCHK_41_TERMINALS_DECLARED',p=>{p.fireControlV1.design.assignments[0].terminalIds=[]}],
 ['FCHK_42_TERMINALS_VALID',p=>{p.fireControlV1.design.assignments[0].terminalIds=['bad id']}],
 ['FCHK_43_TERMINALS_UNIQUE',p=>{p.fireControlV1.design.assignments[1].terminalIds=['T1']}],
 ['FCHK_44_WIRE_REFERENCES',p=>{delete p.fireControlV1.design.assignments[0].wireReference}],
 ['FCHK_45_DIN_RAILS',p=>{delete p.fireControlV1.design.assignments[0].dinRailId}],
 ['FCHK_46_DIN_START',p=>{p.fireControlV1.design.assignments[0].dinStartModule=0}],
 ['FCHK_47_DIN_WIDTH',p=>{p.fireControlV1.design.assignments[0].moduleWidth=0}],
 ['FCHK_48_DIN_CAPACITY',p=>{delete p.railCapacity}],
 ['FCHK_49_FULL_BOARD_LAYOUT',p=>{delete p.dinPlacementsV1}]
];
for(const [code,mutate] of mutations)test('reject missing or inconsistent evidence '+code,()=>{
 const p=project();mutate(p);
 assert.notEqual(check(p,code)?.status,'PASS',code+' must detect mutation');
});

test('signal volume above 200 is blocked by criterion 16',()=>{
 const p=project();p.fireControlV1.signals=Array.from({length:201},(_,i)=>({...p.fireControlV1.signals[0],id:'S'+i}));
 assert.equal(check(p,'FCHK_16_SIGNAL_LIMIT').status,'BLOCKED');
});
test('action volume above 800 is blocked by criterion 23',()=>{
 const p=project();p.fireControlV1.actions=Array.from({length:801},(_,i)=>({...p.fireControlV1.actions[0],id:'X'+i}));
 assert.equal(check(p,'FCHK_23_ACTION_LIMIT').status,'BLOCKED');
});
test('pin-level terminal mapping remains explicitly unresolved',()=>{
 const p=project();assert.equal(check(p,'FCHK_50_TERMINAL_PIN_MAPPING').status,'REVIEW_REQUIRED');
});
test('missing project arrays produce blocked checklist without throwing',()=>{
 const p=project();delete p.lines;delete p.loads;
 const r=epFireControlChecklistV1(p);assert.equal(r.status,'BLOCKED');
});
test('no configured fire interface has no fabricated checklist',()=>{
 const r=epFireControlChecklistV1({lines:[],loads:[]});assert.equal(r.status,'NOT_CONFIGURED');assert.equal(r.checks.length,0);
});

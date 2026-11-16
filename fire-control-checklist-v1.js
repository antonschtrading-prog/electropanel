'use strict';
// Fifty independent, traceable review criteria for the panel's EXTERNAL fire interface.
// They are engineering evidence requirements, not an automatic compliance certificate.
function epFireControlChecklistV1(project){
 const raw=project?.fireControlV1;
 if(!raw)return {schema:'electropanel.fire.checklist.1',status:'NOT_CONFIGURED',checks:[],issues:[],engineeringApproved:false};
 const lines=Array.isArray(project.lines)?project.lines:[],loadsList=Array.isArray(project.loads)?project.loads:[];
 const signals=Array.isArray(raw.signals)?raw.signals:[],actions=Array.isArray(raw.actions)?raw.actions:[],
  assignments=Array.isArray(raw.design?.assignments)?raw.design.assignments:[];
 const loads=new Map(loadsList.filter(x=>x&&typeof x.id==='string').map(x=>[x.id,x]));
 const lineMap=new Map(lines.filter(x=>x&&typeof x.id==='string').map(x=>[x.id,x]));
 const signalMap=new Map(signals.filter(x=>x&&typeof x.id==='string').map(x=>[x.id,x]));
 const assignmentMap=new Map(assignments.filter(x=>x&&typeof x.actionId==='string').map(x=>[x.actionId,x]));
 const checks=[],issues=[];
 const add=(code,level,scope,id,ok,detail)=>{
  const status=ok?'PASS':level==='BLOCKED'?'BLOCKED':'REVIEW_REQUIRED';
  checks.push({code,scope,objectId:id??null,status,detail});
  if(!ok)issues.push({code,level,objectId:id??null,scope,detail});
 };
 const unique=a=>new Set(a).size===a.length;
 const idOk=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(x);
 const nonempty=x=>typeof x==='string'&&x.trim().length>0;
 // Project identity and cross-section integrity (10).
 add('FCHK_01_PROJECT_LINES','BLOCKED','PROJECT',null,Array.isArray(project.lines),'Circuit list required');
 add('FCHK_02_PROJECT_LOADS','BLOCKED','PROJECT',null,Array.isArray(project.loads),'Consumer list required');
 add('FCHK_03_LINE_IDS','BLOCKED','PROJECT',null,lines.every(x=>idOk(x?.id)),'Circuit IDs valid');
 add('FCHK_04_LOAD_IDS','BLOCKED','PROJECT',null,loadsList.every(x=>idOk(x?.id)),'Consumer IDs valid');
 add('FCHK_05_UNIQUE_LINES','BLOCKED','PROJECT',null,unique(lines.map(x=>x?.id)),'Unique circuits');
 add('FCHK_06_UNIQUE_LOADS','BLOCKED','PROJECT',null,unique(loadsList.map(x=>x?.id)),'Unique consumers');
 add('FCHK_07_LOAD_CIRCUITS','BLOCKED','PROJECT',null,loadsList.every(x=>lineMap.has(x?.circuitId)),'Consumers assigned to circuits');
 add('FCHK_08_SIGNAL_LIST','BLOCKED','PROJECT',null,Array.isArray(raw.signals),'Signal list present');
 add('FCHK_09_ACTION_LIST','BLOCKED','PROJECT',null,Array.isArray(raw.actions),'Action list present');
 add('FCHK_10_ASSIGNMENTS_LIST','BLOCKED','PROJECT',null,raw.design===undefined||Array.isArray(raw.design?.assignments),'Design assignment list valid');
 // External signals: definition and terminal interpretation (10).
 add('FCHK_11_SIGNAL_IDENTIFIERS','BLOCKED','SIGNALS',null,signals.every(x=>idOk(x?.id)),'Signal IDs valid');
 add('FCHK_12_UNIQUE_SIGNALS','BLOCKED','SIGNALS',null,unique(signals.map(x=>x?.id)),'No duplicate signal IDs');
 add('FCHK_13_SIGNAL_KINDS','BLOCKED','SIGNALS',null,signals.every(x=>['FIRE','FAULT','CONTROL_POWER_LOSS','RESET'].includes(x?.kind)),'Recognised signal types');
 add('FCHK_14_SIGNAL_ZONES','BLOCKED','SIGNALS',null,signals.every(x=>idOk(x?.zoneId)),'External zone references');
 add('FCHK_15_CONTACT_TYPES','BLOCKED','SIGNALS',null,signals.every(x=>['NO','NC'].includes(x?.contactType)),'Dry-contact types declared');
 add('FCHK_16_SIGNAL_LIMIT','BLOCKED','SIGNALS',null,signals.length<=200,'Signal limit');
 add('FCHK_17_SIGNAL_USED','UNKNOWN','SIGNALS',null,signals.every(s=>actions.some(a=>a?.signalId===s?.id)),'Unused signals require review');
 add('FCHK_18_FIRE_SIGNAL','UNKNOWN','SIGNALS',null,signals.some(s=>s?.kind==='FIRE'),'Fire trigger declared');
 add('FCHK_19_POWER_LOSS_SIGNAL','UNKNOWN','SIGNALS',null,signals.some(s=>s?.kind==='CONTROL_POWER_LOSS'),'Power loss input reviewed');
 add('FCHK_20_RESET_SIGNAL','UNKNOWN','SIGNALS',null,signals.some(s=>s?.kind==='RESET'),'Reset interface reviewed');
 // Action identity, load linkage and fail behaviour (10).
 add('FCHK_21_ACTION_IDS','BLOCKED','ACTIONS',null,actions.every(x=>idOk(x?.id)),'Action IDs valid');
 add('FCHK_22_UNIQUE_ACTIONS','BLOCKED','ACTIONS',null,unique(actions.map(x=>x?.id)),'Unique action IDs');
 add('FCHK_23_ACTION_LIMIT','BLOCKED','ACTIONS',null,actions.length<=800,'Action limit');
 add('FCHK_24_ACTION_LOADS','BLOCKED','ACTIONS',null,actions.every(x=>loads.has(x?.loadId)),'Action consumer references');
 add('FCHK_25_ACTION_SIGNALS','BLOCKED','ACTIONS',null,actions.every(x=>signalMap.has(x?.signalId)),'Action signal references');
 add('FCHK_26_COMMANDS','BLOCKED','ACTIONS',null,actions.every(x=>['DISCONNECT','ENABLE','MAINTAIN','EXTERNAL_CONTROL'].includes(x?.action)),'Recognised commands');
 add('FCHK_27_ACTUATORS','BLOCKED','ACTIONS',null,actions.every(x=>['CONTACTOR','SHUNT_TRIP','UNDERVOLTAGE_RELEASE','INTERFACE_RELAY','EXTERNAL'].includes(x?.actuator)),'Recognised actuators');
 add('FCHK_28_LOSS_STATES','BLOCKED','ACTIONS',null,actions.every(x=>['ENERGIZED','DEENERGIZED','UNSPECIFIED'].includes(x?.onSignalLoss)),'Loss state schema');
 add('FCHK_29_LOSS_STATES_EXPLICIT','UNKNOWN','ACTIONS',null,actions.every(x=>x?.onSignalLoss!=='UNSPECIFIED'),'Loss state selected');
 add('FCHK_30_SHUNT_UVR_NOT_ENABLE','BLOCKED','ACTIONS',null,actions.every(x=>x?.action!=='ENABLE'||!['SHUNT_TRIP','UNDERVOLTAGE_RELEASE'].includes(x?.actuator)),'Release cannot directly enable load');
 // Declared actuator evidence (10).
 add('FCHK_31_ASSIGNMENT_IDS','BLOCKED','DESIGN',null,assignments.every(x=>idOk(x?.actionId)),'Assignment action IDs');
 add('FCHK_32_UNIQUE_ASSIGNMENTS','BLOCKED','DESIGN',null,unique(assignments.map(x=>x?.actionId)),'Unique assignments');
 add('FCHK_33_ASSIGNMENT_LINKS','BLOCKED','DESIGN',null,assignments.every(x=>actions.some(a=>a?.id===x?.actionId)),'Assignments link to actions');
 add('FCHK_34_ASSIGNMENT_COVERAGE','UNKNOWN','DESIGN',null,actions.every(a=>assignmentMap.has(a?.id)),'All actions assigned devices');
 add('FCHK_35_DEVICE_IDENTIFIERS','UNKNOWN','DESIGN',null,actions.every(a=>idOk(assignmentMap.get(a?.id)?.deviceId)),'Device IDs declared');
 add('FCHK_36_DEVICE_UNIQUENESS','BLOCKED','DESIGN',null,unique(assignments.filter(x=>x?.deviceId).map(x=>x.deviceId)),'Device IDs unique');
 add('FCHK_37_SKU_DECLARED','UNKNOWN','DESIGN',null,actions.every(a=>idOk(assignmentMap.get(a?.id)?.articleSku)),'Manufacturer articles selected');
 add('FCHK_38_COIL_VOLTAGE','UNKNOWN','DESIGN',null,actions.every(a=>Number.isFinite(assignmentMap.get(a?.id)?.controlVoltageV)&&assignmentMap.get(a.id).controlVoltageV>0),'Control voltage declared');
 add('FCHK_39_SUPPLY_REFERENCES','UNKNOWN','DESIGN',null,actions.every(a=>idOk(assignmentMap.get(a?.id)?.controlSupplyId)),'Control supply declared');
 add('FCHK_40_ENGINEER_REVIEW','UNKNOWN','DESIGN',null,actions.every(a=>assignmentMap.get(a?.id)?.reviewed===true),'Assignments reviewed');
 // Physical interface, terminal mapping, layout and handoff (10).
 add('FCHK_41_TERMINALS_DECLARED','UNKNOWN','WIRING',null,actions.every(a=>Array.isArray(assignmentMap.get(a?.id)?.terminalIds)&&assignmentMap.get(a.id).terminalIds.length>0),'Terminal references declared');
 add('FCHK_42_TERMINALS_VALID','BLOCKED','WIRING',null,assignments.every(x=>x?.terminalIds===undefined||Array.isArray(x.terminalIds)&&x.terminalIds.every(idOk)),'Terminal IDs valid');
 add('FCHK_43_TERMINALS_UNIQUE','BLOCKED','WIRING',null,unique(assignments.flatMap(x=>Array.isArray(x?.terminalIds)?x.terminalIds:[])),'No terminal reuse');
 add('FCHK_44_WIRE_REFERENCES','UNKNOWN','WIRING',null,actions.every(a=>idOk(assignmentMap.get(a?.id)?.wireReference)),'Wire references declared');
 add('FCHK_45_DIN_RAILS','UNKNOWN','LAYOUT',null,actions.every(a=>idOk(assignmentMap.get(a?.id)?.dinRailId)),'DIN rails selected');
 add('FCHK_46_DIN_START','UNKNOWN','LAYOUT',null,actions.every(a=>Number.isInteger(assignmentMap.get(a?.id)?.dinStartModule)&&assignmentMap.get(a.id).dinStartModule>0),'DIN starts selected');
 add('FCHK_47_DIN_WIDTH','UNKNOWN','LAYOUT',null,actions.every(a=>Number.isInteger(assignmentMap.get(a?.id)?.moduleWidth)&&assignmentMap.get(a.id).moduleWidth>0),'DIN widths declared');
 add('FCHK_48_DIN_CAPACITY','UNKNOWN','LAYOUT',null,Number.isInteger(project.railCapacity)&&project.railCapacity>0,'DIN rail capacity declared');
 add('FCHK_49_FULL_BOARD_LAYOUT','UNKNOWN','LAYOUT',null,Array.isArray(project.dinPlacementsV1),'Other devices represented for collision review');
 add('FCHK_50_TERMINAL_PIN_MAPPING','UNKNOWN','WIRING',null,actions.length>0&&actions.every(a=>{const e=assignmentMap.get(a?.id);return Array.isArray(e?.pins)&&e.pins.length>0&&e.pins.every(p=>p&&idOk(p.terminalId)&&idOk(p.devicePin)&&typeof p.verifiedSource==='string'&&p.verifiedSource.startsWith('https://')&&Array.isArray(e.terminalIds)&&e.terminalIds.includes(p.terminalId));}),'Engineer-declared terminal-to-device pin mapping with manufacturer evidence URL');
 return {schema:'electropanel.fire.checklist.1',status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'REVIEW_REQUIRED',
  checks,issues,passed:checks.filter(x=>x.status==='PASS').length,total:checks.length,
  engineeringApproved:false,ready_for_installation:false};
}
if(typeof module!=='undefined')module.exports={epFireControlChecklistV1};

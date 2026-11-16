'use strict';
// Explicit engineer-supplied interface design; never assume an actuator article or cable route.
function epFireControlDesignV1(project){
 const raw=project?.fireControlV1;
 if(!raw)return {schema:'electropanel.fire.design.1',status:'NOT_CONFIGURED',rows:[],issues:[],engineeringApproved:false};
 const audit=epFireControlAuditV1(project,raw),issues=[...audit.issues],rows=[];
 const objects=raw.design===undefined?{assignments:[]}:raw.design;
 const assignments=Array.isArray(objects?.assignments)?objects.assignments:[];
 const ids=new Set(),actionIds=new Set(audit.rows.map(a=>a.id));
 const knownRailIds=new Set(Array.from({length:Number.isInteger(project.railCount)?project.railCount:0},(_,i)=>'R'+(i+1)));
 const validId=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(x);
 if(!objects||typeof objects!=='object'||Array.isArray(objects)||
  Object.keys(objects).some(k=>k!=='assignments')||!Array.isArray(objects.assignments)||
  assignments.length>800)issues.push({code:'FIRE_DESIGN_INPUT_INVALID',level:'BLOCKED'});
 for(const entry of assignments){
  if(!entry||typeof entry!=='object'||Array.isArray(entry)||
   Object.keys(entry).some(k=>!['actionId','deviceId','articleSku','controlVoltageV','controlSupplyId','terminalIds','dinRailId','dinStartModule','moduleWidth','wireReference','reviewed','pins'].includes(k))||
   !validId(entry.actionId)||ids.has(entry.actionId)||!actionIds.has(entry.actionId)){
   issues.push({code:'FIRE_DESIGN_ASSIGNMENT_INVALID',level:'BLOCKED',objectId:entry?.actionId??null});continue;
  }
  ids.add(entry.actionId);
  if(entry.deviceId!==undefined&&!validId(entry.deviceId))issues.push({code:'FIRE_DESIGN_DEVICE_ID_INVALID',level:'BLOCKED',objectId:entry.actionId});
  if(entry.articleSku!==undefined&&(!validId(entry.articleSku)||entry.articleSku.length>80))issues.push({code:'FIRE_DESIGN_ARTICLE_INVALID',level:'BLOCKED',objectId:entry.actionId});
  if(entry.controlVoltageV!==undefined&&(!Number.isFinite(entry.controlVoltageV)||entry.controlVoltageV<=0||entry.controlVoltageV>1000))issues.push({code:'FIRE_DESIGN_VOLTAGE_INVALID',level:'BLOCKED',objectId:entry.actionId});
  if(entry.controlSupplyId!==undefined&&!validId(entry.controlSupplyId))issues.push({code:'FIRE_DESIGN_SUPPLY_INVALID',level:'BLOCKED',objectId:entry.actionId});
  if(entry.terminalIds!==undefined&&(!Array.isArray(entry.terminalIds)||entry.terminalIds.length<1||entry.terminalIds.length>16||entry.terminalIds.some(x=>!validId(x))||new Set(entry.terminalIds).size!==entry.terminalIds.length))
   issues.push({code:'FIRE_DESIGN_TERMINALS_INVALID',level:'BLOCKED',objectId:entry.actionId});
  if(entry.dinRailId!==undefined&&!validId(entry.dinRailId))issues.push({code:'FIRE_DESIGN_DIN_RAIL_INVALID',level:'BLOCKED',objectId:entry.actionId});
  if(entry.dinRailId!==undefined&&knownRailIds.size&&!knownRailIds.has(entry.dinRailId))issues.push({code:'FIRE_DESIGN_DIN_RAIL_UNKNOWN',level:'UNKNOWN',objectId:entry.actionId});
  if(entry.dinStartModule!==undefined&&(!Number.isInteger(entry.dinStartModule)||entry.dinStartModule<1||entry.dinStartModule>1000))issues.push({code:'FIRE_DESIGN_DIN_START_INVALID',level:'BLOCKED',objectId:entry.actionId});
  if(entry.moduleWidth!==undefined&&(!Number.isInteger(entry.moduleWidth)||entry.moduleWidth<1||entry.moduleWidth>24))issues.push({code:'FIRE_DESIGN_MODULE_WIDTH_INVALID',level:'BLOCKED',objectId:entry.actionId});
  if(entry.wireReference!==undefined&&(!validId(entry.wireReference)||entry.wireReference.length>80))issues.push({code:'FIRE_DESIGN_WIRE_REFERENCE_INVALID',level:'BLOCKED',objectId:entry.actionId});
  if(entry.reviewed!==undefined&&typeof entry.reviewed!=='boolean')issues.push({code:'FIRE_DESIGN_REVIEW_INVALID',level:'BLOCKED',objectId:entry.actionId});
  if(entry.pins!==undefined){
   if(!Array.isArray(entry.pins)||entry.pins.length>32||entry.pins.some(p=>!p||typeof p!=='object'||Array.isArray(p)||
    Object.keys(p).some(k=>!['terminalId','devicePin','role','verifiedSource'].includes(k))||
    !validId(p.terminalId)||!validId(p.devicePin)||!['COIL_A1','COIL_A2','COMMON','NO','NC','TRIP','RETURN','OTHER'].includes(p.role)||
    typeof p.verifiedSource!=='string'||!/^https:\/\//.test(p.verifiedSource)||p.verifiedSource.length>500)){
    issues.push({code:'FIRE_DESIGN_PIN_MAPPING_INVALID',level:'BLOCKED',objectId:entry.actionId});
   }else{
    if(new Set(entry.pins.map(p=>p.terminalId)).size!==entry.pins.length)
     issues.push({code:'FIRE_DESIGN_PIN_TERMINAL_REUSED',level:'BLOCKED',objectId:entry.actionId});
    if(new Set(entry.pins.map(p=>p.devicePin)).size!==entry.pins.length)
     issues.push({code:'FIRE_DESIGN_DEVICE_PIN_REUSED',level:'BLOCKED',objectId:entry.actionId});
    if(Array.isArray(entry.terminalIds)&&entry.pins.some(p=>!entry.terminalIds.includes(p.terminalId)))
     issues.push({code:'FIRE_DESIGN_PIN_TERMINAL_UNDECLARED',level:'BLOCKED',objectId:entry.actionId});
   }
  }

 }
 const deviceIds=new Set(),positions=new Map();

 for(const action of audit.rows){
  const entry=assignments.find(x=>x?.actionId===action.id)||{};
  const id=action.id;
  const required=['deviceId','articleSku','controlVoltageV','controlSupplyId','terminalIds','dinRailId','dinStartModule','moduleWidth','wireReference'];
  for(const key of required)if(entry[key]===undefined)issues.push({code:'FIRE_DESIGN_'+key.toUpperCase()+'_MISSING',level:'UNKNOWN',objectId:id});
  if(entry.reviewed!==true)issues.push({code:'FIRE_DESIGN_ENGINEER_REVIEW_REQUIRED',level:'UNKNOWN',objectId:id});
  if(entry.deviceId){
   if(deviceIds.has(entry.deviceId))issues.push({code:'FIRE_DESIGN_DUPLICATE_DEVICE_ID',level:'BLOCKED',objectId:id});
   deviceIds.add(entry.deviceId);
  }
  if(entry.dinRailId&&Number.isInteger(entry.dinStartModule)&&Number.isInteger(entry.moduleWidth)&&entry.moduleWidth>0){
   for(let n=entry.dinStartModule;n<entry.dinStartModule+entry.moduleWidth;n++){
    const key=entry.dinRailId+':'+n;
    if(positions.has(key))issues.push({code:'FIRE_DESIGN_DIN_COLLISION',level:'BLOCKED',objectId:id});
    positions.set(key,id);
   }
   if(Number.isInteger(project.railCapacity)&&entry.dinStartModule+entry.moduleWidth-1>project.railCapacity)
    issues.push({code:'FIRE_DESIGN_DIN_CAPACITY_EXCEEDED',level:'BLOCKED',objectId:id});
  }
  rows.push({actionId:id,loadId:action.loadId,signalId:action.signalId,action:action.action,actuator:action.actuator,
   deviceId:entry.deviceId??null,articleSku:entry.articleSku??null,controlVoltageV:entry.controlVoltageV??null,
   controlSupplyId:entry.controlSupplyId??null,terminalIds:entry.terminalIds??[],
   dinRailId:entry.dinRailId??null,dinStartModule:entry.dinStartModule??null,moduleWidth:entry.moduleWidth??null,
   wireReference:entry.wireReference??null,pins:entry.pins??[],reviewed:entry.reviewed===true});
 }
 return {schema:'electropanel.fire.design.1',status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN',
  rows,issues,engineeringApproved:false,ready_for_installation:false};
}
if(typeof module!=='undefined')module.exports={epFireControlDesignV1};

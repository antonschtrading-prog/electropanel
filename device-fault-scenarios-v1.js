'use strict';
// Explicit short-circuit study at a *particular* protective-device location.
// This module cannot certify breaking capacity, selectivity or installation.
function epDeviceFaultNodeV1(project,id){
 if(typeof id!=='string'||!/^(INCOMING|BRANCH):[A-Za-z0-9_-]{1,80}$/.test(id))
  throw Error('DEVICE_FAULT_NODE_INVALID');
 const parts=id.split(':'),device=parts[0]==='INCOMING'?
  project?.deviceSupplyV1?.incomingDevices?.find(x=>x.id===parts[1]):
  project?.branchDevices?.find(x=>x.id===parts[1]);
 if(!device)throw Error('DEVICE_FAULT_NODE_MISSING');
 const line=parts[0]==='BRANCH'?project?.lines?.find(x=>x.id===device.circuitId):null;
 if(parts[0]==='BRANCH'&&!line)throw Error('DEVICE_FAULT_CIRCUIT_MISSING');
 const sku=parts[0]==='INCOMING'?device.catalogSku??null:line.catalogSku??null;
 return {sku,kind:parts[0],lineId:line?.id??null};
}
function epDeviceFaultSupplyFingerprintV1(project,id){
 if(typeof epDeviceSupplyValidateV1!=='function')
  throw Error('DEVICE_FAULT_TOPOLOGY_MODULE_MISSING');
 const model=epDeviceSupplyValidateV1(project,project.deviceSupplyV1);
 const parent=new Map(model.links.map(x=>[x.to,x]));
 const path=[],visited=new Set();let cursor=id;
 while(cursor!=='SOURCE:MAIN'){
  if(visited.has(cursor))throw Error('DEVICE_FAULT_SUPPLY_CYCLE');
  visited.add(cursor);
  const link=parent.get(cursor);
  if(!link)throw Error('DEVICE_FAULT_SUPPLY_PATH_INCOMPLETE');
  path.push([link.from,link.to,[...link.conductors].sort()]);
  cursor=link.from;
 }
 return JSON.stringify(path);
}
function epDeviceFaultScenarioV1(project,record){
 const fail=code=>{throw Error('DEVICE_FAULT_'+code);};
 if(!record||typeof record!=='object'||Array.isArray(record)||
  Object.keys(record).some(x=>!['deviceNodeId','ikMaxKa','voltageV','sourceDocument',
   'sourceRevision','supplyFingerprint','articleSkuSnapshot'].includes(x)))fail('INVALID_ENTRY');
 const id=record.deviceNodeId;
 epDeviceFaultNodeV1(project,id);
 const n=v=>typeof v==='number'&&Number.isFinite(v)&&v>0;
 if(!n(record.ikMaxKa)||record.ikMaxKa>1000||
  !n(record.voltageV)||record.voltageV>1500)fail('SCENARIO_VALUES_INVALID');
 if(typeof record.sourceDocument!=='string'||!record.sourceDocument.trim()||
  record.sourceDocument.length>250||
  typeof record.sourceRevision!=='string'||!record.sourceRevision.trim()||
  record.sourceRevision.length>100)fail('SOURCE_INCOMPLETE');
 if(typeof record.supplyFingerprint!=='string'||record.supplyFingerprint.length>50000||
  !(record.articleSkuSnapshot===null||
    typeof record.articleSkuSnapshot==='string'&&record.articleSkuSnapshot.length<=100))
  fail('SNAPSHOT_INVALID');
 return {deviceNodeId:id,ikMaxKa:record.ikMaxKa,voltageV:record.voltageV,
  sourceDocument:record.sourceDocument,sourceRevision:record.sourceRevision,
  supplyFingerprint:record.supplyFingerprint,articleSkuSnapshot:record.articleSkuSnapshot};
}
function epDeviceFaultNormalizeV1(project,records){
 if(!Array.isArray(records)||records.length>450)throw Error('DEVICE_FAULT_LIST_INVALID');
 const ids=new Set();
 return records.map(r=>{
  const value=epDeviceFaultScenarioV1(project,r);
  if(ids.has(value.deviceNodeId))throw Error('DEVICE_FAULT_SCENARIO_DUPLICATED');
  ids.add(value.deviceNodeId);return value;
 });
}
function epDeviceFaultDeclareV1(project,id,ikMaxKa,voltageV,sourceDocument,sourceRevision){
 const node=epDeviceFaultNodeV1(project,id);
 const scenario=epDeviceFaultScenarioV1(project,{
  deviceNodeId:id,ikMaxKa,voltageV,sourceDocument,sourceRevision,
  supplyFingerprint:epDeviceFaultSupplyFingerprintV1(project,id),
  articleSkuSnapshot:node.sku});
 const old=epDeviceFaultNormalizeV1(project,project.deviceFaultScenariosV1??[]);
 return [...old.filter(x=>x.deviceNodeId!==id),scenario];
}
function epDeviceFaultClearV1(project,id){
 return epDeviceFaultNormalizeV1(project,project.deviceFaultScenariosV1??[])
  .filter(x=>x.deviceNodeId!==id);
}
function epDeviceFaultAuditV1(project,lookup){
 const issues=[],rows=[],add=(code,level='UNKNOWN',detail={})=>issues.push({code,level,...detail});
 const finish=()=>({schema:'electropanel.device.fault.scenarios.1',status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN',
  rows,issues,engineeringApproved:false,ready_for_installation:false,
  selectivityStatus:'NOT_ASSESSED',scenarioProvenance:'DECLARED_NOT_INDEPENDENTLY_VERIFIED'});
 if(!project?.deviceSupplyV1){
  add('DEVICE_FAULT_TOPOLOGY_UNDECLARED');return finish();
 }
 let scenarios;
 try{scenarios=epDeviceFaultNormalizeV1(project,project.deviceFaultScenariosV1??[]);}
 catch(e){add(e.message,'BLOCKED');return finish();}
 for(const r of scenarios){
  const rowIssues=[],mark=(code,level='UNKNOWN')=>{
   const issue={code,level,objectId:r.deviceNodeId};
   rowIssues.push(issue);issues.push(issue);
  };
  let node=null,actualFingerprint=null;
  try{node=epDeviceFaultNodeV1(project,r.deviceNodeId);
   actualFingerprint=epDeviceFaultSupplyFingerprintV1(project,r.deviceNodeId);
  }catch(_){mark('DEVICE_FAULT_TOPOLOGY_STALE','BLOCKED');}
  if(actualFingerprint!==r.supplyFingerprint)
   mark('DEVICE_FAULT_SUPPLY_PATH_CHANGED','BLOCKED');
  if(node&&node.sku!==r.articleSkuSnapshot)
   mark('DEVICE_FAULT_SELECTED_ARTICLE_CHANGED','BLOCKED');
  let article=null;
  if(!node?.sku)mark('DEVICE_FAULT_ARTICLE_MISSING');
  else if(typeof lookup!=='function')mark('DEVICE_FAULT_CATALOGUE_MISSING');
  else try{article=lookup(node.sku)||null;}catch(_){mark('DEVICE_FAULT_CATALOGUE_LOOKUP_FAILED','BLOCKED');}
  if(node?.sku&&!article&&typeof lookup==='function')
   mark('DEVICE_FAULT_ARTICLE_NOT_FOUND','BLOCKED');
  if(article&&!['MCB','RCBO'].includes(article.kind))
   mark('DEVICE_FAULT_ARTICLE_KIND_UNSUPPORTED','BLOCKED');
  const positive=v=>typeof v==='number'&&Number.isFinite(v)&&v>0;
  const icnKa=positive(article?.icnKa)?article.icnKa:null;
  const ratingVoltage=positive(article?.icnVoltageV)?article.icnVoltageV:null;
  if(article?.verificationStatus!=='VERIFIED')
   mark('DEVICE_FAULT_MANUFACTURER_FACTS_UNVERIFIED');
  if(!icnKa)mark('DEVICE_FAULT_ICN_UNDECLARED');
  if(!ratingVoltage||ratingVoltage!==r.voltageV)
   mark('DEVICE_FAULT_ICN_VOLTAGE_APPLICABILITY_UNPROVEN');
  if(!article?.icnStandard||typeof article.icnStandard!=='string')
   mark('DEVICE_FAULT_ICN_STANDARD_UNDECLARED');
  const comparable=icnKa!==null&&ratingVoltage===r.voltageV&&
   ['MCB','RCBO'].includes(article?.kind)&&
   article?.verificationStatus==='VERIFIED'&&
   typeof article?.icnStandard==='string'&&!!article.icnStandard;
  const numericalComparison=!comparable?'NOT_ASSESSED':
   r.ikMaxKa>icnKa?'DECLARED_IK_EXCEEDS_ICN':'PRELIMINARY_NUMERIC_WITHIN_ICN';
  if(numericalComparison==='DECLARED_IK_EXCEEDS_ICN')
   mark('DEVICE_FAULT_DECLARED_IK_EXCEEDS_ICN','BLOCKED');
  mark('DEVICE_FAULT_LOCATION_STUDY_REQUIRES_INDEPENDENT_REVIEW');
  rows.push({deviceNodeId:r.deviceNodeId,ikMaxKa:r.ikMaxKa,voltageV:r.voltageV,
   icnKa,icnVoltageV:ratingVoltage,sku:node?.sku??null,
   sourceDocument:r.sourceDocument,sourceRevision:r.sourceRevision,
   supplyPathStale:actualFingerprint!==r.supplyFingerprint,
   articleStale:node?node.sku!==r.articleSkuSnapshot:true,
   numericalComparison,issues:rowIssues,
   status:rowIssues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN'});
 }
 const supported=[...(project.deviceSupplyV1.incomingDevices||[]).map(x=>'INCOMING:'+x.id),
   ...(project.branchDevices||[]).map(x=>'BRANCH:'+x.id)];
 const declared=new Set(scenarios.map(x=>x.deviceNodeId));
 for(const id of supported)if(!declared.has(id))
  add('DEVICE_FAULT_LOCATION_STUDY_MISSING','UNKNOWN',{objectId:id});
 return finish();
}
function epDeviceFaultHtmlV1(project,lookup){
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const nodes=[...(project.deviceSupplyV1?.incomingDevices||[]).map(x=>['INCOMING:'+x.id,x.label]),
 ...(project.branchDevices||[]).map(x=>['BRANCH:'+x.id,x.circuitId])];
 const options=nodes.map(([id,label])=>'<option value="'+esc(id)+'">'+esc(id+' · '+label)+'</option>').join('');
 const r=epDeviceFaultAuditV1(project,lookup);
 const table=r.rows.map(x=>'<tr><td>'+esc(x.deviceNodeId)+'</td><td>'+
  esc(x.ikMaxKa)+'</td><td>'+esc(x.voltageV)+'</td><td>'+
  esc(x.icnKa??'—')+'</td><td>'+esc(x.numericalComparison)+'</td><td>'+
  '<button type="button" class="btn tiny" data-device-fault-clear="'+esc(x.deviceNodeId)+'">Удалить</button></td></tr>').join('');
 return '<details class="ep-device-fault"><summary>Ток КЗ в точке аппарата · '+esc(r.status)+
  '</summary><p class="muted">Только расчётный Ik,max для конкретной позиции устройства и указанной редакции исследования. Без подтверждённых паспортов и применимости источников — не допуск.</p>'+
  '<div class="form-grid"><label>Аппарат<select id="deviceFaultNode">'+options+'</select></label>'+
  '<label>Ik,max, кА<input id="deviceFaultIk" inputmode="decimal" placeholder="6.0"></label>'+
  '<label>Напряжение в точке, В<input id="deviceFaultVoltage" inputmode="decimal" placeholder="230"></label>'+
  '<label>Источник расчёта<input id="deviceFaultSource" maxlength="250" placeholder="Расчёт сети / документ"></label>'+
  '<label>Редакция расчёта<input id="deviceFaultRevision" maxlength="100" placeholder="rev 1"></label></div>'+
  '<button class="btn" type="button" id="deviceFaultSave">Сохранить исследование точки</button>'+
  '<div class="table-scroll"><table><thead><tr><th>Аппарат</th><th>Ik,max, кА</th><th>В</th><th>Icn, кА</th><th>Сравнение</th><th></th></tr></thead><tbody>'+
  (table||'<tr><td colspan="6">Исследования не введены</td></tr>')+'</tbody></table></div></details>';
}
if(typeof module!=='undefined'&&module.exports)module.exports={
 epDeviceFaultNodeV1,epDeviceFaultSupplyFingerprintV1,epDeviceFaultScenarioV1,
 epDeviceFaultNormalizeV1,epDeviceFaultDeclareV1,epDeviceFaultClearV1,
 epDeviceFaultAuditV1,epDeviceFaultHtmlV1};

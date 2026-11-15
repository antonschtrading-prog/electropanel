'use strict';
// Incoming-device maximum prospective current using the EXISTING fault-route
// R/X and transformer models, at an explicitly declared three-phase 400/380V point.
function epIncomingMaximumTargetV1(project,id){
 if(typeof id!=='string'||!/^INCOMING:[A-Za-z0-9_-]{1,60}$/.test(id))
  throw Error('INCOMING_MAX_LOCATION_INVALID');
 const device=project?.deviceSupplyV1?.incomingDevices?.find(x=>'INCOMING:'+x.id===id);
 if(!device)throw Error('INCOMING_MAX_DEVICE_NOT_FOUND');
 if(typeof epDeviceFaultSupplyFingerprintV1!=='function')
  throw Error('INCOMING_MAX_SUPPLY_ENGINE_MISSING');
 return {device,path:epDeviceFaultSupplyFingerprintV1(project,id)};
}
function epIncomingMaximumNormalizeV1(project,records){
 if(!Array.isArray(records)||records.length>50)throw Error('INCOMING_MAX_LIST_INVALID');
 const seen=new Set();
 return records.map(r=>{
  if(!r||typeof r!=='object'||Array.isArray(r)||
   Object.keys(r).some(k=>!['deviceNodeId','maximumFaultInput','sourcePath','skuSnapshot'].includes(k))||
   typeof r.deviceNodeId!=='string'||seen.has(r.deviceNodeId)||
   typeof r.sourcePath!=='string'||r.sourcePath.length>50000||
   !(r.skuSnapshot===null||typeof r.skuSnapshot==='string'&&r.skuSnapshot.length<=100)||
   !r.maximumFaultInput||typeof r.maximumFaultInput!=='object'||
   Array.isArray(r.maximumFaultInput))
   throw Error('INCOMING_MAX_ENTRY_INVALID');
  if(!/^INCOMING:[A-Za-z0-9_-]{1,60}$/.test(r.deviceNodeId)||
   !(project?.deviceSupplyV1?.incomingDevices||[]).some(x=>'INCOMING:'+x.id===r.deviceNodeId))
   throw Error('INCOMING_MAX_DEVICE_NOT_FOUND');
  // Historical topology fingerprints remain unchanged when importing an
  // incomplete feed, so the audit can flag the actual stale source path.
  seen.add(r.deviceNodeId);
  const input=JSON.parse(JSON.stringify(r.maximumFaultInput));
  if(JSON.stringify(input).length>35000||
   input.model!=='THREE_PHASE_POSITIVE_SEQUENCE'||
   input.comparisonPoint!==r.deviceNodeId||
   !['DECLARED_RX','TRANSFORMER_WITH_UPSTREAM'].includes(input.sourceModel)||
   !Array.isArray(input.segments)||input.segments.length!==0)
   throw Error('INCOMING_MAX_MODEL_INVALID');
  return {...r,maximumFaultInput:input};
 });
}
function epIncomingMaximumEvaluateV1(project,record,lookup){
 if(typeof epMaximumFaultCurrentV2!=='function')
  throw Error('INCOMING_MAX_ENGINE_UNAVAILABLE');
 const device=epIncomingMaximumTargetV1(project,record.deviceNodeId).device;
 const line={id:record.deviceNodeId,phase:'3Ф',
  catalogSku:device.catalogSku??null,
  maximumFaultInput:record.maximumFaultInput};
 return epMaximumFaultCurrentV2(project,line,lookup);
}
function epIncomingMaximumDeclareV1(project,id,input,lookup){
 const target=epIncomingMaximumTargetV1(project,id);
 const normalized={...JSON.parse(JSON.stringify(input)),
  model:'THREE_PHASE_POSITIVE_SEQUENCE',comparisonPoint:id,segments:[]};
 if(!['DECLARED_RX','TRANSFORMER_WITH_UPSTREAM'].includes(normalized.sourceModel))
  throw Error('INCOMING_MAX_SOURCE_MODEL_INVALID');
 const record={deviceNodeId:id,maximumFaultInput:normalized,
  sourcePath:target.path,skuSnapshot:target.device.catalogSku??null};
 epIncomingMaximumNormalizeV1(project,[record]);
 const report=epIncomingMaximumEvaluateV1(project,record,lookup);
 if(!Number.isFinite(report.ikMaxKa)||report.ikMaxKa<=0||
   (report.issues||[]).some(x=>x.level==='BLOCKED'&&
    x.code!=='MAX_FAULT_EXCEEDS_ICN'&&x.code!=='MAX_FAULT_ICN_VOLTAGE_INSUFFICIENT'))
  throw Error('INCOMING_MAX_DECLARED_MODEL_INVALID');
 const old=epIncomingMaximumNormalizeV1(project,project.incomingMaximumStudiesV1??[]);
 return [...old.filter(x=>x.deviceNodeId!==id),record];
}
function epIncomingMaximumClearV1(project,id){
 return epIncomingMaximumNormalizeV1(project,project.incomingMaximumStudiesV1??[])
  .filter(x=>x.deviceNodeId!==id);
}
function epIncomingMaximumAuditV1(project,lookup){
 const rows=[],issues=[],add=(code,level='UNKNOWN',d={})=>issues.push({code,level,...d});
 const result=()=>({schema:'electropanel.incoming.maximum.current.1',
  status:issues.some(i=>i.level==='BLOCKED')?'BLOCKED':'UNKNOWN',
  rows,issues,engineeringApproved:false,ready_for_installation:false,
  selectivityStatus:'NOT_ASSESSED'});
 if(!project?.deviceSupplyV1){add('INCOMING_MAX_SUPPLY_UNDECLARED');return result();}
 let studies;
 try{studies=epIncomingMaximumNormalizeV1(project,project.incomingMaximumStudiesV1??[]);}
 catch(e){add(e.message,'BLOCKED');return result();}
 const seen=new Set();
 for(const record of studies){
  seen.add(record.deviceNodeId);
  let stale=false,report=null;
  try{
   const target=epIncomingMaximumTargetV1(project,record.deviceNodeId);
   if(target.path!==record.sourcePath||
    (target.device.catalogSku??null)!==record.skuSnapshot)
    stale=true;
   report=epIncomingMaximumEvaluateV1(project,record,lookup);
  }catch(_){stale=true;}
  if(stale)add('INCOMING_MAX_STUDY_STALE','BLOCKED',{objectId:record.deviceNodeId});
  if(!report||!Number.isFinite(report.ikMaxKa))
   add('INCOMING_MAX_CALCULATION_UNAVAILABLE','BLOCKED',{objectId:record.deviceNodeId});
  if(report?.thresholdStatus==='FAIL')
   add('INCOMING_MAX_ICN_NUMERIC_EXCEEDED','BLOCKED',{objectId:record.deviceNodeId});
  if(report?.thresholdStatus!=='PRELIMINARY_PASS')
   add('INCOMING_MAX_PROVENANCE_OR_RATING_REVIEW_REQUIRED','UNKNOWN',{objectId:record.deviceNodeId});
  if((report?.issues||[]).some(x=>x.level==='BLOCKED'&&x.code!=='MAX_FAULT_EXCEEDS_ICN'))
   add('INCOMING_MAX_SOURCE_MODEL_BLOCKED','BLOCKED',{objectId:record.deviceNodeId});
  add('INCOMING_MAX_NETWORK_ASSUMPTIONS_REQUIRE_REVIEW','UNKNOWN',{objectId:record.deviceNodeId});
  rows.push({deviceNodeId:record.deviceNodeId,
   ikMaxKa:stale?null:report?.ikMaxKa??null,
   model:record.maximumFaultInput.sourceModel,
   voltageV:report?.voltageV??null,
   icnKa:report?.icnKa??null,
   sourcePathStale:stale,
   thresholdStatus:report?.thresholdStatus??'UNKNOWN',
   transformer:report?.transformer??null,
   status:stale?'BLOCKED':'UNKNOWN'});
 }
 for(const device of project.deviceSupplyV1.incomingDevices||[])
  if(!seen.has('INCOMING:'+device.id))
   add('INCOMING_MAX_STUDY_UNDECLARED','UNKNOWN',{objectId:'INCOMING:'+device.id});
 return result();
}
function epIncomingMaximumHtmlV1(project,lookup){
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const opts=(project?.deviceSupplyV1?.incomingDevices||[]).map(x=>
  '<option value="'+esc('INCOMING:'+x.id)+'">'+esc(x.id+' · '+x.label)+'</option>').join('');
 const report=epIncomingMaximumAuditV1(project,lookup);
 const f=(id,title,placeholder='')=>'<label>'+title+'<input id="'+id+
  '" placeholder="'+esc(placeholder)+'" inputmode="decimal"></label>';
 const rows=report.rows.map(x=>'<tr><td>'+esc(x.deviceNodeId)+'</td><td>'+
  esc(x.ikMaxKa??'—')+'</td><td>'+esc(x.model)+'</td><td>'+
  esc(x.sourcePathStale?'ДА':'нет')+'</td><td><button type="button" class="btn tiny" data-incoming-max-clear="'+
  esc(x.deviceNodeId)+'">Удалить</button></td></tr>').join('');
 return '<details class="ep-incoming-maximum"><summary>Ik,max на вводном аппарате из эквивалента источника · '+esc(report.status)+
  '</summary><p class="muted">Повторно используется существующее ядро R/X и трансформатора. Расчёт относится к явно названной точке у вводного аппарата; отсутствие кабельных участков означает, что параметры источника уже приведены к этой точке.</p>'+
  '<div class="form-grid"><label>Вводной<select id="incomingMaxNode">'+opts+'</select></label>'+
  '<label>Модель источника<select id="incomingMaxSourceModel"><option value="DECLARED_RX">Эквивалент R/X</option>'+
  '<option value="TRANSFORMER_WITH_UPSTREAM">Трансформатор + R/X сети</option></select></label>'+
  f('incomingMaxU','ULL, В','400')+f('incomingMaxC','cmax','1.1')+
  f('incomingMaxR','R источника, Ом')+f('incomingMaxX','X источника, Ом')+
  f('incomingMaxNet','Источник R/X (для эквивалента)')+
  f('incomingMaxPower','S тр, кВА')+f('incomingMaxUk','uk, %')+
  f('incomingMaxLoss','Потери КЗ, Вт')+
  f('incomingMaxUpR','R сети до тр, Ом')+f('incomingMaxUpX','X сети до тр, Ом')+
  f('incomingMaxTransformerSource','Источник паспортных данных трансформатора')+
  f('incomingMaxUpstreamSource','Источник параметров сети до трансформатора')+
  '</div><label><input id="incomingMaxBasis" type="checkbox"> Подтверждена единая номинальная база uk и потерь</label>'+
  '<button class="btn" type="button" id="incomingMaxSave">Сохранить модель у вводного</button>'+
  '<div class="table-scroll"><table><thead><tr><th>Аппарат</th><th>Ik,max, кА</th><th>Модель</th><th>Маршрут устарел</th><th></th></tr></thead><tbody>'+
  (rows||'<tr><td colspan="5">Исследования не введены</td></tr>')+'</tbody></table></div></details>';
}
if(typeof module!=='undefined'&&module.exports)module.exports={
 epIncomingMaximumTargetV1,epIncomingMaximumNormalizeV1,
 epIncomingMaximumEvaluateV1,epIncomingMaximumDeclareV1,
 epIncomingMaximumClearV1,epIncomingMaximumAuditV1,epIncomingMaximumHtmlV1};

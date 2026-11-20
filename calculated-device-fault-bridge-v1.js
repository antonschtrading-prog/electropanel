'use strict';
// Bridges the existing maximum-fault calculation engine to the user's explicit
// protective-device supply graph; does not introduce a second Ik formula.
function epCalculatedDeviceFaultTargetV1(project,id){
 if(typeof id!=='string'||!/^BRANCH:[A-Za-z0-9_-]{1,80}$/.test(id))
  throw Error('CALC_DEVICE_BRANCH_REQUIRED');
 const branch=project?.branchDevices?.find(b=>'BRANCH:'+b.id===id);
 const line=project?.lines?.find(x=>x?.id===branch?.circuitId);
 if(!branch||!line)throw Error('CALC_DEVICE_LINE_NOT_FOUND');
 return {branch,line};
}
function epCalculatedDeviceFaultSnapshotV1(project,id,lookup){
 if(typeof epMaximumFaultCurrentV2!=='function'||
    typeof epDeviceFaultSupplyFingerprintV1!=='function')
  throw Error('CALC_DEVICE_MODULE_MISSING');
 const {line}=epCalculatedDeviceFaultTargetV1(project,id);
 const input=line.maximumFaultInput;
 if(!input||typeof input!=='object'||Array.isArray(input))
  throw Error('CALC_DEVICE_MAXIMUM_FAULT_INPUT_MISSING');
 if(input.comparisonPoint!==id)throw Error('CALC_DEVICE_COMPARISON_POINT_DIFFERENT');
 if(!['SINGLE_PHASE_L_N','THREE_PHASE_POSITIVE_SEQUENCE'].includes(input.model))
  throw Error('CALC_DEVICE_MODEL_UNSUPPORTED');
 const path=epDeviceFaultSupplyFingerprintV1(project,id);
 const report=epMaximumFaultCurrentV2(project,line,lookup);
 if(report.ikMaxKa===null||!Number.isFinite(report.ikMaxKa)||
  (report.issues||[]).some(x=>x.level==='BLOCKED'&&x.code!=='MAX_FAULT_EXCEEDS_ICN'))
  throw Error('CALC_DEVICE_SOURCE_MODEL_INVALID');
 if((report.issues||[]).some(x=>x.code==='MAX_FAULT_BASIS_STALE'))
  throw Error('CALC_DEVICE_MAXIMUM_FAULT_BASIS_STALE');
 const basis=JSON.parse(JSON.stringify(input));
 const article=null;
 return {deviceNodeId:id,comparisonPoint:id,sourcePath:path,
  model:input.model,inputSnapshot:basis,
  selectedSku:line.catalogSku??null};
}
function epCalculatedDeviceFaultNormalizeV1(project,records){
 if(!Array.isArray(records)||records.length>400)throw Error('CALC_DEVICE_BINDINGS_INVALID');
 const ids=new Set(),out=[];
 for(const record of records){
  if(!record||typeof record!=='object'||Array.isArray(record)||
   Object.keys(record).some(x=>!['deviceNodeId','comparisonPoint','sourcePath','model',
    'inputSnapshot','selectedSku'].includes(x))||
   typeof record.deviceNodeId!=='string'||
   record.comparisonPoint!==record.deviceNodeId||
   !/^BRANCH:[A-Za-z0-9_-]{1,80}$/.test(record.deviceNodeId)||
   ids.has(record.deviceNodeId)||
   typeof record.sourcePath!=='string'||record.sourcePath.length>50000||
   !['SINGLE_PHASE_L_N','THREE_PHASE_POSITIVE_SEQUENCE'].includes(record.model)||
   !(record.selectedSku===null||typeof record.selectedSku==='string'&&record.selectedSku.length<=100)||
   !record.inputSnapshot||typeof record.inputSnapshot!=='object'||
   Array.isArray(record.inputSnapshot))
   throw Error('CALC_DEVICE_BINDING_ENTRY_INVALID');
  ids.add(record.deviceNodeId);
  epCalculatedDeviceFaultTargetV1(project,record.deviceNodeId);
  const snapshot=JSON.parse(JSON.stringify(record.inputSnapshot));
  if(JSON.stringify(snapshot).length>100000)throw Error('CALC_DEVICE_INPUT_SNAPSHOT_TOO_LARGE');
  out.push({...record,inputSnapshot:snapshot});
 }
 return out;
}
function epCalculatedDeviceFaultBindV1(project,id,lookup){
 const binding=epCalculatedDeviceFaultSnapshotV1(project,id,lookup);
 const old=epCalculatedDeviceFaultNormalizeV1(project,project.calculatedDeviceFaultBindingsV1??[]);
 return [...old.filter(x=>x.deviceNodeId!==id),binding];
}
function epCalculatedDeviceFaultClearV1(project,id){
 return epCalculatedDeviceFaultNormalizeV1(project,project.calculatedDeviceFaultBindingsV1??[])
  .filter(x=>x.deviceNodeId!==id);
}
function epCalculatedDeviceFaultAuditV1(project,lookup){
 const rows=[],issues=[],add=(code,level='UNKNOWN',extra={})=>issues.push({code,level,...extra});
 const result=()=>({schema:'electropanel.calculated.device.fault.binding.1',
  status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN',
  rows,issues,engineeringApproved:false,ready_for_installation:false,
  selectivityStatus:'NOT_ASSESSED'});
 if(!Array.isArray(project?.lines)||!Array.isArray(project?.branchDevices))
  {add('CALC_DEVICE_PROJECT_INVALID','BLOCKED');return result();}
 let bindings;
 try{bindings=epCalculatedDeviceFaultNormalizeV1(project,project.calculatedDeviceFaultBindingsV1??[]);}
 catch(e){add(e.message,'BLOCKED');return result();}
 const bound=new Set();
 for(const saved of bindings){
  bound.add(saved.deviceNodeId);
  let fresh=null,maximum=null;
  let stale=false;
  try{
   fresh=epCalculatedDeviceFaultSnapshotV1(project,saved.deviceNodeId,lookup);
   const {line}=epCalculatedDeviceFaultTargetV1(project,saved.deviceNodeId);
   maximum=epMaximumFaultCurrentV2(project,line,lookup);
  }catch(e){
   add('CALC_DEVICE_CURRENT_STUDY_UNAVAILABLE','BLOCKED',
    {objectId:saved.deviceNodeId,reason:e.message});
  }
  if(!fresh||JSON.stringify(saved)!==JSON.stringify(fresh)){
   stale=true;add('CALC_DEVICE_BINDING_STALE','BLOCKED',{objectId:saved.deviceNodeId});
  }
  const manual=(project.deviceFaultScenariosV1||[]).find(x=>x.deviceNodeId===saved.deviceNodeId);
  if(manual){
   add('CALC_DEVICE_MANUAL_STUDY_REQUIRES_MODEL_RECONCILIATION','UNKNOWN',
    {objectId:saved.deviceNodeId});
  }
  if(maximum?.thresholdStatus==='FAIL')add('CALC_DEVICE_IK_EXCEEDS_ICN','BLOCKED',
   {objectId:saved.deviceNodeId});
  if(maximum&&maximum.thresholdStatus!=='PRELIMINARY_PASS')
   add('CALC_DEVICE_MAXIMUM_FAULT_REVIEW_REQUIRED','UNKNOWN',{objectId:saved.deviceNodeId});
  rows.push({deviceNodeId:saved.deviceNodeId,
   comparisonPoint:saved.comparisonPoint,model:saved.model,
   ikMaxKa:stale?null:maximum?.ikMaxKa??null,
   voltageV:stale?null:maximum?.voltageV??null,
   icnKa:stale?null:maximum?.icnKa??null,
   manualIkMaxKa:manual?.ikMaxKa??null,
   sourceModel:maximum?.sourceModel??null,
   stale,calculationThreshold:maximum?.thresholdStatus??'UNKNOWN',
   status:stale?'BLOCKED':'UNKNOWN',engineeringApproved:false});
 }
 for(const branch of project.branchDevices){
  if(!branch||typeof branch.id!=='string')continue;
  if(!bound.has('BRANCH:'+branch.id))
   add('CALC_DEVICE_EXPLICIT_POINT_BINDING_MISSING','UNKNOWN',
    {objectId:'BRANCH:'+branch.id});
 }
 return result();
}
function epCalculatedDeviceFaultHtmlV1(project,lookup){
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const candidates=(project?.branchDevices||[]).map(b=>'<option value="'+esc('BRANCH:'+b.id)+
  '">'+esc('BRANCH:'+b.id+' · '+b.circuitId)+'</option>').join('');
 const r=epCalculatedDeviceFaultAuditV1(project,lookup);
 const rows=r.rows.map(x=>'<tr><td>'+esc(x.deviceNodeId)+'</td><td>'+
  esc(x.model)+'</td><td>'+esc(x.ikMaxKa??'—')+'</td><td>'+
  esc(x.calculationThreshold)+'</td><td>'+esc(x.stale?'ДА':'нет')+
  '</td><td><button class="btn tiny" type="button" data-calculated-fault-clear="'+
  esc(x.deviceNodeId)+'">Удалить</button></td></tr>').join('');
 return '<details class="ep-calculated-device-fault"><summary>Расчёт Ik,max из R/X в точке автомата · '+
  esc(r.status)+'</summary>'+
  '<p class="muted">Используется существующее ядро максимального КЗ. Перед привязкой задайте в карточке цепи точку расчёта точно как BRANCH:ID. Вводные аппараты требуют отдельного эквивалента источника; здесь они не рассчитываются.</p>'+
  '<label>Аппарат<select id="calculatedFaultBranch"><option value="">Выберите</option>'+
  candidates+'</select></label>'+
  '<button type="button" class="btn" id="calculatedFaultBind">Привязать действующий расчёт</button>'+
  '<div class="table-scroll"><table><thead><tr><th>Аппарат</th><th>Модель</th><th>Ik,max, кА</th><th>Численная проверка</th><th>Устарел</th><th></th></tr></thead><tbody>'+
  (rows||'<tr><td colspan="6">Нет привязанных результатов</td></tr>')+'</tbody></table></div></details>';
}
if(typeof module!=='undefined'&&module.exports)module.exports={
 epCalculatedDeviceFaultTargetV1,epCalculatedDeviceFaultSnapshotV1,
 epCalculatedDeviceFaultNormalizeV1,epCalculatedDeviceFaultBindV1,
 epCalculatedDeviceFaultClearV1,epCalculatedDeviceFaultAuditV1,
 epCalculatedDeviceFaultHtmlV1};

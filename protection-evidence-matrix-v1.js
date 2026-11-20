'use strict';
// User-facing evidence matrix: action list from existing engineering modules.
// Presence of an item or a numerically passing study is never readiness/approval.
function epProtectionEvidenceMatrixV1(project,lookup){
 const issues=[],rows=[],add=(code,level='UNKNOWN',extra={})=>issues.push({code,level,...extra});
 const finish=()=>({schema:'electropanel.protection.evidence.matrix.1',
  rows,issues,status:issues.some(i=>i.level==='BLOCKED')?'BLOCKED':'UNKNOWN',
  engineeringApproved:false,ready_for_installation:false});
 if(!project||!Array.isArray(project.lines)||!Array.isArray(project.branchDevices)||
  !Array.isArray(project.sharedDevices)){
  add('PROTECTION_MATRIX_PROJECT_INVALID','BLOCKED');return finish();
 }
 const guarded=(name,fn)=>{
  if(typeof fn!=='function'){add('PROTECTION_MATRIX_'+name+'_UNAVAILABLE','BLOCKED');return null;}
  try{return fn(project,lookup);}catch(_){add('PROTECTION_MATRIX_'+name+'_ERROR','BLOCKED');return null;}
 };
 const supply=guarded('SUPPLY',typeof epDeviceSupplyAuditV1==='function'?epDeviceSupplyAuditV1:null);
 const needsExternal=project.designRequirementsV1?.externalNetwork===true;
 const needsCoordination=project.designRequirementsV1?.selectivity===true;
 const branch=needsExternal||project.calculatedDeviceFaultBindingsV1?.length?
  guarded('BRANCH_CALCULATED',
   typeof epCalculatedDeviceFaultAuditV1==='function'?epCalculatedDeviceFaultAuditV1:null):
  {rows:[]};
 const incoming=needsExternal||project.incomingMaximumStudiesV1?.length?
  guarded('INCOMING_CALCULATED',
   typeof epIncomingMaximumAuditV1==='function'?epIncomingMaximumAuditV1:null):
  {rows:[]};
 const manual=project.deviceFaultScenariosV1?.length?
  guarded('MANUAL_STUDIES',
   typeof epDeviceFaultAuditV1==='function'?epDeviceFaultAuditV1:null):
  {rows:[]};
 const coordination=needsCoordination||project.deviceCoordinationEvidenceV1?.length?
  guarded('MANUFACTURER_PAIR',
   typeof epCoordAuditV1==='function'?epCoordAuditV1:null):
  {rows:[]};
 const supplyEdges=new Map((supply?.edges||[]).map(x=>[x.to,x]));
 const supported=[
  ...(project.deviceSupplyV1?.incomingDevices||[]).map(x=>({id:'INCOMING:'+x.id,kind:'INCOMING',sku:x.catalogSku??null})),
  ...project.branchDevices.map(x=>({id:'BRANCH:'+x.id,kind:'BRANCH',
   sku:project.lines.find(l=>l.id===x.circuitId)?.catalogSku??null}))
 ];
 const byId=(report,id)=>report?.rows?.find(r=>r.deviceNodeId===id)||null;
 for(const item of supported){
  const declaredSupply=!!supplyEdges.get(item.id),
   auto=item.kind==='INCOMING'?byId(incoming,item.id):byId(branch,item.id),
   manualStudy=byId(manual,item.id),
   coordSources=(coordination?.rows||[]).filter(x=>x.from===item.id||x.to===item.id),
   stale=auto?.sourcePathStale===true||auto?.stale===true||
    coordSources.some(x=>x.status==='BLOCKED')||
    (manualStudy?.issues||[]).some(x=>x.code==='DEVICE_FAULT_SUPPLY_PATH_CHANGED'||
     x.code==='DEVICE_FAULT_SELECTED_ARTICLE_CHANGED');
  const actions=[],mark=(code,level='UNKNOWN')=>{
   actions.push(code);add(code,level,{objectId:item.id});
  };
  if(!declaredSupply)mark('PROTECTION_MATRIX_SUPPLY_PARENT_REQUIRED');
  if(!item.sku)mark('PROTECTION_MATRIX_SELECTED_ARTICLE_REQUIRED');
  // Independent external-network model and derived device-local R/X studies
  // are optional. A declared Ik at the boundary can be used instead.
  const explicitNetworkModel=project.designRequirementsV1?.externalNetwork===true;
  const hasSelectedSource=item.kind==='INCOMING'?
   !!(project.network?.ikMaxKa??project.network?.ikKa??project.incomingIkMaxKa):
   !!project.lines.find(l=>l.id===project.branchDevices.find(b=>'BRANCH:'+b.id===item.id)?.circuitId)?.faultInput;
  if(!auto&&!manualStudy&&explicitNetworkModel&&!hasSelectedSource)
   mark(item.kind==='INCOMING'?'PROTECTION_MATRIX_INCOMING_MAX_STUDY_REQUIRED':
    'PROTECTION_MATRIX_BRANCH_RX_BINDING_REQUIRED');
  if(!coordSources.length&&declaredSupply&&
     project.designRequirementsV1?.selectivity===true)
   mark('PROTECTION_MATRIX_COORDINATION_MANUFACTURER_SOURCE_REQUIRED');
  if(stale)mark('PROTECTION_MATRIX_EVIDENCE_STALE','BLOCKED');
  if(auto?.thresholdStatus==='FAIL'||auto?.calculationThreshold==='FAIL')
   mark('PROTECTION_MATRIX_BREAKING_CAPACITY_NUMERIC_REJECTION','BLOCKED');
  if((coordSources||[]).some(x=>x.numeric==='DECLARED_FAULT_ABOVE_CLAIMED_LIMIT'))
   mark('PROTECTION_MATRIX_COORDINATION_LIMIT_REJECTION','BLOCKED');
  rows.push({deviceNodeId:item.id,kind:item.kind,sku:item.sku,
   declaredSupply,calculatedIkMaxKa:auto?.ikMaxKa??null,
   manualIkMaxKa:manualStudy?.ikMaxKa??null,coordinationRecords:coordSources.length,
   evidenceStale:stale,
   actions,status:actions.some(code=>[
    'PROTECTION_MATRIX_EVIDENCE_STALE',
    'PROTECTION_MATRIX_BREAKING_CAPACITY_NUMERIC_REJECTION',
    'PROTECTION_MATRIX_COORDINATION_LIMIT_REJECTION'].includes(code))?'BLOCKED':'UNKNOWN'});
 }
 if(!supported.length)add('PROTECTION_MATRIX_NO_PROTECTIVE_DEVICES');
 // No blanket requirement for external source studies or manufacturer documents.
 return finish();
}
function epProtectionEvidenceMatrixHtmlV1(report){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const items=(report?.rows||[]).slice(0,450).map(x=>'<tr><td>'+esc(x.deviceNodeId)+
  '</td><td>'+esc(x.kind)+'</td><td>'+esc(x.calculatedIkMaxKa??'—')+
  '</td><td>'+esc(x.coordinationRecords)+'</td><td>'+
  esc(x.actions.join(', ')||'Требуется инженерная проверка')+
  '</td><td>'+esc(x.status)+'</td></tr>').join('');
 return '<details class="ep-protection-evidence-matrix"><summary>Проверка комплектности инженерных данных по аппаратам · '+
  esc(report?.status??'UNKNOWN')+'</summary>'+
  '<p class="muted">Показаны отсутствующие источники, непривязанные расчётные точки и устаревшие сведения. Полная комплектность не подтверждает нормативную пригодность или селективность.</p>'+ 
  '<button type="button" class="btn" id="protectionEvidenceMatrixCsv">Выгрузить журнал замечаний CSV</button>'+
  '<div class="table-scroll"><table><thead><tr><th>Аппарат</th><th>Тип</th><th>Ik,max, кА</th><th>Документов пары</th><th>Что требуется</th><th>Статус</th></tr></thead><tbody>'+
  (items||'<tr><td colspan="6">Нет аппаратов</td></tr>')+'</tbody></table></div></details>';
}
function epProtectionEvidenceMatrixCsvV1(report){
 const cell=v=>{let s=String(v??'');if(/^\s*[=+\-@]/.test(s))s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';};
 const rows=[['Device node','Kind','Article','Supply declared','Calculated Ikmax kA','Manual Ikmax kA',
  'Coordination sources','Stale','Status','Required actions']];
 for(const x of report?.rows||[])rows.push([x.deviceNodeId,x.kind,x.sku,
  x.declaredSupply,x.calculatedIkMaxKa,x.manualIkMaxKa,x.coordinationRecords,
  x.evidenceStale,x.status,x.actions.join(', ')]);
 return '\uFEFF'+rows.map(x=>x.map(cell).join(';')).join('\r\n');
}
if(typeof module!=='undefined'&&module.exports)module.exports={
 epProtectionEvidenceMatrixV1,epProtectionEvidenceMatrixHtmlV1,
 epProtectionEvidenceMatrixCsvV1};

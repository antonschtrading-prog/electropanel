'use strict';
// Single draft pipeline over existing, independently testable engineering
// projections. The pipeline does NOT guess consumer groups, power factors,
// supply voltages, cable lengths or equipment acceptance.
function epWorkflowPositiveV1(value){
 if(value===null||value===undefined||typeof value==='boolean'||typeof value==='object')return null;
 const s=String(value).trim().replace(',','.');
 if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(s))return null;
 const n=Number(s);
 return Number.isFinite(n)&&n>0?n:null;
}
function epWorkflowInputsV1(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||
  Object.keys(raw).some(k=>!['singleVoltageV','threeVoltageV','powerFactor','efficiency','demandFactor'].includes(k)))
  throw Error('WORKFLOW_INPUTS_INVALID');
 const result={};
 for(const key of ['singleVoltageV','threeVoltageV','powerFactor','efficiency','demandFactor']){
  const voltage=key.includes('Voltage');
  const missing=raw[key]===undefined||raw[key]===null||raw[key]==='';
  const n=epWorkflowPositiveV1(raw[key]);
  if(voltage&&missing){result[key]=null;continue;}
  if(n===null||n>(voltage?1500:1))
   throw Error('WORKFLOW_INPUT_'+key.toUpperCase()+'_INVALID');
  result[key]=n;
 }
 if(result.singleVoltageV===null&&result.threeVoltageV===null)
  throw Error('WORKFLOW_INPUT_VOLTAGE_REQUIRED');
 return result;
}
function epWorkflowLineEstimateV1(line,inputs){
 const mode=line?.phase==='3Ф'?'three_phase':
  ['L1','L2','L3'].includes(line?.phase)?'single_phase':null;
 if(!mode)return {status:'NEEDS_PHASE',code:'WORKFLOW_PHASE_NOT_ASSIGNED',current:null};
 const power=epWorkflowPositiveV1(line.power??line.powerKw);
 if(power===null)return {status:'NEEDS_POWER',code:'WORKFLOW_POWER_NOT_DECLARED',current:null};
 if(!inputs)return {status:'NEEDS_INPUTS',code:'WORKFLOW_COMMON_INPUTS_NOT_DECLARED',current:null};
 if((mode==='single_phase'?inputs.singleVoltageV:inputs.threeVoltageV)===null)
  return {status:'NEEDS_INPUTS',code:'WORKFLOW_RELEVANT_VOLTAGE_NOT_DECLARED',current:null};
 if(typeof epLoadCurrentV1!=='function')
  return {status:'UNAVAILABLE',code:'WORKFLOW_LOAD_ENGINE_UNAVAILABLE',current:null};
 const input={mode,powerKw:power,
  voltageV:mode==='three_phase'?inputs.threeVoltageV:inputs.singleVoltageV,
  powerFactor:inputs.powerFactor,efficiency:inputs.efficiency,
  demandFactor:inputs.demandFactor};
 const result=epLoadCurrentV1(input);
 if(result.status!=='CALCULATED')return {
  status:'BLOCKED',code:'WORKFLOW_LOAD_'+result.code,current:null};
 return {status:'CALCULATED',code:'WORKFLOW_ARITHMETIC_FROM_ENGINE',
  current:result.roundedIbA,calculation:result};
}
// Audit the user-entered circuit/load association without silently summing
// loads into the circuit power or rewriting engineer-declared demand factors.
function epWorkflowConsumerAuditV1(project){
 const issues=[],byCircuit=new Map(),seenCircuits=new Set(),seenLoads=new Set();
 const summary={matchedConsumers:0,orphanConsumers:0,duplicateConsumers:0,
  invalidConsumerPower:0,powerDisagreements:0,unrepresentedCircuits:0};
 if(!project||!Array.isArray(project.lines)||!Array.isArray(project.loads)||project.lines.length>400||project.loads.length>10000)
  return {status:'BLOCKED',issues:[{code:'WORKFLOW_CONSUMER_MODEL_INVALID',level:'BLOCKED',lineId:null}],summary,rows:[],engineeringApproved:false,ready_for_installation:false};
 for(const line of project.lines){
  if(!line||typeof line.id!=='string'||!line.id.trim()||seenCircuits.has(line.id)){
   issues.push({code:'WORKFLOW_CIRCUIT_ID_INVALID_OR_DUPLICATE',level:'BLOCKED',lineId:line?.id??null});
   continue;
  }
  seenCircuits.add(line.id);
  byCircuit.set(line.id,{lineId:line.id,consumerCount:0,consumerPowerKw:0,
   declaredPowerKw:epWorkflowPositiveV1(line.power??line.powerKw),
   powerComplete:true,comparison:'NOT_AVAILABLE'});
 }
 for(const load of project.loads){
  const id=load?.id, circuitId=load?.circuitId;
  if(typeof id!=='string'||!id.trim()||seenLoads.has(id)){
   summary.duplicateConsumers++;
   issues.push({code:'WORKFLOW_CONSUMER_ID_INVALID_OR_DUPLICATE',level:'BLOCKED',
    lineId:typeof circuitId==='string'?circuitId:null});
  }else seenLoads.add(id);
  const row=byCircuit.get(circuitId);
  if(!row){
   summary.orphanConsumers++;
   issues.push({code:'WORKFLOW_CONSUMER_WITHOUT_EXISTING_CIRCUIT',level:'BLOCKED',
    lineId:typeof circuitId==='string'?circuitId:null});
   continue;
  }
  summary.matchedConsumers++;
  row.consumerCount++;
  const power=epWorkflowPositiveV1(load.powerKw);
  if(power===null){
   summary.invalidConsumerPower++;
   row.powerComplete=false;
   issues.push({code:'WORKFLOW_CONSUMER_POWER_MISSING_OR_INVALID',level:'UNKNOWN',lineId:circuitId});
  }else row.consumerPowerKw+=power;
 }
 for(const row of byCircuit.values()){
  row.consumerPowerKw=Math.round(row.consumerPowerKw*1000000)/1000000;
  if(!row.consumerCount){
   summary.unrepresentedCircuits++;
   row.comparison='NO_CONSUMERS_LINKED';
  }else if(!row.powerComplete||row.declaredPowerKw===null){
   row.comparison='INSUFFICIENT_DATA';
  }else if(Math.abs(row.consumerPowerKw-row.declaredPowerKw)>0.001){
   summary.powerDisagreements++;
   row.comparison='DIFFERENT_DECLARED_POWER';
   issues.push({code:'WORKFLOW_CONSUMER_CIRCUIT_POWER_DIFFER',level:'UNKNOWN',lineId:row.lineId});
  }else row.comparison='MATCH';
 }
 return {schema:'electropanel.workflow.consumers.audit.1',
  status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':issues.length||summary.unrepresentedCircuits?'REVIEW':'MATCHED',
  issues,summary,rows:[...byCircuit.values()],
  method:'DECLARED_KW_COMPARISON_ONLY',autoGroupApplied:false,
  engineeringApproved:false,ready_for_installation:false};
}

function epWorkflowConsumerAuditCsvV1(audit){
 const cell=value=>{
  let s=String(value??'');
  if(/^[\\s\\u0000-\\u001f]*[=+@-]/.test(s))s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';
 };
 const data=[['Circuit ID','Consumer count','Consumer sum kW','Declared circuit kW','Comparison']];
 for(const r of audit?.rows||[])data.push([r.lineId,r.consumerCount,
  r.powerComplete?r.consumerPowerKw:'UNKNOWN',r.declaredPowerKw??'UNKNOWN',r.comparison]);
 return '\uFEFF'+data.map(row=>row.map(cell).join(';')).join('\r\n')+'\r\n';
}
function epWorkflowPreviewV1(project,lookup,catalogInput,rawInputs){
 const issues=[],rows=[],add=(code,level='UNKNOWN',lineId=null)=>issues.push({code,level,lineId});
 const result=()=>({schema:'electropanel.project.workflow.draft.1',
  status:issues.some(i=>i.level==='BLOCKED')?'BLOCKED':'DRAFT',
  rows,issues,steps,summary,engineeringApproved:false,ready_for_installation:false});
 const steps=[],summary={circuits:0,consumers:0,calculated:0,missingInput:0,
  manualCurrentPreserved:0,protectiveCandidates:0,assignedArticles:0,
  unknownPhase:0,knownPowerKw:0,unassignedLoads:0,occupiedModules:null};
 if(!project||!Array.isArray(project.lines)||project.lines.length>400||
   !Array.isArray(project.loads)||!Array.isArray(project.sharedDevices)){
  add('WORKFLOW_PROJECT_INVALID','BLOCKED');return result();
 }
 let inputs=null;
 if(rawInputs!==undefined&&rawInputs!==null){
  try{inputs=epWorkflowInputsV1(rawInputs);}
  catch(e){add(e.message,'BLOCKED');}
 }
 const catalog=Array.isArray(catalogInput)?catalogInput:[];
 const consumerAudit=epWorkflowConsumerAuditV1(project);
 summary.consumerReconciliation=consumerAudit.summary;
 summary.unassignedLoads=consumerAudit.summary.orphanConsumers;
 for(const issue of consumerAudit.issues)add(issue.code,issue.level,issue.lineId);
 summary.consumers=project.loads.length;
 summary.circuits=project.lines.length;
 const phaseLoads={L1:0,L2:0,L3:0,unassigned:0};
 for(const line of project.lines){
  if(!line||typeof line.id!=='string'){add('WORKFLOW_LINE_INVALID','BLOCKED');continue;}
  const estimate=epWorkflowLineEstimateV1(line,inputs);
  const existing=epWorkflowPositiveV1(line.overloadInput?.ibA);
  const current=existing??estimate.current;
  const power=epWorkflowPositiveV1(line.power??line.powerKw);
  if(power!==null){
   summary.knownPowerKw+=power;
   if(line.phase==='3Ф')for(const key of ['L1','L2','L3'])phaseLoads[key]+=power/3;
   else if(['L1','L2','L3'].includes(line.phase))phaseLoads[line.phase]+=power;
   else phaseLoads.unassigned+=power;
  }
  if(!['L1','L2','L3','3Ф'].includes(line.phase))summary.unknownPhase++;
  if(existing!==null)summary.manualCurrentPreserved++;
  else if(estimate.status==='CALCULATED')summary.calculated++;
  else summary.missingInput++;
  const hypothetical={...line,overloadInput:{...(line.overloadInput||{}),
   ...(current!==null?{ibA:current}:{})}};
  const selection=typeof epProtectiveDeviceShortlistV1==='function'?
   epProtectiveDeviceShortlistV1(hypothetical,catalog):null;
  const candidates=(selection?.candidates||[]).filter(x=>x.status!=='REJECTED');
  if(candidates.length)summary.protectiveCandidates++;
  if(line.catalogSku)summary.assignedArticles++;
  const selected=candidates.find(x=>x.sku===line.catalogSku)||null;
  const candidate=candidates[0]||null;
  const consumers=project.loads.filter(x=>x.circuitId===line.id);
  rows.push({lineId:line.id,name:line.name??line.id,
   consumers:consumers.map(x=>({id:x.id,name:x.name,powerKw:x.powerKw})),
   phase:line.phase??null,
   powerKw:power,ibA:current,ibSource:existing!==null?'EXISTING':
    estimate.status==='CALCULATED'?'CALCULATED_PREVIEW':'NOT_AVAILABLE',
   calculationStatus:estimate.status,calculationCode:estimate.code,
   proposedSku:candidate?.sku??null,proposedStatus:candidate?.status??null,
   proposalCaution:candidate?.caution||[],
   selectedSku:line.catalogSku??null,selectedInCandidates:!!selected,
   candidatesCount:candidates.length,
   cableLengthStatus:'NOT_REQUIRED_FOR_PANEL_PREVIEW'});
 }
 summary.phaseLoadsKw=Object.fromEntries(Object.entries(phaseLoads).map(([k,v])=>[k,
  Math.round(v*1000)/1000]));
 summary.phaseHints=epWorkflowPhaseSuggestionsV1(project).candidates;
 if(summary.unknownPhase)add('WORKFLOW_PHASE_ASSIGNMENT_REQUIRED');
 if(summary.unassignedLoads)add('WORKFLOW_CONSUMERS_WITHOUT_CIRCUIT','BLOCKED');
 if(consumerAudit.summary.powerDisagreements)add('WORKFLOW_CONSUMER_POWERS_NEED_REVIEW');
 if(summary.missingInput)add('WORKFLOW_LOAD_INPUTS_PENDING');
 if(!inputs)add('WORKFLOW_COMMON_INPUTS_PENDING');
 let schematic=null,bom=null,board=null;
 const projectLookup=typeof lookup==='function'?lookup:()=>null;
 for(const [label,fn] of [
  ['SCHEMATIC',typeof epSingleLineDraftV1==='function'?epSingleLineDraftV1:null],
  ['BOM',typeof epDraftBomV1==='function'?epDraftBomV1:null],
  ['BOARD',typeof epDraftBoardPlanV1==='function'?epDraftBoardPlanV1:null]]){
  if(!fn){add('WORKFLOW_'+label+'_UNAVAILABLE');continue;}
  try{
   const report=fn(project,projectLookup);
   if(label==='SCHEMATIC')schematic=report;
   if(label==='BOM')bom=report;
   if(label==='BOARD')board=report;
  }catch(_){add('WORKFLOW_'+label+'_ERROR','BLOCKED');}
 }
 summary.occupiedModules=board?.placements?.reduce((sum,x)=>sum+x.modules,0)??null;
 steps.push({key:'LOADS',status:summary.missingInput||summary.unknownPhase?'PARTIAL':'READY',
  count:summary.calculated+summary.manualCurrentPreserved});
 steps.push({key:'APPARATUS',status:summary.assignedArticles===summary.circuits?'SELECTED':
   summary.protectiveCandidates?'CANDIDATES':'PENDING',count:summary.protectiveCandidates});
 steps.push({key:'SINGLE_LINE',status:schematic?.status??'PENDING',
  count:schematic?.nodes?.length??0});
 steps.push({key:'BOARD',status:board?.status??'PENDING',
  count:board?.placements?.length??0});
 steps.push({key:'BOM',status:bom?.status??'PENDING',
  count:bom?.items?.length??0});
 if(board?.issues?.some(i=>i.level==='BLOCKED'))add('WORKFLOW_BOARD_CONFLICT','BLOCKED');
 if(bom?.issues?.some(i=>i.level==='BLOCKED'))add('WORKFLOW_BOM_CONFLICT','BLOCKED');
 return result();
}
function epWorkflowArticleChoiceV1(project,lineId,sku,catalogInput){
 if(!project||!Array.isArray(project.lines)||typeof lineId!=='string'||
  typeof sku!=='string'||!sku||!Array.isArray(catalogInput))
  throw Error('WORKFLOW_ARTICLE_CHOICE_INVALID');
 const line=project.lines.find(x=>x?.id===lineId);
 if(!line)throw Error('WORKFLOW_ARTICLE_LINE_MISSING');
 if(line.catalogSku&&line.catalogSku!==sku)
  throw Error('WORKFLOW_ARTICLE_ALREADY_SELECTED');
 if(typeof epProtectiveDeviceShortlistV1!=='function')
  throw Error('WORKFLOW_ARTICLE_SHORTLIST_UNAVAILABLE');
 const assessment=epProtectiveDeviceShortlistV1(line,catalogInput);
 const candidate=assessment.candidates.find(x=>x.sku===sku);
 if(!candidate||candidate.status==='REJECTED')
  throw Error('WORKFLOW_ARTICLE_CANDIDATE_REJECTED');
 return {lineId,sku,status:candidate.status,
  requiresFinalChecks:candidate.status!=='POTENTIAL'||candidate.caution.length>0,
  caution:candidate.caution.slice(),engineeringApproved:false,
  ready_for_installation:false};
}
function epWorkflowPhaseSuggestionsV1(project){
 const total={L1:0,L2:0,L3:0},lines=project?.lines||[];
 for(const line of lines){
  const power=epWorkflowPositiveV1(line?.power??line?.powerKw);
  if(power===null)continue;
  if(line.phase==='3Ф')for(const phase of ['L1','L2','L3'])total[phase]+=power/3;
  else if(Object.hasOwn(total,line.phase))total[line.phase]+=power;
 }
 const imbalance=obj=>Math.max(obj.L1,obj.L2,obj.L3)-Math.min(obj.L1,obj.L2,obj.L3);
 const before=imbalance(total),items=[];
 for(const line of lines){
  const power=epWorkflowPositiveV1(line?.power??line?.powerKw);
  if(power===null||!['L1','L2','L3'].includes(line.phase))continue;
  for(const target of ['L1','L2','L3']){
   if(line.phase===target)continue;
   const afterLoads={...total};
   afterLoads[line.phase]-=power;afterLoads[target]+=power;
   const after=imbalance(afterLoads);
   if(after<before-0.01)items.push({lineId:line.id,from:line.phase,
    to:target,powerKw:power,beforeKw:Math.round(before*1000)/1000,
    afterKw:Math.round(after*1000)/1000,applied:false,
    engineeringApproved:false});
  }
 }
 items.sort((a,b)=>a.afterKw-b.afterKw||
  String(a.lineId).localeCompare(String(b.lineId))||
  a.to.localeCompare(b.to));
 return {schema:'electropanel.workflow.phase.hints.1',
  phaseLoadsKw:Object.fromEntries(Object.entries(total).map(([k,v])=>
   [k,Math.round(v*1000)/1000])),candidates:items.slice(0,5),
  method:'ACTIVE_KW_HEURISTIC_ONLY',inputPowerFactorsAssumedEqual:false,
  engineeringApproved:false,ready_for_installation:false};
}
function epWorkflowApplyCurrentsV1(project,rawInputs){
 const inputs=epWorkflowInputsV1(rawInputs);
 if(!project||!Array.isArray(project.lines)||project.lines.length>400||
  typeof epApplyLoadCurrentV1!=='function')
  throw Error('WORKFLOW_APPLY_ENGINE_UNAVAILABLE');
 let current=JSON.parse(JSON.stringify(project));
 const applied=[],skipped=[];
 for(const line of current.lines){
  const original=line.overloadInput?.ibA;
  const present=original!==undefined&&original!==null&&String(original).trim()!=='';
  // Only a current produced by the circuit-linked calculation engine may
  // be updated by this explicit action. Engineer-entered and overridden Ib
  // are immutable, even if common calculation inputs change.
  const linked=line.loadCurrentCalculation;
  const owned=present&&linked?.powerSource==='circuit'&&
   linked?.stale!==true&&epWorkflowPositiveV1(original)!==null&&
   Number(original)===Number(linked.roundedIbA);
  if(present&&!owned){
   skipped.push({lineId:line.id,code:'WORKFLOW_EXISTING_CURRENT_PRESERVED'});continue;
  }
  const estimate=epWorkflowLineEstimateV1(line,inputs);
  if(estimate.status!=='CALCULATED'){
   skipped.push({lineId:line.id,code:estimate.code});continue;
  }
  if(owned&&linked.mode===estimate.calculation.mode&&
    Object.entries(estimate.calculation.inputs).every(([key,value])=>
     Number(linked.inputs?.[key])===Number(value))){
   skipped.push({lineId:line.id,code:'WORKFLOW_LINKED_CURRENT_UNCHANGED'});continue;
  }
  const calculation=epApplyLoadCurrentV1(current,line.id,{
   mode:estimate.calculation.mode,powerSource:'circuit',
   voltageV:estimate.calculation.inputs.voltageV,
   powerFactor:inputs.powerFactor,efficiency:inputs.efficiency,
   demandFactor:inputs.demandFactor});
  if(!calculation.project){
   skipped.push({lineId:line.id,code:calculation.code});continue;
  }
  current=calculation.project;
  applied.push({lineId:line.id,ibA:estimate.current,
   reason:owned?'LINKED_INPUTS_RECALCULATED':'MISSING_CURRENT_CALCULATED'});
 }
 if(applied.length)current.workflowDesignInputsV1=inputs;
 return {schema:'electropanel.project.workflow.apply.1',
  project:current,applied,skipped,status:applied.length?'APPLIED':'NO_CHANGES',
  engineeringApproved:false,ready_for_installation:false};
}
function epWorkflowHtmlV1(report,stored={}){
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fields=[['singleVoltageV','U однофазной сети, В'],
 ['threeVoltageV','U трёхфазной сети, В (линейное)'],
 ['powerFactor','cos φ'],['efficiency','КПД'],['demandFactor','Коэффициент спроса']];
 const inputs=fields.map(([key,title])=>'<label>'+title+
  '<input id="workflow-'+key+'" inputmode="decimal" value="'+esc(stored?.[key]??'')+
  '" placeholder="Задаётся инженером"></label>').join('');
 const stages=(report?.steps||[]).map(s=>'<span class="ep-workflow-step"><b>'+
  esc(s.key)+'</b>: '+esc(s.status)+' ('+esc(s.count)+')</span>').join(' · ');
 const rows=(report?.rows||[]).slice(0,400).map(r=>'<tr><td>'+esc(r.lineId)+
  '</td><td>'+esc(r.name)+'</td><td>'+esc((r.consumers||[]).map(x=>x.name).join(', ')||'—')+'</td><td>'+esc(r.phase??'—')+
  '</td><td>'+esc(r.powerKw??'—')+'</td><td>'+esc(r.ibA??'—')+
  '</td><td>'+esc(r.ibSource)+'</td><td>'+esc(r.selectedSku??'—')+
  '</td><td>'+esc(r.proposedSku??'—')+
  (r.proposedSku?' <small>('+esc(r.proposedStatus)+
   (r.proposedStatus==='INCOMPLETE'?'; условия требуют уточнения':'')+')</small>':'')+
  '</td><td>'+
  (r.proposedSku&&!r.selectedSku?
   '<button type="button" class="btn tiny" data-workflow-article="'+
   esc(r.proposedSku)+'" data-workflow-line="'+esc(r.lineId)+
   '">Назначить черновой артикул</button>':'—')+'</td></tr>').join('');
 return '<div class="ep-workflow-v1"><h3>Единый предварительный маршрут проектирования</h3>'+
  '<p class="muted">От потребителей и нагрузок до предварительных аппаратов, схемы, DIN и спецификации. Никаких придуманных напряжений и cos φ: задайте их один раз. Неизвестные трассы не мешают проектированию. Подсказки аппаратов — не автоматический нормативный выбор.</p>'+
  '<div class="form-grid">'+inputs+'</div><div class="mini-actions">'+
  '<button id="workflowPreviewBtn" class="btn" type="button">Пересчитать предварительный маршрут</button>'+
  '<button id="workflowApplyCurrentsBtn" class="btn primary" type="button">Рассчитать недостающие Ib</button>'+ 
  '<button id="workflowExportCsvBtn" class="btn" type="button">Ведомость маршрута CSV</button>'+
  '<button id="workflowConsumerCsvBtn" class="btn" type="button">Сверка потребителей CSV</button>'+
  '</div><div class="muted">'+stages+'</div>'+
  '<p class="muted">Линий: '+esc(report?.summary?.circuits??0)+
  ', потребителей: '+esc(report?.summary?.consumers??0)+
  ', расчетов Ib: '+esc(report?.summary?.calculated??0)+
  ', уже заданных токов: '+esc(report?.summary?.manualCurrentPreserved??0)+
  ', предложений аппаратов: '+esc(report?.summary?.protectiveCandidates??0)+
  '.</p><p class="muted">Сверка потребителей: отсутствующие цепи — '+
  esc(report?.summary?.consumerReconciliation?.orphanConsumers??0)+
  ', дубли идентификаторов — '+
  esc(report?.summary?.consumerReconciliation?.duplicateConsumers??0)+
  ', расхождения заявленных мощностей — '+
  esc(report?.summary?.consumerReconciliation?.powerDisagreements??0)+
  '. Разные мощности требуют проверки инженером; автоматической подмены нет.</p><p class="muted">Подсказки балансировки мощностей (только кВт, без индивидуальных cos φ и режимов): '+
  ((report?.summary?.phaseHints||[]).length?
   report.summary.phaseHints.slice(0,3).map(x=>esc(x.lineId)+': '+
    esc(x.from)+' → '+esc(x.to)+'; разброс '+esc(x.beforeKw)+
    ' → '+esc(x.afterKw)+' кВт').join(' · '):
   'переназначение фаз не предлагается')+
  '. Рекомендация не изменяет схему.</p>'+
  '<div class="table-scroll"><table><thead><tr><th>Цепь</th><th>Назначение</th>'+
  '<th>Потребители группы</th><th>Фаза</th><th>кВт</th><th>Ib, А</th><th>Источник Ib</th>'+
  '<th>Выбранный артикул</th><th>Предварительный кандидат</th><th>Действие</th></tr></thead><tbody>'+
  (rows||'<tr><td colspan="10">Добавьте цепи и потребителей</td></tr>')+
  '</tbody></table></div></div>';
}
function epWorkflowCsvV1(report){
 const cell=value=>{
  let s=String(value??'');
  if(/^[\s\u0000-\u001f]*[=+@-]/.test(s))s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';
 };
 const rows=[['Circuit','Designation','Consumers','Phase','Power kW',
  'Ib A','Ib source','Selected SKU','Suggested SKU','Candidate status',
  'Review warnings','Calculation status']];
 for(const r of report?.rows||[])rows.push([r.lineId,r.name,
  (r.consumers||[]).map(x=>x.name).join(', '),r.phase,r.powerKw,
  r.ibA,r.ibSource,r.selectedSku,r.proposedSku,r.proposedStatus,
  (r.proposalCaution||[]).join(', '),r.calculationStatus]);
 return '\uFEFF'+rows.map(row=>row.map(cell).join(';')).join('\r\n')+'\r\n';
}
if(typeof module!=='undefined'&&module.exports)module.exports={
 epWorkflowPositiveV1,epWorkflowInputsV1,epWorkflowLineEstimateV1,
 epWorkflowConsumerAuditV1,epWorkflowConsumerAuditCsvV1,
 epWorkflowPreviewV1,epWorkflowApplyCurrentsV1,epWorkflowHtmlV1,
 epWorkflowArticleChoiceV1,epWorkflowPhaseSuggestionsV1,epWorkflowCsvV1};

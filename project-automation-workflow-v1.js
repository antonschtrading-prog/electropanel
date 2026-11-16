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
  const n=epWorkflowPositiveV1(raw[key]);
  if(n===null||n>(key.includes('Voltage')?1500:1))
   throw Error('WORKFLOW_INPUT_'+key.toUpperCase()+'_INVALID');
  result[key]=n;
 }
 return result;
}
function epWorkflowLineEstimateV1(line,inputs){
 const mode=line?.phase==='3Ф'?'three_phase':
  ['L1','L2','L3'].includes(line?.phase)?'single_phase':null;
 if(!mode)return {status:'NEEDS_PHASE',code:'WORKFLOW_PHASE_NOT_ASSIGNED',current:null};
 const power=epWorkflowPositiveV1(line.power??line.powerKw);
 if(power===null)return {status:'NEEDS_POWER',code:'WORKFLOW_POWER_NOT_DECLARED',current:null};
 if(!inputs)return {status:'NEEDS_INPUTS',code:'WORKFLOW_COMMON_INPUTS_NOT_DECLARED',current:null};
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
 const owned=new Set(project.lines.map(x=>x.id));
 for(const load of project.loads)if(!owned.has(load.circuitId))summary.unassignedLoads++;
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
  rows.push({lineId:line.id,name:line.name??line.id,phase:line.phase??null,
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
 if(summary.unknownPhase)add('WORKFLOW_PHASE_ASSIGNMENT_REQUIRED');
 if(summary.unassignedLoads)add('WORKFLOW_CONSUMERS_WITHOUT_CIRCUIT','BLOCKED');
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
function epWorkflowApplyCurrentsV1(project,rawInputs){
 const inputs=epWorkflowInputsV1(rawInputs);
 if(!project||!Array.isArray(project.lines)||project.lines.length>400||
  typeof epApplyLoadCurrentV1!=='function')
  throw Error('WORKFLOW_APPLY_ENGINE_UNAVAILABLE');
 let current=JSON.parse(JSON.stringify(project));
 const applied=[],skipped=[];
 for(const line of current.lines){
  const existing=epWorkflowPositiveV1(line.overloadInput?.ibA);
  if(existing!==null){skipped.push({lineId:line.id,code:'WORKFLOW_EXISTING_CURRENT_PRESERVED'});continue;}
  const estimate=epWorkflowLineEstimateV1(line,inputs);
  if(estimate.status!=='CALCULATED'){
   skipped.push({lineId:line.id,code:estimate.code});continue;
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
  applied.push({lineId:line.id,ibA:estimate.current});
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
  '</td><td>'+esc(r.name)+'</td><td>'+esc(r.phase??'—')+
  '</td><td>'+esc(r.powerKw??'—')+'</td><td>'+esc(r.ibA??'—')+
  '</td><td>'+esc(r.ibSource)+'</td><td>'+esc(r.selectedSku??'—')+
  '</td><td>'+esc(r.proposedSku??'—')+'</td></tr>').join('');
 return '<div class="ep-workflow-v1"><h3>Единый предварительный маршрут проектирования</h3>'+
  '<p class="muted">От потребителей и нагрузок до предварительных аппаратов, схемы, DIN и спецификации. Никаких придуманных напряжений и cos φ: задайте их один раз. Неизвестные трассы не мешают проектированию. Подсказки аппаратов — не автоматический нормативный выбор.</p>'+
  '<div class="form-grid">'+inputs+'</div><div class="mini-actions">'+
  '<button id="workflowPreviewBtn" class="btn" type="button">Пересчитать предварительный маршрут</button>'+
  '<button id="workflowApplyCurrentsBtn" class="btn primary" type="button">Рассчитать недостающие Ib</button>'+
  '</div><div class="muted">'+stages+'</div>'+
  '<p class="muted">Линий: '+esc(report?.summary?.circuits??0)+
  ', потребителей: '+esc(report?.summary?.consumers??0)+
  ', расчетов Ib: '+esc(report?.summary?.calculated??0)+
  ', уже заданных токов: '+esc(report?.summary?.manualCurrentPreserved??0)+
  ', предложений аппаратов: '+esc(report?.summary?.protectiveCandidates??0)+
  '.</p><div class="table-scroll"><table><thead><tr><th>Цепь</th><th>Назначение</th>'+
  '<th>Фаза</th><th>кВт</th><th>Ib, А</th><th>Источник Ib</th>'+
  '<th>Выбранный артикул</th><th>Предварительный кандидат</th></tr></thead><tbody>'+
  (rows||'<tr><td colspan="8">Добавьте цепи и потребителей</td></tr>')+
  '</tbody></table></div></div>';
}
if(typeof module!=='undefined'&&module.exports)module.exports={
 epWorkflowPositiveV1,epWorkflowInputsV1,epWorkflowLineEstimateV1,
 epWorkflowPreviewV1,epWorkflowApplyCurrentsV1,epWorkflowHtmlV1};

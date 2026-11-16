'use strict';
// Deterministic, opt-in split of an EXISTING consumer group based on an
// engineer-provided maximum connected power. We never mix different existing
// circuits, infer a consumer's protective requirements, or move it into a
// shared RCD topology. No cable length or upstream network is required.
function epGroupSplitRulesV1(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||
  Object.keys(raw).some(k=>k!=='maxGroupPowerKw'))
  throw Error('GROUP_SPLIT_RULES_INVALID');
 const value=raw.maxGroupPowerKw;
 if(value===null||value===undefined||typeof value==='boolean'||typeof value==='object')
  throw Error('GROUP_SPLIT_MAX_POWER_INVALID');
 const str=String(value).trim().replace(',','.');
 if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(str))
  throw Error('GROUP_SPLIT_MAX_POWER_INVALID');
 const n=Number(str);
 if(!Number.isFinite(n)||n<=0||n>100000)
  throw Error('GROUP_SPLIT_MAX_POWER_INVALID');
 return {maxGroupPowerKw:n};
}
function epGroupSplitAllowedV1(project,line){
 const id=line?.id;
 if(!id||!['L1','L2','L3','3Ф'].includes(line.phase))
  return 'GROUP_SPLIT_PHASE_REQUIRED';
 if((project.sharedDevices||[]).some(x=>x.circuitIds?.includes(id)))
  return 'GROUP_SPLIT_SHARED_DEVICE_REVIEW_REQUIRED';
 if(line.catalogSku||line.overloadInput||line.faultInput||line.loadCurrentCalculation||
  line.maximumFaultInput||line.calculationReview||line.route44Input||
  line.voltageDropDesignInput||line.cableDesignInput||
  line.cableReferenceInput||line.overloadV30||line.lv43Input)
  return 'GROUP_SPLIT_EXISTING_DESIGN_REVIEW_REQUIRED';
 if((project.manualLayoutV1||[]).some(x=>x.deviceId===id||
  (project.branchDevices||[]).some(b=>b.circuitId===id&&b.id===x.deviceId)))
  return 'GROUP_SPLIT_LAYOUT_FIXED';
 if((project.conductorRoutes||[]).some(x=>x.circuitId===id)||
  (project.feedLinks||[]).some(x=>x.circuitId===id)||
  (project.terminalLinks||[]).some(x=>x.circuitId===id)||
  (project.protectionLinks||[]).some(x=>x.downstreamLineId===id||x.upstreamLineId===id))
  return 'GROUP_SPLIT_CONNECTIONS_DEFINED';
 if((project.deviceSupplyV1?.links||[]).some(x=>
  (project.branchDevices||[]).some(b=>b.circuitId===id&&
   (x.to==='BRANCH:'+b.id||x.from==='BRANCH:'+b.id))))
  return 'GROUP_SPLIT_SUPPLY_DEFINED';
 if(line.device||line.templateId)
  return 'GROUP_SPLIT_DEVICE_PRESELECTED';
 return null;
}
function epGroupSplitPlanV1(project,rawRules){
 const rules=epGroupSplitRulesV1(rawRules),proposals=[],issues=[];
 const finish=()=>({schema:'electropanel.group.split.plan.1',rules,proposals,issues,
  status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'DRAFT',
  engineeringApproved:false,ready_for_installation:false});
 if(!project||!Array.isArray(project.lines)||!Array.isArray(project.loads)||
  !Array.isArray(project.sharedDevices)||project.lines.length>400||
  project.loads.length>1600){
  issues.push({code:'GROUP_SPLIT_PROJECT_INVALID',level:'BLOCKED'});return finish();
 }
 const ids=new Set();
 for(const l of project.lines){
  if(!l||typeof l.id!=='string'||!l.id||ids.has(l.id)){
   issues.push({code:'GROUP_SPLIT_LINE_ID_INVALID',level:'BLOCKED'});return finish();
  }
  ids.add(l.id);
 }
 const assign=new Map(project.lines.map(l=>[l.id,[]]));
 const loadIds=new Set();
 for(const load of project.loads){
  if(!load||typeof load.id!=='string'||!load.id||loadIds.has(load.id)||
   !assign.has(load.circuitId)){
   issues.push({code:'GROUP_SPLIT_LOAD_INVALID',level:'BLOCKED',loadId:load?.id});return finish();
  }
  loadIds.add(load.id);
  assign.get(load.circuitId).push(load);
 }
 for(const line of project.lines){
  const loads=assign.get(line.id);
  if(loads.length<2)continue;
  let total=0,invalid=false;
  for(const load of loads){
   const kw=load.powerKw;
   if(typeof kw!=='number'||!Number.isFinite(kw)||kw<=0){
    invalid=true;break;
   }
   total+=kw;
  }
  if(invalid){issues.push({code:'GROUP_SPLIT_INVALID_CONSUMER_POWER',
    level:'BLOCKED',lineId:line.id});continue;}
  if(total<=rules.maxGroupPowerKw+1e-9)continue;
  const denied=epGroupSplitAllowedV1(project,line);
  if(denied){issues.push({code:denied,level:'UNKNOWN',lineId:line.id});continue;}
  if(loads.some(x=>x.powerKw>rules.maxGroupPowerKw+1e-9)){
   issues.push({code:'GROUP_SPLIT_INDIVIDUAL_CONSUMER_OVER_LIMIT',
    level:'UNKNOWN',lineId:line.id});continue;
  }
  // First-fit decreasing, deterministic on consumer ID. The first bin keeps
  // the original circuit ID; other bins require new circuit entities.
  const sorted=loads.slice().sort((a,b)=>b.powerKw-a.powerKw||
   String(a.id).localeCompare(String(b.id)));
  const bins=[];
  for(const load of sorted){
   let bin=bins.find(b=>b.total+load.powerKw<=rules.maxGroupPowerKw+1e-9);
   if(!bin){bin={total:0,ids:[]};bins.push(bin);}
   bin.ids.push(load.id);bin.total+=load.powerKw;
  }
  if(bins.length<=1)continue;
  proposals.push({circuitId:line.id,phase:line.phase,
   originalTotalKw:Math.round(total*1000)/1000,
   groups:bins.map(bin=>({consumerIds:bin.ids,connectedKw:Math.round(bin.total*1000)/1000})),
   reason:'GROUP_SPLIT_CONNECTED_POWER_LIMIT',applied:false});
 }
 return finish();
}
function epGroupSplitApplyV1(project,plan){
 if(!project||!plan||plan.schema!=='electropanel.group.split.plan.1'||
  !plan.rules||!Array.isArray(plan.proposals))
  throw Error('GROUP_SPLIT_PLAN_INVALID');
 const fresh=epGroupSplitPlanV1(project,plan.rules);
 if(fresh.status==='BLOCKED'||JSON.stringify(fresh.proposals)!==JSON.stringify(plan.proposals))
  throw Error('GROUP_SPLIT_PLAN_STALE');
 if(!fresh.proposals.length)return {project:null,applied:0,createdCircuits:[],
  status:'NO_CHANGES',engineeringApproved:false};
 let next=JSON.parse(JSON.stringify(project)),newIds=[],serial=1;
 const taken=new Set(next.lines.map(x=>x.id));
 function allocate(){
  while(taken.has('L'+serial))serial++;
  const id='L'+serial++;taken.add(id);return id;
 }
 if(next.lines.length+fresh.proposals.reduce((n,p)=>n+p.groups.length-1,0)>400)
  throw Error('GROUP_SPLIT_CIRCUIT_LIMIT');
 for(const proposal of fresh.proposals){
  const line=next.lines.find(x=>x.id===proposal.circuitId);
  if(!line)throw Error('GROUP_SPLIT_PLAN_STALE');
  for(let g=0;g<proposal.groups.length;g++){
   const group=proposal.groups[g];
   const id=g===0?line.id:allocate();
   if(g>0){
    next.lines.push({id,name:(line.name||line.id).slice(0,76)+' · группа '+(g+1),
     power:null,phase:line.phase,device:'',modules:line.phase==='3Ф'?3:1,
     source:'manual',sourceRef:'Автоматическое разделение по заявленному пределу кВт'});
    newIds.push(id);
   }
   for(const loadId of group.consumerIds){
    const load=next.loads.find(x=>x.id===loadId);
    if(!load||load.circuitId!==proposal.circuitId)
     throw Error('GROUP_SPLIT_PLAN_STALE');
    load.circuitId=id;
   }
  }
 }
 for(const line of next.lines){
  const loads=next.loads.filter(x=>x.circuitId===line.id);
  if(loads.length)line.power=Math.round(loads.reduce((s,l)=>s+l.powerKw,0)*1000)/1000;
 }
 return {project:next,applied:fresh.proposals.length,createdCircuits:newIds,
  status:'APPLIED',engineeringApproved:false,ready_for_installation:false};
}
function epGroupSplitHtmlV1(plan){
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const rows=plan.proposals.map(p=>'<tr><td>'+esc(p.circuitId)+'</td><td>'+
  esc(p.originalTotalKw)+'</td><td>'+esc(p.groups.length)+'</td><td>'+
  esc(p.groups.map(g=>g.consumerIds.join(', ')+' ('+g.connectedKw+' кВт)').join(' | '))+
  '</td></tr>').join('');
 return '<details class="ep-group-split"><summary>Предложение разделить перегруженные по заданному пределу группы · '+
  esc(plan.proposals.length)+'</summary>'+
  '<p class="muted">Только явно заданный предел суммарной установленной мощности. Не объединяет разные линии, не меняет группы УЗО и не подбирает защиту. Это предварительное разбиение, не нормативное решение.</p>'+
  '<label>Предельная суммарная мощность группы, кВт <input id="groupSplitMaxKw" inputmode="decimal" value="'+
  esc(plan.rules.maxGroupPowerKw)+'"></label><div class="mini-actions">'+
  '<button class="btn" type="button" id="groupSplitPreviewBtn">Предварительный просмотр</button>'+
  '<button class="btn primary" type="button" id="groupSplitApplyBtn"'+
  (plan.proposals.length?'':' disabled')+'>Применить проверенное разбиение</button></div>'+
  '<div class="table-scroll"><table><thead><tr><th>Цепь</th><th>Было, кВт</th><th>Получится групп</th><th>Потребители</th></tr></thead><tbody>'+
  (rows||'<tr><td colspan="4">Подходящих групп нет</td></tr>')+
  '</tbody></table></div><p class="muted">Нельзя автоматически разделять цепи с выбранной защитой, уже выполненными расчётами или связями: сначала необходим пересмотр инженерной модели.</p>'+
  (plan.issues.length?'<p class="muted">Требуют отдельного решения: '+
   esc(plan.issues.map(x=>x.lineId+': '+x.code).join('; '))+'</p>':'')+
  '</details>';
}
if(typeof module!=='undefined'&&module.exports)module.exports={
 epGroupSplitRulesV1,epGroupSplitAllowedV1,epGroupSplitPlanV1,
 epGroupSplitApplyV1,epGroupSplitHtmlV1};

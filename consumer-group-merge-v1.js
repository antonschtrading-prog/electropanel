'use strict';
// Engineer-owned categories: merge only untouched DRAFT circuits with the same
// exact category AND phase. No inference from names, or transfer of protection,
// neutral zones, selected devices, routes, RCDs, source paths or calculations.
function epGroupMergeRulesV1(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||
  Object.keys(raw).some(x=>!['maxGroupPowerKw','maxConsumersPerCircuit','categories','separateCircuitIds'].includes(x)))
  throw Error('GROUP_MERGE_RULES_INVALID');
 if(typeof epGroupSplitRulesV1!=='function')throw Error('GROUP_MERGE_SPLIT_RULES_ENGINE_MISSING');
 const base=epGroupSplitRulesV1({maxGroupPowerKw:raw.maxGroupPowerKw,
  maxConsumersPerCircuit:raw.maxConsumersPerCircuit});
 if(!Array.isArray(raw.categories)||raw.categories.length>400)
  throw Error('GROUP_MERGE_CATEGORY_LIST_INVALID');
 const seen=new Set();
 const categories=raw.categories.map(x=>{
  if(!x||typeof x!=='object'||Array.isArray(x)||
   Object.keys(x).some(k=>!['circuitId','category'].includes(k))||
   typeof x.circuitId!=='string'||!x.circuitId.trim()||
   x.circuitId.length>40||seen.has(x.circuitId)||
   typeof x.category!=='string'||!x.category.trim()||x.category.length>60||
   !/^[\p{L}\p{N}_ .-]+$/u.test(x.category))
   throw Error('GROUP_MERGE_CATEGORY_INVALID');
  seen.add(x.circuitId);
  return {circuitId:x.circuitId,category:x.category.trim()};
 });
 if(raw.separateCircuitIds===undefined)return {...base,categories};
 const separate=raw.separateCircuitIds;
 if(!Array.isArray(separate)||separate.length>400||
  separate.some(x=>typeof x!=='string'||!x||x.length>40)||
  new Set(separate).size!==separate.length)
  throw Error('GROUP_MERGE_SEPARATE_IDS_INVALID');
 return {...base,categories,separateCircuitIds:separate.slice()};
}
function epGroupMergePlanV1(project,rawRules){
 const rules=epGroupMergeRulesV1(rawRules),proposals=[],issues=[];
 const add=(code,level='UNKNOWN',lineId=null)=>issues.push({code,level,lineId});
 const finish=()=>({schema:'electropanel.group.merge.plan.1',rules,proposals,issues,
  status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'DRAFT',
  engineeringApproved:false,ready_for_installation:false});
 if(!project||!Array.isArray(project.lines)||!Array.isArray(project.loads)||
  !Array.isArray(project.sharedDevices)||project.lines.length>400||
  project.loads.length>1600||
  project.branchDevices!==undefined&&!Array.isArray(project.branchDevices)||
  project.dinPlacementsV1!==undefined&&!Array.isArray(project.dinPlacementsV1)||
  project.manualLayoutV1!==undefined&&!Array.isArray(project.manualLayoutV1)||
  project.feedLinks!==undefined&&!Array.isArray(project.feedLinks)||
  project.conductorRoutes!==undefined&&!Array.isArray(project.conductorRoutes)){
  add('GROUP_MERGE_PROJECT_INVALID','BLOCKED');return finish();
 }
 const ids=new Map();
 for(const line of project.lines){
  if(!line||typeof line.id!=='string'||!line.id||ids.has(line.id)){
   add('GROUP_MERGE_CIRCUIT_IDS_INVALID','BLOCKED');return finish();
  }
  ids.set(line.id,line);
 }
 const groups=new Map(),powers=new Map(),consumers=new Map();
 for(const id of ids.keys()){powers.set(id,0);consumers.set(id,[]);}
 const loadIds=new Set();
 for(const item of project.loads){
  if(!item||typeof item.id!=='string'||!item.id||loadIds.has(item.id)||
   !ids.has(item.circuitId)||typeof item.powerKw!=='number'||
   !Number.isFinite(item.powerKw)||item.powerKw<=0){
   add('GROUP_MERGE_CONSUMER_INVALID','BLOCKED',item?.circuitId);return finish();
  }
  loadIds.add(item.id);consumers.get(item.circuitId).push(item.id);
  powers.set(item.circuitId,powers.get(item.circuitId)+item.powerKw);
 }
 const dedicated=new Set(rules.separateCircuitIds||[]);
 for(const id of dedicated)if(!ids.has(id))
  add('GROUP_MERGE_SEPARATE_CIRCUIT_ORPHAN','BLOCKED',id);
 const categoryPhases=new Map();
 for(const row of rules.categories){
  const line=ids.get(row.circuitId);
  if(!line){add('GROUP_MERGE_CATEGORY_ORPHAN','BLOCKED',row.circuitId);continue;}
  if(!['L1','L2','L3','3Ф'].includes(line.phase)){
   add('GROUP_MERGE_PHASE_UNDECLARED','UNKNOWN',line.id);continue;
  }
  if(!categoryPhases.has(row.category))categoryPhases.set(row.category,new Set());
  categoryPhases.get(row.category).add(line.phase);
 }
 for(const row of rules.categories){
  const line=ids.get(row.circuitId);if(!line||!['L1','L2','L3','3Ф'].includes(line.phase))continue;
  if(dedicated.has(line.id)){
   add('GROUP_MERGE_DEDICATED_LINE_EXCLUDED','UNKNOWN',line.id);continue;
  }
  if(categoryPhases.get(row.category)?.size!==1){
   add('GROUP_MERGE_CATEGORY_MIXED_PHASE','UNKNOWN',line.id);continue;
  }
  if(!consumers.get(line.id).length){
   add('GROUP_MERGE_EMPTY_CIRCUIT','UNKNOWN',line.id);continue;
  }
  const sum=powers.get(line.id),manual=Number(line.power);
  if(!Number.isFinite(manual)||Math.abs(manual-sum)>1e-6){
   add('GROUP_MERGE_CIRCUIT_POWER_CONFLICT','BLOCKED',line.id);continue;
  }
  if(sum>rules.maxGroupPowerKw+1e-9){
   add('GROUP_MERGE_CIRCUIT_EXCEEDS_LIMIT','UNKNOWN',line.id);continue;
  }
  if(rules.maxConsumersPerCircuit!==undefined&&
   consumers.get(line.id).length>rules.maxConsumersPerCircuit){
   add('GROUP_MERGE_CIRCUIT_CONSUMERS_EXCEED_LIMIT','UNKNOWN',line.id);continue;
  }
  const branches=(project.branchDevices||[]).filter(x=>x.circuitId===line.id);
  const hasDinEvidence=(project.dinPlacementsV1||[]).some(x=>x?.deviceId===line.id||
   branches.some(b=>b.id===x?.deviceId));
  if(hasDinEvidence){
   add('GROUP_MERGE_DIN_ARTICLE_PLACEMENT_LINKED','UNKNOWN',line.id);continue;
  }
  const denied=typeof epGroupSplitAllowedV1==='function'?
   epGroupSplitAllowedV1(project,line):'GROUP_MERGE_SAFETY_AUDIT_UNAVAILABLE';
  if(denied){add('GROUP_MERGE_'+denied,'UNKNOWN',line.id);continue;}
  const key=row.category+'\u0000'+line.phase;
  if(!groups.has(key))groups.set(key,{category:row.category,phase:line.phase,items:[]});
  groups.get(key).items.push({circuitId:line.id,totalKw:sum,
   consumerCount:consumers.get(line.id).length,consumerIds:consumers.get(line.id).slice()});
 }
 for(const group of groups.values()){
  // Whole-circuit first-fit decreasing. Bin membership is deterministic
  // regardless of the order in which the user entered category mappings.
  const sorted=group.items.sort((a,b)=>b.totalKw-a.totalKw||
   a.circuitId.localeCompare(b.circuitId));
  const bins=[];
  for(const item of sorted){
   let bin=bins.find(x=>x.totalKw+item.totalKw<=rules.maxGroupPowerKw+1e-9&&
    (rules.maxConsumersPerCircuit===undefined||
     x.consumers+item.consumerCount<=rules.maxConsumersPerCircuit));
   if(!bin){bin={totalKw:0,consumers:0,lines:[]};bins.push(bin);}
   bin.lines.push(item);bin.totalKw+=item.totalKw;bin.consumers+=item.consumerCount;
  }
  for(const bin of bins){
   if(bin.lines.length<2)continue;
   const target=bin.lines.map(x=>x.circuitId).sort((a,b)=>a.localeCompare(b))[0];
   const sources=bin.lines.map(x=>x.circuitId).filter(x=>x!==target)
    .sort((a,b)=>a.localeCompare(b));
   proposals.push({category:group.category,phase:group.phase,targetCircuitId:target,
    sourceCircuitIds:sources,consumerIds:bin.lines.flatMap(x=>x.consumerIds).sort(),
    totalKw:Math.round(bin.totalKw*1000)/1000,
    consumerCount:bin.consumers,applied:false});
  }
 }
 proposals.sort((a,b)=>a.targetCircuitId.localeCompare(b.targetCircuitId));
 return finish();
}
function epGroupMergeApplyV1(project,plan){
 if(!plan||plan.schema!=='electropanel.group.merge.plan.1'||
  !plan.rules||!Array.isArray(plan.proposals))
  throw Error('GROUP_MERGE_PLAN_INVALID');
 const fresh=epGroupMergePlanV1(project,plan.rules);
 if(fresh.status==='BLOCKED'||JSON.stringify(fresh.proposals)!==JSON.stringify(plan.proposals))
  throw Error('GROUP_MERGE_PLAN_STALE');
 if(!fresh.proposals.length)
  return {project:null,merged:0,removedCircuits:[],status:'NO_CHANGES',
   engineeringApproved:false,ready_for_installation:false};
 const next=JSON.parse(JSON.stringify(project)),removed=new Set();
 for(const proposal of fresh.proposals){
  const source=new Set(proposal.sourceCircuitIds);
  for(const load of next.loads)if(source.has(load.circuitId))
   load.circuitId=proposal.targetCircuitId;
  for(const id of source)removed.add(id);
  const target=next.lines.find(x=>x.id===proposal.targetCircuitId);
  target.power=Math.round(next.loads.filter(x=>x.circuitId===target.id)
   .reduce((sum,x)=>sum+x.powerKw,0)*1000)/1000;
 }
 next.lines=next.lines.filter(x=>!removed.has(x.id));
 if(Array.isArray(next.branchDevices))
  next.branchDevices=next.branchDevices.filter(x=>!removed.has(x.circuitId));
 next.consumerGroupMergeRulesV1={...fresh.rules,
  categories:fresh.rules.categories.filter(x=>!removed.has(x.circuitId))};
 return {project:next,merged:fresh.proposals.length,
  removedCircuits:[...removed].sort(),status:'APPLIED',
  engineeringApproved:false,ready_for_installation:false};
}
function epGroupMergeHtmlV1(plan){
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const rules=plan?.rules||{categories:[]};
 const mappings=(rules.categories||[]).map(x=>x.circuitId+';'+x.category).join('\n');
 const rows=(plan?.proposals||[]).map(x=>'<tr><td>'+esc(x.category)+'</td><td>'+
  esc(x.phase)+'</td><td>'+esc(x.targetCircuitId)+'</td><td>'+
  esc(x.sourceCircuitIds.join(', '))+'</td><td>'+esc(x.totalKw)+
  '</td><td>'+esc(x.consumerCount)+'</td></tr>').join('');
 return '<details class="ep-group-merge"><summary>Объединение черновых линий по заданным категориям · '+
  esc(plan?.proposals?.length??0)+'</summary>'+
  '<p class="muted">Категорию каждой линии задаёт инженер в формате ID;Категория. Названия потребителей не анализируются. Объединяются только нетронутые линии одной фазы без выбранных аппаратов, УЗО и инженерных связей. Сначала просмотр, затем отдельное применение.</p>'+
  '<label>Максимум установленной мощности объединённой линии, кВт<input id="groupMergeMaxKw" inputmode="decimal" value="'+
  esc(rules.maxGroupPowerKw??'')+'"></label>'+
  '<label>Максимум потребителей (необязательно)<input id="groupMergeMaxConsumers" inputmode="numeric" value="'+
  esc(rules.maxConsumersPerCircuit??'')+'"></label>'+
  '<label>Категории линий<textarea id="groupMergeCategories" rows="5" spellcheck="false" placeholder="L1;Розетки\nL2;Розетки">'+
  esc(mappings)+'</textarea></label>'+
  '<label>Отдельные линии, которые запрещено объединять (ID через запятую)<input id="groupMergeSeparateIds" value="'+
  esc((rules.separateCircuitIds||[]).join(', '))+'" placeholder="L3, L5"></label>'+
  '<div class="mini-actions"><button class="btn" type="button" id="groupMergePreviewBtn">Предпросмотр объединения</button>'+
  '<button class="btn primary" type="button" id="groupMergeApplyBtn"'+
  (plan?.proposals?.length&&plan.status!=='BLOCKED'?'':' disabled')+'>Применить объединение</button></div>'+
  '<div class="table-scroll"><table><thead><tr><th>Категория</th><th>Фаза</th><th>Сохранится ID</th><th>Удаляемые линии</th><th>кВт</th><th>Потребителей</th></tr></thead><tbody>'+
  (rows||'<tr><td colspan="6">Допустимых объединений нет</td></tr>')+
  '</tbody></table></div>'+
  ((plan?.issues||[]).length?'<p class="muted">Не объединены: '+
   esc(plan.issues.map(x=>String(x.lineId??'')+': '+x.code).join('; '))+'</p>':'')+
  '</details>';
}
if(typeof module!=='undefined'&&module.exports)module.exports={
 epGroupMergeRulesV1,epGroupMergePlanV1,epGroupMergeApplyV1,epGroupMergeHtmlV1};

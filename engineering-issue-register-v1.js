'use strict';
// Aggregate all draft engineering issues without claiming regulatory compliance.
function epEngineeringIssueRegisterV1(bundle,project){
 const sections=bundle?.sections||{},entries=[],deferred=[],counts={BLOCKED:0,UNKNOWN:0,DEFERRED:0};
 const stage=typeof epDesignStageScopeV1==='function'?
  epDesignStageScopeV1(project).stage:'PRELIMINARY';
 const requested=project?.designRequirementsV1||{};
 const defer=(code,level)=>{
  if(level!=='UNKNOWN')return false;
  if(['CATALOG_SOURCE_REVIEW_NOT_RECORDED',
      'CATALOG_USER_DECLARATION_NOT_INDEPENDENTLY_VERIFIED',
      'CATALOG_MIRROR_REQUIRES_MANUFACTURER_CONFIRMATION',
      'MANUFACTURER_TERMINALS_UNVERIFIED'].includes(code))
   return true;
  if(['MAX_FAULT_INPUT_MISSING','FAULT_ROUTE_INPUT_MISSING',
      'ROUTE_IMPEDANCE_NOT_DECLARED'].includes(code)&&stage!=='DETAILED')
   return true;
  if(['PROTECTION_MATRIX_COORDINATION_MANUFACTURER_SOURCE_REQUIRED',
      'COORD_LOCAL_FAULT_STUDY_REQUIRED'].includes(code)&&requested.selectivity!==true)
   return true;
  if(['PROTECTION_MATRIX_INCOMING_MAX_STUDY_REQUIRED',
      'PROTECTION_MATRIX_BRANCH_RX_BINDING_REQUIRED',
      'INCOMING_MAX_STUDY_UNDECLARED'].includes(code)&&requested.externalNetwork!==true)
   return true;
  return false;
 };
 const knownLines=Array.isArray(project?.lines)?new Set(project.lines.map(x=>x?.id).filter(x=>typeof x==='string')):null;
 const sectionNames=['designWorkQueue','designReview','cableReference','designEvidence','dossier','bom','board','layoutAlternatives','protection','crossView','wiringTrace','neutralSegregation','neutralWireIsolation','singleLine','engineering'];
 if(sections.catalogueIntegrity)sectionNames.unshift('catalogueIntegrity');
 if(sections.catalogEvidence)sectionNames.splice(1,0,'catalogEvidence');
 if(sections.manufacturerEvidence)sectionNames.splice(1,0,'manufacturerEvidence');
 if(sections.manufacturerFacts)sectionNames.splice(1,0,'manufacturerFacts');
 if(sections.loadCurrent)sectionNames.splice(1,0,'loadCurrent');
 if(sections.workflowPreview)sectionNames.splice(1,0,'workflowPreview');
 if(sections.protectionSelection)sectionNames.push('protectionSelection');
 if(sections.protectionTopology)sectionNames.push('protectionTopology');
 if(sections.protectionDeviceChain)sectionNames.push('protectionDeviceChain');
 if(sections.supplyDeviceGraph)sectionNames.push('supplyDeviceGraph');
 if(sections.deviceSupply)sectionNames.push('deviceSupply');
 if(sections.supplyTerminals)sectionNames.push('supplyTerminals');
 if(sections.incomingTerminalBindings)sectionNames.push('incomingTerminalBindings');
 if(sections.supplyCrossEvidence)sectionNames.push('supplyCrossEvidence');
 if(sections.deviceFaultScenarios)sectionNames.push('deviceFaultScenarios');
 if(sections.deviceCoordinationEvidence)sectionNames.push('deviceCoordinationEvidence');
 if(sections.calculatedDeviceFault)sectionNames.push('calculatedDeviceFault');
 if(sections.incomingMaximum)sectionNames.push('incomingMaximum');
 if(sections.protectionEvidenceMatrix)sectionNames.push('protectionEvidenceMatrix');
 if(sections.faultSourceConvergence)sectionNames.push('faultSourceConvergence');
 if(sections.integratedEvidence)sectionNames.push('integratedEvidence');
 if(sections.faultRoutes)sectionNames.push('faultRoutes');
 if(sections.reconciliation)sectionNames.push('reconciliation');
 for(const name of sectionNames){
  const section=sections[name];
  if(!section||!Array.isArray(section.issues)){
   entries.push({section:name,level:'BLOCKED',code:'SECTION_ISSUES_UNAVAILABLE',circuitId:null});continue;
  }
  for(const issue of section.issues.slice(0,2000)){
   if(!issue||typeof issue.code!=='string'||!issue.code){
    entries.push({section:name,level:'BLOCKED',code:'ISSUE_INVALID',circuitId:null});continue;
   }
   const level=issue.level==='BLOCKED'||issue.status==='BLOCKED'?'BLOCKED':'UNKNOWN';
   const circuitId=issue.lineId??issue.circuitId??issue.owner??null;
   const id=typeof circuitId==='string'?circuitId:null;
   const entry={section:name,level,code:issue.code,
    circuitId:knownLines&&!knownLines.has(id)?null:id,
    objectId:knownLines&&id&&!knownLines.has(id)?id:null,
    recordIndex:Number.isInteger(issue.recordIndex)?issue.recordIndex:null};
   if(defer(issue.code,level)){deferred.push({...entry,level:'DEFERRED'});continue;}
   entries.push(entry);
  }
 }
 for(const x of entries)counts[x.level]++;
 counts.DEFERRED=deferred.length;
 return {schema:'electropanel.issue.register.draft.1',status:counts.BLOCKED?'BLOCKED':'UNKNOWN',
  entries,deferred,counts,sections:sectionNames,stage,
  engineeringApproved:false,ready_for_installation:false};
}
function epEngineeringIssueRegisterHtmlV1(report,selectedId=null){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 if(!report?.entries)return '<p>Реестр замечаний недоступен. Проверка не завершена.</p>';
 const items=report.entries.slice(0,250).map(x=>{
  const guide=typeof epIssueGuidanceV1==='function'?epIssueGuidanceV1(x.code):
   {title:'Требуется разбор замечания',action:'Проверьте исходные данные'};
  return '<tr'+(x.circuitId===selectedId?' class="ep-circuit-active"':'')+'>'+
   '<td>'+esc(x.level)+'</td><td>'+esc(x.section)+'</td><td>'+esc(guide.title)+' <small>('+esc(x.code)+')</small></td>'+
   '<td>'+esc(guide.action)+'</td>'+
   '<td>'+(x.circuitId?'<button class="btn tiny" type="button" data-issue-focus="'+esc(x.circuitId)+'">'+esc(x.circuitId)+'</button>':x.objectId?esc(x.objectId):'Проект')+'</td></tr>';
 }).join('');
 return '<details class="ep-issue-register"><summary>Сводный реестр замечаний · блокирующих '+
  report.counts.BLOCKED+', неопределённостей '+report.counts.UNKNOWN+
  ', отложено '+(report.counts.DEFERRED||0)+'</summary>'+
  '<p>Замечания могут повторяться в разных инженерных разделах. Отложенные проверки и происхождение введённых данных не блокируют текущую стадию. Это журнал проектирования, не допуск.</p>'+
  '<div style="overflow-x:auto"><table><thead><tr><th>Уровень</th><th>Раздел</th><th>Проблема</th><th>Что проверить</th><th>Цепь / объект</th></tr></thead><tbody>'+
  (items||'<tr><td colspan="5">На текущей стадии нет замечаний; проектные проверки сохраняются.</td></tr>')+
  '</tbody></table></div>'+
  (report.deferred?.length?
   '<details><summary>Отложенные и необязательные проверки · '+esc(report.deferred.length)+'</summary>'+
   '<div style="overflow-x:auto"><table><thead><tr><th>Раздел</th><th>Проверка</th><th>Цепь</th></tr></thead><tbody>'+
   report.deferred.slice(0,250).map(x=>'<tr><td>'+esc(x.section)+'</td><td>'+esc(x.code)+
    '</td><td>'+esc(x.circuitId??x.objectId??'Проект')+'</td></tr>').join('')+
   '</tbody></table></div></details>':'')+
  '</details>';
}
function epEngineeringIssueRegisterCsvV1(report){
 const q=v=>{let s=String(v??'');if(/^[\s\u0000-\u001f]*[=+@-]/.test(s))s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';};
 return '\uFEFF'+[['Раздел','Уровень','Код','Цепь','Объект'],
  ...(report?.entries||[]).map(x=>[x.section,x.level,x.code,x.circuitId,x.objectId]),
  ...(report?.deferred||[]).map(x=>[x.section,'DEFERRED',x.code,x.circuitId,x.objectId])]
  .map(row=>row.map(q).join(';')).join('\r\n')+'\r\n';
}
if(typeof module!=='undefined'&&module.exports)module.exports={
 epEngineeringIssueRegisterV1,epEngineeringIssueRegisterHtmlV1,epEngineeringIssueRegisterCsvV1};

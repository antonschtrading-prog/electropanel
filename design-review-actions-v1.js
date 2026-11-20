'use strict';
// A read-only action matrix: saved dependency notices are not approvals.
const EP_REVIEW_ACTION_SECTIONS_V1=Object.freeze({
 load:['loadCurrent','workflowPreview','consumerReconciliation','designReview','designWorkQueue','dossier'],
 network:['incomingMaximum','calculatedDeviceFault','deviceFaultScenarios','faultSourceConvergence','faultRoutes','engineering'],
 cable:['cableReference','designReview','protectionDecision','faultRoutes','designWorkQueue','reconciliation'],
 device:['protection','protectionDecision','protectionSelection','protectionEvidenceMatrix','deviceCoordinationEvidence','manufacturerFacts','catalogEvidence','designReview','designWorkQueue','deliveryTrace'],
 topology:['protectionTopology','protectionDeviceChain','supplyDeviceGraph','deviceSupply','supplyTerminals','incomingTerminalBindings','supplyCrossEvidence','wiringTrace','neutralSegregation','neutralWireIsolation','singleLine','fireControl','fireGate','deliveryTrace','designWorkQueue'],
 enclosure:['cabinetFit','cabinetCapacity','cabinetConnectionProximity','cabinetConnectionSpace','cabinetApparatusEvidence','board','boardCapacity','layoutAlternatives','bom','crossView','deliveryTrace']
});
const EP_REVIEW_ACTION_TITLES_V1=Object.freeze({
 load:'Нагрузки и расчёт Ib',network:'Источник питания и токи КЗ',
 cable:'Кабели и проверки проводников',device:'Защитные аппараты и координация',
 topology:'Схема, питание и связи',enclosure:'Корпус, DIN и спецификация'
});
function epDesignReviewActionMatrixV1(project,register){
 if(typeof epDesignReviewNoticeNormalizeV1!=='function')
  return {schema:'electropanel.design.review.actions.1',status:'BLOCKED',rows:[],
   issues:[{code:'REVIEW_NOTICE_ENGINE_UNAVAILABLE',level:'BLOCKED'}],
   engineeringApproved:false,ready_for_installation:false};
 let notice;
 try{notice=epDesignReviewNoticeNormalizeV1(project?.designReviewNoticeV1);}
 catch(_){return {schema:'electropanel.design.review.actions.1',status:'BLOCKED',rows:[],
  issues:[{code:'REVIEW_NOTICE_INVALID',level:'BLOCKED'}],
  engineeringApproved:false,ready_for_installation:false};}
 const entries=Array.isArray(register?.entries)?register.entries:[];
 const deferred=Array.isArray(register?.deferred)?register.deferred:[];
 if(!notice)return {schema:'electropanel.design.review.actions.1',status:'NOT_APPLICABLE',
  revision:0,rows:[],summary:{domains:0,blocking:0,open:0,deferred:0,unmatched:0},
  issues:[],engineeringApproved:false,ready_for_installation:false};
 const rows=notice.pendingDomains.map(domain=>{
  const linked=EP_REVIEW_ACTION_SECTIONS_V1[domain];
  const matched=entries.filter(x=>linked.includes(x.section)).slice(0,200);
  const postponed=deferred.filter(x=>linked.includes(x.section)).slice(0,200);
  const blocked=matched.filter(x=>x.level==='BLOCKED').length;
  return {domain,title:EP_REVIEW_ACTION_TITLES_V1[domain],status:blocked?'BLOCKED':'REVIEW_REQUIRED',
   revision:notice.revision,blocking:blocked,open:matched.length,
   deferred:postponed.length,requiresIndependentReview:true,
   tasks:matched.map(x=>({
    section:String(x.section),code:String(x.code),level:x.level==='BLOCKED'?'BLOCKED':'UNKNOWN',
    lineId:typeof x.circuitId==='string'?x.circuitId:
     typeof x.objectId==='string'?x.objectId:null
   })),
   // A zero-count section is not evidence of a completed review.
   noMatchingIssues:matched.length===0};
 });
 return {schema:'electropanel.design.review.actions.1',
  status:rows.some(x=>x.blocking)?'BLOCKED':'REVIEW_REQUIRED',revision:notice.revision,rows,
  summary:{domains:rows.length,blocking:rows.reduce((n,x)=>n+x.blocking,0),
   open:rows.reduce((n,x)=>n+x.open,0),deferred:rows.reduce((n,x)=>n+x.deferred,0),
   unmatched:rows.filter(x=>x.noMatchingIssues).length},
  issues:[],engineeringApproved:false,ready_for_installation:false};
}
function epDesignReviewActionMatrixHtmlV1(report){
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 if(!report||report.status==='BLOCKED'&&!Array.isArray(report.rows))
  return '<p>Матрица перепроверок недоступна. Инженерная проверка не подтверждена.</p>';
 if(!report.rows?.length)return '<p>Сохранённых требований повторной проверки нет. Проверки проекта выполняются отдельно.</p>';
 const rows=report.rows.map(x=>'<tr><td>'+esc(x.title)+'</td><td>'+esc(x.status)+'</td><td>'+
  esc(x.blocking)+'</td><td>'+esc(x.open)+'</td><td>'+esc(x.deferred)+'</td><td>'+
  (x.noMatchingIssues?'Отдельных замечаний нет — подтверждение всё равно требуется':
    esc(x.tasks.slice(0,4).map(t=>t.code+(t.lineId?' ('+t.lineId+')':'')).join('; '))+
     (x.tasks.length>4?' · и ещё '+esc(x.tasks.length-4):''))+'</td></tr>').join('');
 return '<details class="ep-design-review-actions"><summary>Сохранённые перепроверки · разделов '+
  esc(report.summary.domains)+' · блокирующих замечаний '+esc(report.summary.blocking)+
  ' · открытых '+esc(report.summary.open)+'</summary>'+
  '<p>Текущие замечания сопоставлены с сохранёнными изменениями. Отсутствие замечания не подтверждает выполнение инженерной проверки.</p>'+
  '<div style="overflow-x:auto"><table><thead><tr><th>Раздел</th><th>Состояние</th><th>Блокирующие</th><th>Замечания</th><th>Отложено</th><th>Что проверить</th></tr></thead><tbody>'+
  rows+'</tbody></table></div></details>';
}
function epDesignReviewActionMatrixCsvV1(report){
 const cell=value=>{
  let s=String(value??'');
  if(/^[\s\u0000-\u001f]*[=+@-]/.test(s))s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';
 };
 const data=[['review_revision','domain','status','blocking','issues','deferred',
  'issue_code','section','circuit_or_object','independent_review_required']];
 for(const row of report?.rows||[]){
  const tasks=row.tasks.length?row.tasks:[{code:'NO_MATCHING_ISSUE_NOT_APPROVED',section:'',lineId:''}];
  for(const task of tasks)data.push([row.revision,row.domain,row.status,row.blocking,row.open,
   row.deferred,task.code,task.section,task.lineId??'',true]);
 }
 return '\uFEFF'+data.map(row=>row.map(cell).join(';')).join('\r\n')+'\r\n';
}
if(typeof module!=='undefined'&&module.exports)module.exports={
 EP_REVIEW_ACTION_SECTIONS_V1,EP_REVIEW_ACTION_TITLES_V1,
 epDesignReviewActionMatrixV1,epDesignReviewActionMatrixHtmlV1,
 epDesignReviewActionMatrixCsvV1};

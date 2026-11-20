'use strict';
// Read-only classification of saved design evidence. The presence of a
// calculation report is not proof of an engineer's review or installation fit.
const EP_FRESHNESS_DOMAINS_V1=Object.freeze(['load','network','cable','device','topology','enclosure']);
const EP_FRESHNESS_TITLES_V1=Object.freeze({
 load:'Нагрузки и расчётный ток',network:'Питание и токи короткого замыкания',
 cable:'Кабели и проверки проводников',device:'Защитные аппараты',
 topology:'Однолинейная схема и связи',enclosure:'Корпус, DIN и спецификация'
});
const EP_FRESHNESS_SECTIONS_V1=Object.freeze({
 load:['loadCurrent','workflowPreview','consumerReconciliation'],
 network:['incomingMaximum','faultRoutes','calculatedDeviceFault'],
 cable:['cableReference','reconciliation','designReview'],
 device:['protection','protectionSelection','protectionEvidenceMatrix'],
 topology:['singleLine','wiringTrace','protectionTopology','deliveryTrace'],
 enclosure:['board','bom','cabinetFit','cabinetCapacity']
});
function epDesignResultFreshnessV1(project,bundle){
 const blocked=(code)=>({schema:'electropanel.design.result.freshness.1',
  status:'BLOCKED',rows:[],summary:{stale:0,failed:0,pending:0,declared:0,unrecorded:0},
  issues:[{code,level:'BLOCKED'}],engineeringApproved:false,ready_for_installation:false});
 if(!project||typeof project!=='object'||Array.isArray(project))return blocked('RESULT_FRESHNESS_PROJECT_INVALID');
 if(project.evidence!==undefined&&project.evidence!==null&&
  (typeof project.evidence!=='object'||Array.isArray(project.evidence)))
  return blocked('RESULT_FRESHNESS_EVIDENCE_INVALID');
 if(typeof epDesignReviewNoticeNormalizeV1!=='function')return blocked('RESULT_FRESHNESS_NOTICE_ENGINE_MISSING');
 let notice;
 try{notice=epDesignReviewNoticeNormalizeV1(project.designReviewNoticeV1);}
 catch(_){return blocked('RESULT_FRESHNESS_NOTICE_INVALID');}
 const rows=EP_FRESHNESS_DOMAINS_V1.map(domain=>{
  const entry=project.evidence?.[domain];
  const hasEntry=entry!==undefined&&entry!==null;
  if(hasEntry&&(typeof entry!=='object'||Array.isArray(entry)))
   return {domain,title:EP_FRESHNESS_TITLES_V1[domain],status:'INVALID_EVIDENCE',
    noticeRevision:notice?.pendingDomains.includes(domain)?notice.revision:null,
    source:'',method:'',declaredStatus:'INVALID',requiresReview:true,reportSections:[]};
  const hasPending=!!notice?.pendingDomains.includes(domain);
  const failed=entry?.status==='failed';
  const related=EP_FRESHNESS_SECTIONS_V1[domain];
  const sections=bundle?.sections||{};
  const reportSections=related.map(section=>{
   const report=sections[section];
   return {section,status:typeof report?.status==='string'?report.status:'UNAVAILABLE',
    issueCount:Array.isArray(report?.issues)?report.issues.length:null};
  });
  // A saved 'verified' declaration may predate a currently blocked engine
  // report. It must not hide an unresolved contradiction in the live design.
  const liveBlocked=reportSections.some(x=>x.status==='BLOCKED');
  const staleCircuits=[];
  if((domain==='load'||domain==='device')&&Array.isArray(project.lines)){
   for(const line of project.lines.slice(0,400)){
    const linked=line?.loadCurrentCalculation;
    if(!linked||linked.powerSource!=='circuit')continue;
    const id=typeof line?.id==='string'?line.id:null;
    const saved=Number(linked.roundedIbA),given=Number(line?.overloadInput?.ibA);
    const power=Number(line?.power??line?.powerKw);
    const basis=Number(linked.inputs?.powerKw);
    let code=null;
    if(linked.stale===true)code='LINKED_IB_STALE';
    else if(!Number.isFinite(saved)||!Number.isFinite(given)||
     line?.overloadInput?.ibA===undefined||Math.abs(saved-given)>0.001)
     code='LINKED_IB_OVERRIDDEN_OR_MISSING';
    else if(!Number.isFinite(power)||!Number.isFinite(basis)||
     (line?.power??line?.powerKw)===undefined||Math.abs(power-basis)>0.000001)
     code='LINKED_POWER_CHANGED';
    if(code)staleCircuits.push({lineId:id,code});
   }
  }
  // A prior verified entry does not overrule either an edited project or a
  // demonstrated stale circuit-linked load current.
  const stale=entry?.stale===true||staleCircuits.length>0;
  const status=stale?'STALE':failed?'FAILED':
   hasPending||(liveBlocked&&entry?.status==='verified')?'PENDING_REVIEW':
   entry?.status==='verified'?'DECLARED_CURRENT':
   hasEntry?'UNCONFIRMED':'NOT_DOCUMENTED';
  return {domain,title:EP_FRESHNESS_TITLES_V1[domain],status,
   noticeRevision:hasPending?notice.revision:null,
   source:typeof entry?.source==='string'?entry.source.slice(0,300):'',
   method:typeof entry?.method==='string'?entry.method.slice(0,300):'',
   declaredStatus:typeof entry?.status==='string'?entry.status.slice(0,50):'NOT_DECLARED',
   requiresReview:status!=='DECLARED_CURRENT',
   staleCircuits,liveBlocked,reportSections};
 });
 if(rows.some(x=>x.status==='INVALID_EVIDENCE'))
  return blocked('RESULT_FRESHNESS_EVIDENCE_ENTRY_INVALID');
 const summary={stale:rows.filter(x=>x.status==='STALE').length,
  failed:rows.filter(x=>x.status==='FAILED').length,
  pending:rows.filter(x=>x.status==='PENDING_REVIEW').length,
  declared:rows.filter(x=>x.status==='DECLARED_CURRENT').length,
  unrecorded:rows.filter(x=>x.status==='UNCONFIRMED'||x.status==='NOT_DOCUMENTED').length};
 return {schema:'electropanel.design.result.freshness.1',
  status:summary.stale||summary.failed?'BLOCKED':summary.pending?'REVIEW_REQUIRED':'DRAFT',
  noticeRevision:notice?.revision??null,rows,summary,issues:[],
  engineeringApproved:false,ready_for_installation:false,
  method:'READ_ONLY_DECLARED_EVIDENCE_AND_SAVED_DEPENDENCY_NOTICE'};
}
function epDesignResultFreshnessHtmlV1(report){
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 if(!Array.isArray(report?.rows)||!report.rows.length)
  return '<p>Проверка актуальности расчётных разделов недоступна.</p>';
 const trs=report.rows.map(x=>'<tr><td>'+esc(x.title)+'</td><td>'+esc(x.status)+'</td><td>'+
  esc(x.noticeRevision??'—')+'</td><td>'+esc(x.source||'Не указан')+
  (x.staleCircuits?.length?' · устаревшие цепи: '+esc(x.staleCircuits.map(y=>y.lineId??'?').join(', ')):'')+
  '</td><td>'+
  esc(x.reportSections.map(s=>s.section+':'+s.status).join('; '))+'</td></tr>').join('');
 return '<details class="ep-freshness-matrix"><summary>Актуальность инженерных разделов · устаревших '+
  esc(report.summary.stale)+', ожидают перепроверки '+esc(report.summary.pending)+
  ', заявленных действующих '+esc(report.summary.declared)+'</summary>'+
  '<p>«DECLARED_CURRENT» — только запись о выполненной проверке в данных проекта, не подтверждение соответствия нормам. Несовпадение исходных данных требует независимой перепроверки.</p>'+
  '<div style="overflow-x:auto"><table><thead><tr><th>Раздел</th><th>Состояние</th><th>Ревизия изменений</th><th>Источник</th><th>Текущие расчётные отчёты</th></tr></thead><tbody>'+
  trs+'</tbody></table></div></details>';
}
function epDesignResultFreshnessCsvV1(report){
 const cell=value=>{
  let s=String(value??'');
  if(/^[\s\u0000-\u001f]*[=+@-]/.test(s))s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';
 };
 const result=[['domain','state','review_revision','declared_status','source','method',
  'section','section_status','issue_count','engineering_approved']];
 for(const row of report?.rows||[]){
  const sections=row.reportSections.length?row.reportSections:[{section:'',status:'UNAVAILABLE',issueCount:null}];
  for(const reportSection of sections)result.push([row.domain,row.status,
   row.noticeRevision??'',row.declaredStatus,row.source,row.method,reportSection.section,
   reportSection.status,reportSection.issueCount??'',false]);
 }
 return '\uFEFF'+result.map(row=>row.map(cell).join(';')).join('\r\n')+'\r\n';
}
if(typeof module!=='undefined'&&module.exports)module.exports={
 EP_FRESHNESS_DOMAINS_V1,EP_FRESHNESS_SECTIONS_V1,
 epDesignResultFreshnessV1,epDesignResultFreshnessHtmlV1,
 epDesignResultFreshnessCsvV1};

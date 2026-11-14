'use strict';
// Deterministic design work queue. Priority is urgency of missing information, not approval.
function epDesignWorkQueueV1(project,lookupSku){
 const review=typeof epCircuitDesignReviewV1==='function'?epCircuitDesignReviewV1(project,lookupSku):null;
 if(!review)return {status:'BLOCKED',items:[],summary:{blocked:0,missing:0,readyForReview:0}};
 const items=[],add=(lineId,priority,code,action,section)=>items.push({lineId,priority,code,action,section});
 for(const row of review.rows){
  if(row.current==='FAIL')add(row.lineId,1,'IB_EXCEEDS_IN','Изменить номинал аппарата или расчётные исходные данные','protection');
  if(row.cable==='FAIL')add(row.lineId,1,'IN_EXCEEDS_IZ','Проверить сечение и допустимый ток проводника','cable');
  if(row.breaking==='FAIL')add(row.lineId,1,'ICN_BELOW_IK','Подобрать аппарат с достаточной отключающей способностью','protection');
  if(row.referenceStatus==='FAIL')add(row.lineId,1,'REFERENCE_SECTION_UNDERSIZED','Проверить выбранное сечение в заявленных условиях','cable');
  if(row.voltageDrop.status==='FAIL')add(row.lineId,1,'VOLTAGE_DROP_EXCEEDED','Пересмотреть длину, сечение или расчётный режим','voltage');
  if(row.ibA===null)add(row.lineId,2,'IB_REQUIRED','Рассчитать или ввести расчётный ток Ib','load');
  if(row.inA===null)add(row.lineId,2,'PROTECTION_REQUIRED','Выбрать каталожный аппарат с номиналом In','protection');
  if(row.izA===null)add(row.lineId,2,'IZ_REQUIRED','Определить допустимый ток кабеля Iz','cable');
  if(row.ikKa===null)add(row.lineId,2,'IK_REQUIRED','Рассчитать предполагаемый ток КЗ в точке установки','protection');
  if(row.sectionMm2===null)add(row.lineId,2,'SECTION_REQUIRED','Указать проектное сечение проводника','cable');
  if(row.voltageDrop.status==='UNKNOWN')add(row.lineId,2,'VOLTAGE_DROP_REQUIRED','Заполнить расчёт падения напряжения','voltage');
  if(row.reasons.some(x=>x.code==='LOAD_CURRENT_STALE'))add(row.lineId,2,'LOAD_CURRENT_STALE','Пересчитать ток после изменения нагрузки','load');
  if(row.reasons.some(x=>x.code==='CALCULATION_REVIEW_REQUIRED'))
   add(row.lineId,3,'REVIEW_REQUIRED','Проверить актуальность расчётных данных','review');
 }
 if(typeof epFaultRouteProjectV2==='function')for(const row of epFaultRouteProjectV2(project,lookupSku).rows){
  if(row.status==='BLOCKED')add(row.lineId,1,'FAULT_ROUTE_BLOCKED','Проверить трассу и условие Ik,min ≥ Ia','fault_route');
  else if(row.thresholdStatus==='UNKNOWN')add(row.lineId,2,'FAULT_ROUTE_EVIDENCE_REQUIRED','Уточнить исходные данные и основания проверки петли L–PE','fault_route');
 }
 items.sort((a,b)=>a.priority-b.priority||String(a.lineId).localeCompare(String(b.lineId),'ru')||a.code.localeCompare(b.code));
 return {schema:'electropanel.design.queue.1',status:items.some(x=>x.priority===1)?'BLOCKED':review.status,items,
  summary:{circuits:review.rows.length,urgent:items.filter(x=>x.priority===1).length,
   missing:items.filter(x=>x.priority===2).length,review:items.filter(x=>x.priority===3).length},
  engineeringApproved:false};
}
function epDesignWorkQueueHtmlV1(queue,selectedId){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 if(!queue?.items)return '<p>Очередь инженерных задач недоступна.</p>';
 const rows=queue.items.slice(0,150).map(x=>'<tr'+(x.lineId===selectedId?' class="ep-circuit-active"':'')+'>'+
  '<td>'+esc(x.priority===1?'Критично':x.priority===2?'Исходные данные':'Проверка')+'</td>'+
  '<td><button class="btn tiny" type="button" data-design-focus="'+esc(x.lineId)+'">'+esc(x.lineId)+'</button></td>'+
  '<td>'+esc(x.action)+'</td><td>'+esc(x.section)+'</td></tr>').join('');
 return '<details class="ep-design-queue"><summary>Что осталось сделать · '+queue.summary.urgent+
  ' критичных · '+queue.summary.missing+' исходных · '+queue.summary.review+' проверок</summary>'+
  '<p>Список формируется автоматически по проектным данным. Приоритеты не заменяют инженерную оценку.</p>'+
  '<div class="ep-design-review-scroll"><table><thead><tr><th>Приоритет</th><th>Цепь</th><th>Действие</th><th>Раздел</th></tr></thead><tbody>'+
  (rows||'<tr><td colspan="4">Неразобранных задач в этой матрице нет.</td></tr>')+
  '</tbody></table></div></details>';
}
if(typeof module!=='undefined'&&module.exports)module.exports={epDesignWorkQueueV1,epDesignWorkQueueHtmlV1};

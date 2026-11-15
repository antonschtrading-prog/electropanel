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
  if(row.faultCurrentComparison?.status==='BLOCKED')
   add(row.lineId,1,'MANUAL_IK_UNDERSTATES_SAME_POINT_MAX',
    'Проверить заниженный ручной Ik относительно расчёта в той же точке и при том же виде КЗ','fault_max');
  else if(row.faultCurrentComparison?.scope==='SAME_POINT_SAME_FAULT_MODEL')
   add(row.lineId,2,'FAULT_CURRENT_SOURCE_RECONCILIATION_REQUIRED',
    'Сверить два независимых расчёта максимального тока КЗ и основания их применения','fault_max');
  if(row.referenceStatus==='FAIL')add(row.lineId,1,'REFERENCE_SECTION_UNDERSIZED','Проверить выбранное сечение в заявленных условиях','cable');
  if(row.voltageDrop.status==='FAIL')add(row.lineId,1,'VOLTAGE_DROP_EXCEEDED','Пересмотреть длину, сечение или расчётный режим','voltage');
  if(row.ibA===null)add(row.lineId,2,'IB_REQUIRED','Рассчитать или ввести расчётный ток Ib','load');
  if(row.inA===null)add(row.lineId,2,'PROTECTION_REQUIRED','Выбрать каталожный аппарат с номиналом In','protection');
  if(row.izA===null)add(row.lineId,2,'IZ_REQUIRED','Определить допустимый ток кабеля Iz','cable');
  if(row.ikKa===null)add(row.lineId,2,'IK_REQUIRED','Рассчитать предполагаемый ток КЗ в точке установки','protection');
  if(row.sectionMm2===null)add(row.lineId,2,'SECTION_REQUIRED','Указать проектное сечение проводника','cable');
  if(row.voltageDrop.status==='UNKNOWN')add(row.lineId,2,'VOLTAGE_DROP_REQUIRED','Заполнить расчёт падения напряжения','voltage');
  if(row.reasons.some(x=>x.code==='LOAD_CURRENT_STALE'))add(row.lineId,2,'LOAD_CURRENT_STALE','Пересчитать ток после изменения нагрузки','load');
  // Engineering gate reasons become actionable tasks, never silent flags.
  const guided={
   CATALOG_LOOKUP_FAILED:[1,'Повторить проверку каталога: источник данных недоступен','catalogue'],
   CATALOG_ARTICLE_UNKNOWN:[1,'Найти или заменить отсутствующий артикул защитного аппарата','catalogue'],
   CATALOG_PROTECTION_KIND_UNSUPPORTED:[1,'Выбрать автоматический выключатель или дифавтомат вместо неподходящего типа','protection'],
   CATALOG_PHASE_POLES_MISMATCH:[1,'Согласовать число полюсов защитного аппарата с фазностью цепи','protection'],
   CATALOG_MODULES_STALE:[1,'Синхронизировать ширину линии с каталожным аппаратом','layout'],
   CATALOG_LABEL_STALE:[1,'Обновить обозначение аппарата по выбранному артикулу','catalogue'],
   CATALOG_BRANCH_DUPLICATED:[1,'Устранить повторное назначение отходящего аппарата','layout'],
   CATALOG_BRANCH_MODULES_STALE:[1,'Согласовать ширину отходящего аппарата со спецификацией','layout'],
   CATALOG_BRANCH_LABEL_STALE:[1,'Согласовать обозначение отходящего аппарата с каталогом','catalogue'],
   CATALOG_EVIDENCE_NOT_VERIFIED:[2,'Подтвердить характеристики аппарата паспортом производителя','catalogue'],
   CALCULATION_REVIEW_overloadInput:[3,'Повторно проверить Ib и Iz после изменения оборудования','protection'],
   CALCULATION_REVIEW_faultInput:[3,'Повторно проверить ток короткого замыкания и отключающую способность','protection'],
   CALCULATION_REVIEW_overloadV30:[3,'Повторно проверить расчёт защиты от перегрузки','protection'],
   CALCULATION_REVIEW_lv43Input:[3,'Повторно проверить исходные данные расчёта LV 4.3','protection'],
   CALCULATION_REVIEW_route44Input:[3,'Повторно проверить параметры трассы и цепи повреждения','fault_route']
  };
  const seen=new Set();
  for(const reason of row.reasons){
   const config=guided[reason.code];
   if(!config||seen.has(reason.code))continue;
   seen.add(reason.code);
   add(row.lineId,config[0],reason.code,config[1],config[2]);
  }
  if(row.reasons.some(x=>x.code==='CALCULATION_REVIEW_REQUIRED')&&
     !row.reasons.some(x=>x.code.startsWith('CALCULATION_REVIEW_')&&x.code!=='CALCULATION_REVIEW_REQUIRED'))
   add(row.lineId,3,'REVIEW_REQUIRED','Проверить актуальность расчётных данных','review');
 }
 if(typeof epFaultRouteProjectV2==='function')for(const row of epFaultRouteProjectV2(project,lookupSku).rows){
  if(row.status==='BLOCKED')add(row.lineId,1,'FAULT_ROUTE_BLOCKED','Проверить трассу и условие Ik,min ≥ Ia','fault_route');
  else if(row.thresholdStatus==='UNKNOWN')add(row.lineId,2,'FAULT_ROUTE_EVIDENCE_REQUIRED','Уточнить исходные данные и основания проверки петли L–PE','fault_route');
  if(row.disconnectionContext?.issues?.some(i=>i.code==='DISCONNECTION_REQUESTED_TIME_EXCEEDS_LIMIT'))
   add(row.lineId,1,'DISCONNECTION_TIME_LIMIT_EXCEEDED',
    'Выбранное время отключения превышает заявленный предел для категории цепи','fault_route');
  else if(row.disconnectionContext?.issues?.length)
   add(row.lineId,2,'DISCONNECTION_CONTEXT_EVIDENCE_REQUIRED',
    'Документировать область применения и предельное время автоматического отключения','fault_route');
  if(row.disconnectionContext?.numericalStatus==='PRELIMINARY_WITHIN_DECLARED_LIMIT')
   add(row.lineId,3,'DISCONNECTION_TIME_APPLICABILITY_REVIEW',
    'Проверить правильность нормативного основания и применимость выбранного времени','fault_route');
  if(row.thresholdStatus==='PRELIMINARY_PASS')
   add(row.lineId,3,'FAULT_ROUTE_NUMERIC_ONLY',
    'Проверить реальную времятоковую характеристику: арифметика Ik,min ≥ Ia не является подтверждением отключения','fault_route');
  if(row.tripEnvelope?.numericalStatus==='NOT_DEMONSTRATED')
   add(row.lineId,2,'TRIP_ENVELOPE_DISCONNECTION_NOT_DEMONSTRATED',
    'Уточнить паспортную гарантию отключения при Ik,min и требуемом времени','fault_route');
  if(row.tripEnvelope?.numericalStatus==='PRELIMINARY_WITHIN_ENVELOPE')
   add(row.lineId,3,'TRIP_ENVELOPE_PROVENANCE_REVIEW',
    'Проверить применимость паспортной огибающей времени отключения и условия установки','fault_route');
  // Ik,max is a different fault scenario from the L-PE minimum.
  // Its issue must not be incorrectly reported as a minimum-loop failure.
  if(row.maximum?.numericComparison==='EXCEEDS_ICN')
   add(row.lineId,1,'MAX_FAULT_EXCEEDS_ICN','Изменить аппарат или обоснованно пересчитать максимальный ток КЗ','protection');
  else if(row.maximum?.status==='BLOCKED')
   add(row.lineId,1,'MAX_FAULT_MODEL_BLOCKED','Исправить модель и исходные данные расчёта максимального КЗ','fault_max');
  else if(row.maximum?.ikMaxKa===null)
   add(row.lineId,2,'MAX_FAULT_INPUT_REQUIRED','Задать исходные данные максимального КЗ с источниками R/X','fault_max');
  else if(row.maximum?.thresholdStatus==='UNKNOWN')
   add(row.lineId,2,'MAX_FAULT_EVIDENCE_REQUIRED','Проверить паспорт Icn и основания расчёта Ik,max','fault_max');
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

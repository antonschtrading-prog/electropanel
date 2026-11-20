'use strict';
function epNeutralSegregationHtmlV1(report,selectedId=null){
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 if(!report||!Array.isArray(report.rows))return '<p>Проверка разделения N/PE недоступна.</p>';
 const items=report.rows.map(x=>'<tr'+(x.lineId===selectedId?' class="ep-circuit-active"':'')+'>'+
  '<td><button class="btn tiny" type="button" data-neutral-focus="'+esc(x.lineId)+'">'+esc(x.lineId)+'</button></td>'+
  '<td>'+esc(x.groupId||'Без УЗО')+'</td><td>'+esc(x.expectedBus)+'</td><td>'+
  esc(x.declaredBus||'Не задана')+'</td><td>'+esc(x.protectiveBus||'Не задана')+'</td><td>'+
  esc(x.status)+'</td></tr>').join('');
 return '<section class="ep-neutral-panel" aria-label="Разделение нейтралей групп УЗО">'+
  '<h3>Разделение N по группам УЗО · декларации</h3>'+
  '<p>Статус: '+esc(report.status)+' · замечаний: '+esc(report.issues.length)+
  '. Состояние контактов УЗО, фактическое разделение N и непрерывность PE не проверены.</p>'+
  '<div style="overflow-x:auto"><table><thead><tr><th>Цепь</th><th>Группа</th><th>Ожидаемая N</th>'+
  '<th>Заявленная N</th><th>Заявленная PE</th><th>Статус</th></tr></thead><tbody>'+
  (items||'<tr><td colspan="6">Нет объявленных цепей</td></tr>')+'</tbody></table></div></section>';
}
if(typeof module!=='undefined'&&module.exports)module.exports={epNeutralSegregationHtmlV1};

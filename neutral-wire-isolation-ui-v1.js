'use strict';
function epNeutralWireIsolationHtmlV1(report){
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 if(!report||!Array.isArray(report.pairs))
  return '<p>Проверка разделения N по проводам недоступна.</p>';
 const rows=report.pairs.slice(0,1000).map(x=>'<tr><td>'+esc(x.fromBus)+'</td><td>'+
  esc(x.toBus)+'</td><td>'+esc(x.status)+'</td><td>'+
  esc((x.path||[]).join(' → ')||'Не подтверждён')+'</td></tr>').join('');
 return '<details class="ep-neutral-wire-isolation"><summary>Проверка соединений N между группами · '+
  esc(report.status)+' · пар '+report.pairs.length+'</summary>'+
  '<p>BLOCKED — в объявленной модели найден путь N между разными шинами. UNKNOWN — отсутствие заявленного пути не доказывает физическое разделение. Контакты УЗО не замыкаются автоматически.</p>'+
  '<div style="overflow-x:auto"><table><thead><tr><th>N-шина 1</th><th>N-шина 2</th>'+
  '<th>Статус</th><th>Путь по модели</th></tr></thead><tbody>'+
  (rows||'<tr><td colspan="4">Нет сравниваемых пар N-шин</td></tr>')+'</tbody></table></div></details>';
}
if(typeof module!=='undefined'&&module.exports)module.exports={epNeutralWireIsolationHtmlV1};

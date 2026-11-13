'use strict';
function epDesignEvidenceHtmlV1(report){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 if(!report||!Array.isArray(report.items))return '<p>Доказательная база недоступна.</p>';
 const names={load:'Нагрузки',network:'Параметры сети',cable:'Кабели',device:'Аппараты',topology:'Соединения',enclosure:'Корпус'};
 const rows=report.items.map(x=>{
  const id=esc(x.area),status=esc(x.status);
  return '<tr data-evidence-row="'+id+'"><td>'+esc(names[x.area]||x.area)+'</td>'+
   '<td>'+status+(x.stale?' · Устарело':'')+'</td><td>'+esc(x.reason)+
   '<div class="ep-evidence-edit"><label>Источник<input data-evidence-field="source" maxlength="500" value="'+esc(x.source||'')+'" placeholder="Документ, страница, ссылка"></label>'+
   '<label>Метод<input data-evidence-field="method" maxlength="500" value="'+esc(x.method||'')+'" placeholder="Методика / расчёт"></label>'+
   '<label>Оценка<select data-evidence-field="status"><option value="unknown"'+(x.status==='unknown'?' selected':'')+'>Недостаточно данных</option>'+
   '<option value="verified"'+(x.status==='verified'?' selected':'')+'>Документировано</option>'+
   '<option value="failed"'+(x.status==='failed'?' selected':'')+'>Противоречие</option></select></label>'+
   '<button type="button" class="btn tiny" data-save-evidence="'+id+'">Сохранить основание</button></div></td></tr>';
 }).join('');
 return '<details class="ep-design-evidence"><summary>Доказательная база проектных решений · '+esc(report.status)+
  ' · документировано '+report.counts.verified+'/6</summary>'+
  '<p>Это реестр подтверждения исходных данных и методик, а не оценка фактически собранного щита. Отметки без источника и метода не принимаются.</p>'+
  '<div style="overflow-x:auto"><table><thead><tr><th>Раздел</th><th>Статус</th><th>Основание и исходные данные</th></tr></thead><tbody>'+rows+'</tbody></table></div></details>';
}
if(typeof module!=='undefined'&&module.exports)module.exports={epDesignEvidenceHtmlV1};

'use strict';
function epDesignEvidenceHtmlV1(report){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 if(!report||!Array.isArray(report.items))return '<p>Доказательная база недоступна.</p>';
 const names={load:'Нагрузки',network:'Параметры сети',cable:'Кабели',device:'Аппараты',topology:'Соединения',enclosure:'Корпус'};
 const rows=report.items.map(x=>'<tr><td>'+esc(names[x.area]||x.area)+'</td><td>'+esc(x.status)+'</td><td>'+esc(x.reason)+'</td></tr>').join('');
 return '<details class="ep-design-evidence"><summary>Доказательная база проектных решений · '+esc(report.status)+
  ' · документировано '+report.counts.verified+'/6</summary>'+
  '<p>Это реестр подтверждения исходных данных и методик, а не оценка фактически собранного щита. Отметки без источника и метода не принимаются.</p>'+
  '<div style="overflow-x:auto"><table><thead><tr><th>Раздел</th><th>Статус</th><th>Основание</th></tr></thead><tbody>'+rows+'</tbody></table></div></details>';
}
if(typeof module!=='undefined'&&module.exports)module.exports={epDesignEvidenceHtmlV1};

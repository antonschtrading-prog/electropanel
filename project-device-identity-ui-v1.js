'use strict';
function epProjectDeviceIdentityHtmlV1(report){
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const rows=(report?.rows||[]).slice(0,600).map(x=>'<tr><td>'+esc(x.id)+'</td><td>'+esc(x.kind==='shared'?'Групповой':'Линейный')+
  '</td><td>'+esc(x.owner)+'</td><td>'+esc(x.sku||'Не выбран')+'</td><td>'+esc(x.modules)+
  '</td><td>'+esc(x.board?'Да':'Нет')+'</td><td>'+esc(x.schematic?'Да':'Нет')+'</td><td>'+esc(x.bom?'Да':'Нет')+
  '</td><td>'+esc(x.status)+'</td></tr>').join('');
 return '<section><h4>Идентичность аппаратов в схеме, DIN и спецификации</h4>'+
  '<p>Включены групповые аппараты. Статус: '+esc(report?.status||'UNKNOWN')+'. Совпадение ID не подтверждает характеристики или пригодность аппарата.</p>'+
  '<div style="overflow:auto"><table><thead><tr><th>ID</th><th>Тип</th><th>Владелец</th><th>Артикул</th><th>Модули</th><th>DIN</th><th>Схема</th><th>Ведомость</th><th>Состояние</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
  '<p>Замечания: '+esc((report?.issues||[]).length)+'</p></section>';
}
if(typeof module!=='undefined')module.exports={epProjectDeviceIdentityHtmlV1};

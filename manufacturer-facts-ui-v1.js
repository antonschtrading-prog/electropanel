'use strict';
// Compact read-only comparison of original published factual references.
// Never presents source candidates as I²t, ADS or installation certification.
function epManufacturerFactsHtmlV1(project,lineId,lookup){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const source=typeof epManufacturerFactsReconciliationV1==='function'?
  epManufacturerFactsReconciliationV1(project,lookup):{rows:[]};
 const row=(source.rows||[]).find(x=>x.lineId===lineId);
 if(!row)return '';
 const link=row.sourceUrl?
  '<a href="'+esc(row.sourceUrl)+'" target="_blank" rel="noopener noreferrer">Открыть источник производителя</a>':
  '<span>Нет источника в проверяемом справочнике</span>';
 return '<details data-manufacturer-facts>'+
  '<summary>Первичные паспортные сведения · сравнение с каталогом</summary>'+
  '<p>Артикул: '+esc(row.sku??row.catalogKey??'—')+
  ' · статус сверки: '+esc(row.status)+'</p>'+
  '<p>'+link+' · '+esc(row.sourceLocation??'место не указано')+'</p>'+
  '<p>Совпали: '+esc((row.matchedFields||[]).join(', ')||'нет')+
  ' · отсутствуют: '+esc((row.missingFields||[]).join(', ')||'нет')+
  ' · противоречия: '+esc((row.conflictingFields||[]).join(', ')||'нет')+'</p>'+
  '<p>Не подтверждены найденным источником: '+
  esc((row.unavailableClaims||[]).join(', ')||'неизвестно')+
  '. Совпадение паспортных сведений не равно инженерному допуску.</p>'+
  '</details>';
}
if(typeof module!=='undefined'&&module.exports)
 module.exports={epManufacturerFactsHtmlV1};

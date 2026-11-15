'use strict';
// Project-local source record form, created from a separately entered I2t
// scope. A reviewed document remains draft engineering evidence.
function epManufacturerEvidenceHtmlV1(project,lineId,lookup){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const l=project?.lines?.find(x=>x.id===lineId);
 if(!l)return '';
 const d=l.letThroughInput||{};
 let article=null;try{article=lookup?.(l.catalogSku)||null;}catch(_){}
 const audit=typeof epManufacturerEvidenceRegisterV1==='function'?
  epManufacturerEvidenceRegisterV1(project):{records:[],issues:[]};
 const field=(key,label,value)=>'<label>'+label+'<input name="'+key+'" value="'+esc(value??'')+'"></label>';
 return '<details data-evidence-editor><summary>Реестр паспортных источников · данные I²t</summary>'+
  '<p>Создаётся неизменяемая запись исходного документа для введённых диапазонов I²t. Источник, страница, дата и специалист фиксируются; это документальный учёт, без физического исследования оборудования.</p>'+
  '<form data-evidence-record="'+esc(l.id)+'">'+
  field('evidenceId','Уникальный ID записи',null)+
  '<p>Ключ каталога: '+esc(l.catalogSku)+' · заводской артикул: '+esc(article?.sku??'не указан')+'</p>'+
  field('evidenceManufacturer','Изготовитель',article?.maker)+
  field('evidenceSeries','Серия',article?.series)+
  field('evidenceTitle','Название паспортного документа',null)+
  field('evidenceUrl','HTTPS-ссылка на документ',null)+
  field('evidenceRevision','Редакция / версия документа',null)+
  field('evidenceLocation','Страница и таблица/график I²t',null)+
  field('evidenceDate','Дата просмотра (ГГГГ-ММ-ДД)',null)+
  field('evidenceReviewer','Кто просмотрел источник',null)+
  '<label>Источник<select name="evidenceSourceType">'+
   '<option value="MANUFACTURER_DOCUMENT">Документ изготовителя</option>'+
   '<option value="THIRD_PARTY_MIRROR">Копия документа на стороннем сайте</option>'+
  '</select></label>'+
  '<label><input type="checkbox" name="evidenceChecked"> Страница и диапазоны проверены по указанному документу</label>'+
  '<button class="btn primary" type="submit">Создать запись и связать с расчётом</button>'+
  '</form><p>Зарегистрировано: '+esc(audit.records.length)+
  ' · замечания: '+esc(audit.issues.length)+
  ' · привязка текущей цепи: '+esc(d.evidenceRecordId??'не указана')+'</p></details>';
}
if(typeof module!=='undefined'&&module.exports)module.exports={epManufacturerEvidenceHtmlV1};

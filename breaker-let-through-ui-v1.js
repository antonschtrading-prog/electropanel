'use strict';
function epBreakerLetThroughBandHtmlV1(band={},index=0){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const field=(key,name)=>'<label>'+name+'<input data-let-through-band-field="'+key+'" value="'+esc(band[key]??'')+'"></label>';
 return '<fieldset data-let-through-band><legend>Гарантированный диапазон '+(index+1)+'</legend>'+
  field('minProspectiveA','Ik от, А')+field('maxProspectiveA','Ik до, А')+
  field('maxLetThroughA2s','Верхняя граница I²t, А²с')+
  field('source','Источник диапазона изготовителя')+
  '<button type="button" class="btn tiny" data-remove-let-through-band>Удалить</button></fieldset>';
}
function epBreakerLetThroughHtmlV1(project,lineId,lookup){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const line=Array.isArray(project?.lines)?project.lines.find(x=>x?.id===lineId):null;
 if(!line)return '<p>Выберите цепь.</p>';
 const d=line.letThroughInput||{};
 let article=null;try{article=lookup?.(line.catalogSku)||null;}catch(_){}
 const result=typeof epBreakerLetThroughV1==='function'?
  epBreakerLetThroughV1(project,line,article):null;
 const field=(name,label,v)=>'<label>'+label+'<input name="'+name+'" value="'+esc(v??'')+'"></label>';
 const select=(name,items,value)=>'<label>'+name+'<select name="'+name+'">'+items.map(([v,label])=>
  '<option value="'+v+'" '+(v===value?'selected':'')+'>'+label+'</option>').join('')+'</select></label>';
 const bands=Array.isArray(d.bands)&&d.bands.length?d.bands:[{}];
 return '<form data-let-through="'+esc(line.id)+'"><details data-let-through-editor>'+
  '<summary>Энергия пропускания автомата · паспортный предел I²t</summary>'+
  '<p>Указывайте только гарантированные производителем верхние границы энергии для конкретных условий испытания. Между диапазонами интерполяции нет.</p>'+
  field('letCatalogKey','Ключ в каталоге проекта',d.catalogKey??line.catalogSku)+
  field('letArticleSku','Артикул изготовителя',d.articleSku??article?.sku)+
  field('letArticleInA','Номинал выбранного аппарата, А',d.articleInA??article?.inA)+
  field('letStandard','Стандарт испытания аппарата',d.deviceStandard??article?.icnStandard)+
  field('letVoltage','Напряжение испытания, В',d.testVoltageV)+
  field('letFrequency','Частота испытания, Гц',d.testFrequencyHz)+
  field('letApplicationVoltage','Рабочее напряжение при КЗ, В',d.applicationVoltageV)+
  field('letApplicationFrequency','Частота сети, Гц',d.applicationFrequencyHz)+
  field('letPoles','Полюсов в паспортной конфигурации',d.protectionPoles??article?.poles)+
  select('letModel',[['','Выберите сценарий'],['SINGLE_PHASE_L_N','L–N'],['THREE_PHASE_POSITIVE_SEQUENCE','Трёхфазное симметричное']],d.faultModel)+
  field('letPoint','Точка КЗ',d.comparisonPoint)+
  select('letCurrentBasis',[['DECLARED_SCENARIO','Отдельный ожидаемый Ik'],['LINKED_MAXIMUM','Максимальный Ik из ядра']],d.currentBasis)+
  field('letCurrent','Ожидаемый Ik, А для отдельного сценария',d.prospectiveCurrentA)+
  field('letProspectiveSource','Источник расчёта ожидаемого Ik',d.prospectiveSource)+
  select('letRole',[['PHASE','Фазный проводник'],['NEUTRAL','Нейтральный проводник']],d.conductorRole)+
  select('letMaterial',[['','Материал'],['Cu','Медь'],['Al','Алюминий']],d.conductorMaterial)+
  field('letSection','Сечение проводника, мм²',d.sectionMm2)+
  field('letK','Коэффициент k, А√с/мм²',d.kA_SqrtS_PerMm2)+
  field('letManufacturerSource','Источник огибающей изготовителя',d.manufacturerSource)+
  field('letConditionSource','Источник условий испытания',d.testConditionSource)+
  field('letCableSource','Источник характеристик проводника',d.cableSource)+
  field('letKSource','Источник k и температурных условий',d.kSource)+
  '<div data-let-through-bands>'+bands.map(epBreakerLetThroughBandHtmlV1).join('')+'</div>'+
  '<button class="btn tiny" type="button" data-add-let-through-band>Добавить диапазон</button>'+
  '<label><input type="checkbox" name="letEnvelopeConfirmed" '+(d.manufacturerEnvelopeConfirmed?'checked':'')+
  '> Изготовитель гарантирует верхнюю границу для всего диапазона</label>'+
  '<label><input type="checkbox" name="letCableReviewed" '+(d.conductorApplicationReviewed?'checked':'')+
  '> Совместимость проводника и аппарата проверена</label>'+
  '<label><input type="checkbox" name="letTemperatureConfirmed" '+(d.temperatureBasisConfirmed?'checked':'')+
  '> Основание температурных пределов k проверено</label>'+
  '<button type="submit" class="btn primary">Проверить и сохранить I²t</button></details></form>'+
  '<p>I²t максимум: '+esc(result?.letThroughUpperBoundA2s??'не определён')+
  ' А²с · допустимо: '+esc(result?.conductorCapacityA2s??'не определено')+
  ' А²с · '+esc(result?.numericalStatus??'UNKNOWN')+
  ' · '+esc((result?.issues||[]).map(x=>x.code).join('; '))+'</p>';
}
if(typeof module!=='undefined'&&module.exports)module.exports={
 epBreakerLetThroughHtmlV1,epBreakerLetThroughBandHtmlV1};

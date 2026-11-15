'use strict';
function epFaultRouteHtmlV2(project,lineId,lookup){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const line=project.lines.find(x=>x.id===lineId)||project.lines[0];if(!line)return '<p>Добавьте цепь для расчёта петли замыкания.</p>';
 const input=line.faultRouteInput||{},r=epFaultRouteReviewV2(project,line,lookup);
 const field=(name,title,value,required=true)=>'<label>'+title+'<input name="'+name+'" value="'+esc(value??'')+'" '+(required?'required':'')+'></label>';
 const labels={FAULT_ROUTE_INPUT_MISSING:'Введите исходные данные трассы',FAULT_ROUTE_TN_REQUIRED:'Этот расчёт применим только к TN-S и TN-C-S',FAULT_ROUTE_BASIS_CHANGED:'Изменены аппарат, фаза, сечение или система заземления: пересмотрите основания',FAULT_ROUTE_CURRENT_BELOW_IA:'Минимальный ток ниже заданного Ia',FAULT_ROUTE_ARTICLE_REQUIRED:'Выберите конкретный аппарат',FAULT_ROUTE_TRIP_TIME_EVIDENCE_MISSING:'Укажите Ia, время и источники их определения',FAULT_ROUTE_NETWORK_SOURCE_MISSING:'Нет источника сопротивления питающей сети',FAULT_ROUTE_CONDUCTOR_SOURCE_MISSING:'Нет источника параметров проводника',FAULT_ROUTE_TEMPERATURE_BASIS_MISSING:'Не подтверждена расчётная температура сопротивлений',FAULT_ROUTE_SINGLE_PHASE_SCOPE_UNCONFIRMED:'Для трёхфазной цепи применимость этой однофазной модели петли L–PE требует отдельного обоснования',FAULT_ROUTE_POLES_APPLICABILITY_UNCONFIRMED:'Число полюсов аппарата не соответствует ограниченной модели однофазной цепи',FAULT_ROUTE_ARTICLE_RATING_UNCONFIRMED:'Номинал и число полюсов аппарата не подтверждены',FAULT_ROUTE_NETWORK_SOURCE_TOO_LONG:'Слишком длинное описание источника сети',FAULT_ROUTE_CONDUCTOR_SOURCE_TOO_LONG:'Слишком длинное описание источника проводника',FAULT_ROUTE_EVIDENCE_SOURCE_TOO_LONG:'Слишком длинное описание источника времени отключения'};
 const segments=Array.isArray(input.segments)&&input.segments.length?input.segments:[{}];
 return '<details class="ep-fault-route"><summary>Петля L–PE · минимальный ток замыкания · '+esc(line.id)+'</summary>'+
 '<p>Одна радиальная TN-цепь без параллельных источников и путей. R проводников задаётся при расчётной температуре; коэффициент напряжения, Ia и допустимое время указываются с основаниями. Значения по умолчанию не подставляются.</p>'+
 '<form data-fault-route="'+esc(line.id)+'"><div class="ep-engineering-fields">'+
 field('u0V','U0, В',input.u0V)+field('cmin','cmin (0…1)',input.cmin)+field('sourceROhm','R питающей сети, Ом',input.sourceROhm)+field('sourceXOhm','X питающей сети, Ом',input.sourceXOhm)+field('networkSource','Источник данных сети',input.networkSource)+
 field('iaA','Ia при заданном времени, А',input.iaA)+field('requiredTimeS','Требуемое время отключения, с',input.requiredTimeS)+field('tripSource','Паспорт / кривая аппарата для Ia',input.tripSource)+field('timeSource','Основание допустимого времени',input.timeSource)+'</div>'+
 '<div data-route-segments>'+segments.map((s,i)=>epFaultSegmentHtmlV2(s,i)).join('')+'</div><button type="button" class="btn tiny" data-add-route-segment>Добавить участок</button>'+
 epTripEnvelopeFieldsV1(input.tripEnvelope)+
 ' <button type="submit" class="btn primary">Рассчитать и сохранить трассу</button></form>'+
 '<div class="ep-route-result"><strong>Статус данных: '+esc(r.status)+' · Численное сравнение: '+esc(r.thresholdStatus)+'</strong><strong>Ik,min: '+(r.ikMinA===null?'не рассчитан':esc(r.ikMinA.toFixed(2))+' А')+'</strong><span>Zs: '+(r.zsOhm===null?'—':esc(r.zsOhm.toFixed(5))+' Ом')+'</span><span>Сравнение с Ia: '+esc(r.thresholdStatus)+'</span></div>'+
 '<p>Максимальный ток для Icn: '+esc(r.maxFaultCurrentKa??'не задан')+' кА — отдельное исходное значение. Минимальный ток его не заменяет.</p>'+
 '<p>Паспортная огибающая времени отключения: '+esc(r.tripEnvelope?.numericalStatus??'нет данных')+
  ' · гарантированная верхняя граница: '+esc(r.tripEnvelope?.guaranteedMaxTimeS??'не определена')+
  ' с · требуемый ток: '+esc(r.tripEnvelope?.requiredCurrentA??'не определён')+' А</p>'+
 '<ul>'+r.issues.map(i=>'<li>'+esc(labels[i.code]||i.code)+'</li>').join('')+'</ul><p>Численное сравнение не подтверждает нормативную применимость или селективность.</p></details>';
}
function epFaultSegmentHtmlV2(s={},index=0){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fields=[['lengthM','Длина, м'],['phaseROhmKm','R фазы, Ом/км'],['peROhmKm','R PE, Ом/км'],['phaseXOhmKm','X фазы, Ом/км'],['peXOhmKm','X PE, Ом/км'],['source','Источник данных проводников']];
 return '<fieldset data-route-segment><legend>Участок '+(index+1)+'</legend><div class="ep-engineering-fields">'+fields.map(([key,label])=>'<label>'+label+'<input data-segment-field="'+key+'" value="'+esc(s[key]??'')+'" required></label>').join('')+'</div><label><input type="checkbox" data-segment-temperature '+(s.temperatureBasisConfirmed?'checked':'')+'> R соответствует расчётной температуре проводников</label> <button type="button" class="btn tiny" data-remove-route-segment>Удалить участок</button></fieldset>';
}

function epTripEnvelopePointHtmlV1(point={},index=0){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 return '<fieldset data-trip-envelope-point><legend>Паспортная точка '+(index+1)+'</legend>'+
 '<label>Ток, А<input data-trip-point-field="currentA" value="'+esc(point.currentA??'')+'"></label>'+
 '<label>Гарантированное максимальное время, с<input data-trip-point-field="maxTimeS" value="'+esc(point.maxTimeS??'')+'"></label> '+
 '<button type="button" class="btn tiny" data-remove-trip-point>Удалить</button></fieldset>';
}
function epTripEnvelopeFieldsV1(input){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const x=input||{};
 const pts=Array.isArray(x.points)&&x.points.length?x.points:[{}];
 return '<details data-trip-envelope-panel><summary>Паспортная времятоковая огибающая · необязательно</summary>'+
 '<p>Вводите только подтверждённые изготовителем верхние пределы времени отключения для указанного тока. Между точками интерполяция не выполняется. Без основания положительный вывод запрещён.</p>'+
 '<label>Артикул<input name="tripArticleSku" value="'+esc(x.articleSku??'')+'"></label>'+
 '<label>Номинал аппарата, А<input name="tripArticleRatingA" value="'+esc(x.articleRatingA??'')+'"></label>'+
 '<label>Характеристика аппарата<input name="tripCurve" value="'+esc(x.curve??'')+'"></label>'+
 '<label>Источник паспортной гарантии<input name="tripSourceEvidence" value="'+esc(x.source??'')+'"></label>'+
 '<label><input name="tripGuaranteeBasis" type="checkbox" '+(x.guaranteeBasisConfirmed===true?'checked':'')+'> Проверена применимость верхней границы времени к данному аппарату</label>'+
 '<div data-trip-envelope-points>'+pts.map(epTripEnvelopePointHtmlV1).join('')+'</div>'+
 '<button type="button" class="btn tiny" data-add-trip-point>Добавить паспортную точку</button>'+
 '<label><input name="tripEnvelopeEnabled" type="checkbox" '+(input?'checked':'')+'> Применить паспортную огибающую при расчёте</label></details>';
}

if(typeof module!=='undefined'&&module.exports)module.exports={epFaultRouteHtmlV2,epFaultSegmentHtmlV2,epTripEnvelopeFieldsV1,epTripEnvelopePointHtmlV1};

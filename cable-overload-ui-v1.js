'use strict';
// Engineer-entered Iz correction factors and manufacturer conventional I2.
function epCableOverloadFieldsV1(input,line,article){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const x=input||{},factors=Array.isArray(x.factors)&&x.factors.length?x.factors:[{}];
 const field=(key,title,v)=>'<label>'+title+'<input name="'+key+'" value="'+esc(v??'')+'"></label>';
 const option=factors.map((f,i)=>epCableOverloadFactorHtmlV1(f,i)).join('');
 return '<details data-cable-overload-input><summary>Защита кабеля · Iz с поправками и паспортный ток I2</summary>'+
 '<p>Введите исходную токовую нагрузку кабеля, корректирующие коэффициенты не более 1,0 и паспортный I2. Значения не подставляются автоматически. Числовая проверка не подтверждает нормативную пригодность.</p>'+
 field('overloadBaseIz','Iz при исходных условиях, А',x.baseIzA)+
 field('overloadBaseSource','Источник Iz и условия прокладки',x.baseIzSource)+
 field('overloadI2','I2 гарантированного действия, А',x.i2A)+
 field('overloadI2Source','Источник паспортного I2',x.i2Source)+
 field('overloadI2Standard','Стандарт и пункт для I2',x.i2Standard)+
 field('overloadApplicability','Основание применения характеристик',x.applicabilitySource)+
 '<label>Артикул<input name="overloadSku" value="'+esc(x.articleSku??line?.catalogSku??'')+'"></label>'+
 '<p>Аппарат: '+esc(article?.label??line?.device??'не выбран')+'; номинал: '+
 esc(article?.inA??'не указан')+' А</p>'+
 '<div data-overload-factor-rows>'+option+'</div>'+
 '<button type="button" class="btn tiny" data-add-overload-factor>Добавить поправочный коэффициент</button>'+
 '<label><input name="overloadApplicable" type="checkbox" '+(x.applicationReviewed?'checked':'')+
 '> Основания применения коэффициентов и I2 рассмотрены</label>'+
 '<label><input name="overloadEnable" type="checkbox" '+(input?'checked':'')+
 '> Сохранить исходные данные и проверить перегрузку</label>'+
 '<button type="submit" class="btn primary" data-overload-save>Проверить и сохранить</button></details>';
}
function epCableOverloadFactorHtmlV1(f={},i=0){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 return '<fieldset data-overload-factor><legend>Коэффициент '+(i+1)+'</legend>'+
 '<label>Название / вид поправки<input data-overload-key="id" value="'+esc(f.id??'')+'"></label>'+
 '<label>Множитель (0…1)<input data-overload-key="value" value="'+esc(f.value??'')+'"></label>'+
 '<label>Источник коэффициента<input data-overload-key="source" value="'+esc(f.source??'')+'"></label>'+
 '<button type="button" class="btn tiny" data-remove-overload-factor>Удалить</button></fieldset>';
}
function epCableOverloadHtmlV1(project,lineId,lookup){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const line=Array.isArray(project?.lines)?project.lines.find(x=>x?.id===lineId):null;
 if(!line)return '<p>Выберите цепь для проверки перегрузки.</p>';
 let article=null;try{article=lookup?.(line.catalogSku)||null;}catch(_){}
 const result=typeof epCableOverloadCoordinationV1==='function'?
  epCableOverloadCoordinationV1(project,line,article):null;
 return '<form data-cable-overload="'+esc(line.id)+'">'+
  epCableOverloadFieldsV1(line.overloadCoordinationInput,line,article)+
  '<p>Iz с поправками: '+esc(result?.correctedIzA??'не рассчитан')+
   ' А · I2: '+esc(result?.i2A??'не указан')+
   ' А · предел: '+esc(result?.i2LimitA??'не рассчитан')+
   ' А · проверка: '+esc(result?.i2IzStatus??'UNKNOWN')+'</p>'+
  '<p>Итог: '+esc(result?.status??'UNKNOWN')+
   ' · '+esc((result?.issues||[]).map(i=>i.code).join('; '))+'</p></form>';
}
if(typeof module!=='undefined'&&module.exports)
 module.exports={epCableOverloadFieldsV1,epCableOverloadFactorHtmlV1,epCableOverloadHtmlV1};

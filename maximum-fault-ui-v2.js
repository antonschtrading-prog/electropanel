'use strict';
// Editing interface for declared maximum prospective fault-current models.
// Never supplies implicit impedance, fault level, cmax or certification.
function epMaximumFaultSegmentHtmlV2(segment={},three=true,index=0){
 const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const pairs=three?
  [['r1OhmKm','R1, Ом/км'],['x1OhmKm','X1, Ом/км']]:
  [['phaseROhmKm','R фазы, Ом/км'],['neutralROhmKm','R нейтрали, Ом/км'],
   ['phaseXOhmKm','X фазы, Ом/км'],['neutralXOhmKm','X нейтрали, Ом/км']];
 const field=(key,title)=>'<label>'+title+'<input data-max-segment-field="'+key+'" required value="'+esc(segment[key]??'')+'"></label>';
 return '<fieldset data-max-segment><legend>Участок '+(index+1)+'</legend><div class="ep-engineering-fields">'+
  field('lengthM','Длина, м')+pairs.map(([key,label])=>field(key,label)).join('')+
  field('source','Источник R/X при расчётной температуре')+'</div>'+
  '<label><input type="checkbox" data-max-segment-temperature '+(segment.temperatureBasisConfirmed===true?'checked':'')+
  '> Температурное основание R/X подтверждено</label> '+
  '<button type="button" class="btn tiny" data-remove-max-segment>Удалить участок</button></fieldset>';
}
function epMaximumFaultHtmlV2(project,lineId,lookup){
 const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const line=Array.isArray(project?.lines)?
  project.lines.find(l=>l?.id===lineId)||project.lines.find(Boolean):null;
 if(!line)return '<p>Добавьте цепь для расчёта максимального тока КЗ.</p>';
 const input=line.maximumFaultInput||{};
 const result=typeof epMaximumFaultCurrentV2==='function'?
  epMaximumFaultCurrentV2(project,line,lookup):{status:'UNKNOWN',issues:[],ikMaxKa:null,thresholdStatus:'UNKNOWN'};
 const field=(key,title,val)=>'<label>'+title+'<input name="'+key+'" required value="'+esc(val??'')+'"></label>';
 const models=[
  {id:'THREE_PHASE_POSITIVE_SEQUENCE',three:true,title:'Трёхфазное симметричное КЗ (Z1)'},
  {id:'SINGLE_PHASE_L_N',three:false,title:'Однофазное замыкание L–N'}
 ];
 const forms=models.map(m=>{
  const current=input.model===m.id?input:{};
  const segments=Array.isArray(current.segments)&&current.segments.length?current.segments:[{}];
  const form='<form data-max-fault="'+esc(line.id)+'" data-max-fault-model="'+m.id+'">'+
   '<div class="ep-engineering-fields">'+
    field(m.three?'uLLV':'u0V',m.three?'ULL, В':'U0, В',current[m.three?'uLLV':'u0V'])+
    field('cmax','cmax (1…1,2)',current.cmax)+
    field('sourceROhm','R источника, Ом',current.sourceROhm)+
    field('sourceXOhm','X источника, Ом',current.sourceXOhm)+
    field('networkSource','Источник эквивалента питающей сети',current.networkSource)+
   '</div><div data-max-segments>'+
    segments.map((segment,i)=>epMaximumFaultSegmentHtmlV2(segment,m.three,i)).join('')+
   '</div><button class="btn tiny" type="button" data-add-max-segment>Добавить участок</button> '+
   '<button type="submit" class="btn primary">Рассчитать и сохранить Ik,max</button></form>';
  return '<details '+(input.model===m.id?'open':'')+'><summary>'+m.title+'</summary>'+form+'</details>';
 }).join('');
 const numeric=result.ikMaxKa===null?'не рассчитан':Number(result.ikMaxKa).toFixed(3)+' кА';
 return '<details class="ep-fault-route"><summary>Максимальный ток КЗ · '+esc(line.id)+'</summary>'+
  '<p>Модели используют только заданные инженером R/X, cmax и напряжение. Это не автоматический расчёт IEC 60909. Не подставляйте сопротивление L–PE в модель трёхфазного КЗ.</p>'+
  forms+'<p><strong>Ik,max: '+esc(numeric)+'</strong> · '+esc(result.thresholdStatus)+
  ' · '+esc(result.status)+'</p><p>Арифметическое сравнение Icn: '+
  esc(result.numericComparison??'нет')+'</p>'+
  '<ul>'+result.issues.map(i=>'<li>'+esc(i.code)+'</li>').join('')+'</ul>'+
  '<p>Полученный результат не подтверждает селективность, нормативное соответствие или пригодность к монтажу.</p></details>';
}
if(typeof module!=='undefined'&&module.exports)module.exports={epMaximumFaultHtmlV2,epMaximumFaultSegmentHtmlV2};

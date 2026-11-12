'use strict';
// Preliminary comparison of declared prospective short-circuit current with
// the catalogue Icn rating. NOT a verified breaking-capacity or design check.
// In particular, Icn, Icu, Ics and cascading/back-up ratings are NOT interchangeable.
function epParsePositiveCurrentKa(value) {
 if(typeof value!=='string'&&typeof value!=='number')return null;
 const raw=String(value).trim();
 if(!/^(?:[0-9]{1,5})(?:[.,][0-9]{1,3})?$/.test(raw))return null;
 const n=Number(raw.replace(',','.'));
 return Number.isFinite(n)&&n>0?n:null;
}
function epBreakingCapacityCheck(catalogueArticle,declaredIkKa) {
 if(declaredIkKa===undefined||declaredIkKa===null||String(declaredIkKa).trim()==='')
  return {status:'UNKNOWN',message:'Ожидаемый ток КЗ не задан',engineeringApproved:false};
 const ik=epParsePositiveCurrentKa(declaredIkKa);
 if(ik===null)return {status:'INVALID',message:'Ток КЗ должен быть положительным числом в кА (до 3 знаков после запятой)',engineeringApproved:false};
 if(!catalogueArticle||catalogueArticle.kind!=='MCB'||typeof catalogueArticle.icnKa!=='number'||!(catalogueArticle.icnKa>0))
  return {status:'UNKNOWN',message:'Нет сопоставимого паспортного значения Icn для данного автомата',engineeringApproved:false};
 if(ik>catalogueArticle.icnKa)
  return {status:'FAIL',message:'Заявленный ток КЗ превышает Icn выбранного автомата',ikKa:ik,icnKa:catalogueArticle.icnKa,engineeringApproved:false};
 return {status:'PRELIMINARY_PASS',message:'Арифметически Iкз не превышает Icn, но применимость и условия испытаний не подтверждены',ikKa:ik,icnKa:catalogueArticle.icnKa,engineeringApproved:false};
}

function epCurrentInputCompleteness(values) {
 if(!values||typeof values!=='object')return 'EMPTY';
 const entries=['ibA','inA','izA','i2A'].map(key=>values[key]!==undefined&&values[key]!==null&&String(values[key]).trim()!=='');
 if(entries.every(Boolean))return 'COMPLETE';
 if(entries.some(Boolean))return 'PARTIAL';
 return 'EMPTY';
}


// Transport-neutral migration layer: pure JavaScript, no Python API or network.
// All results are preliminary and intentionally distinct from engineer approval.
function epEngineeringPreflight(project, lookupArticle, overloadArithmetic) {
 if(!project||!Array.isArray(project.lines))throw Error('Некорректный проект');
 if(typeof lookupArticle!=='function'||typeof overloadArithmetic!=='function')
  throw Error('Требуются обработчики каталога и арифметики токов');
 const lines=project.lines.map(line=>{
  const article=line.catalogSku?lookupArticle(line.catalogSku):null;
  const rules=[];
  const add=(code,status,detail)=>rules.push({code,status,detail});
  if(line.calculationReview?.required)add('STALE_CALCULATION','BLOCKED','Введённые ранее исходные данные требуют повторной проверки');
  if(!line.catalogSku)add('ARTICLE','UNKNOWN','Конкретный артикул аппарата не выбран');
  else if(!article)add('ARTICLE','BLOCKED','Артикул отсутствует в каталоге');
  const overload=overloadArithmetic(line.overloadInput);
  if(overload?.numericStatus==='FAIL')add('OVERLOAD_ARITHMETIC','BLOCKED','Нарушены неравенства для заявленных Ib, In, Iz, I2');
  else if(overload?.numericStatus==='PASS')add('OVERLOAD_ARITHMETIC','PRELIMINARY','Арифметика токов сходится; данные и применимость не верифицированы');
  else add('OVERLOAD_ARITHMETIC','UNKNOWN','Нельзя проверить перегрузку: недостаточно корректных токов');
  const fault=epBreakingCapacityCheck(article,line.faultInput?.ikKa);
  if(fault.status==='FAIL'||fault.status==='INVALID')
   add('FAULT_CAPACITY','BLOCKED',fault.message);
  else if(fault.status==='PRELIMINARY_PASS')
   add('FAULT_CAPACITY','PRELIMINARY',fault.message);
  else add('FAULT_CAPACITY','UNKNOWN',fault.message);
  if(line.faultInput?.ikKa&&!String(line.faultInput.source||'').trim())
   add('FAULT_SOURCE','UNKNOWN','Нет ссылки на расчёт или измерение тока КЗ');
  add('APPLICABILITY','UNKNOWN','Не проверены нормативная применимость, кабель, автоматическое отключение, PE/N, селективность и нагрев');
  const status=rules.some(x=>x.status==='BLOCKED')?'BLOCKED':
   rules.some(x=>x.status==='UNKNOWN')?'UNKNOWN':'PRELIMINARY';
  return {circuitId:line.id,status,rules,engineeringApproved:false};
 });
 const counts={BLOCKED:0,UNKNOWN:0,PRELIMINARY:0};
 for(const l of lines)counts[l.status]++;
 return {status:counts.BLOCKED?'BLOCKED':'UNKNOWN',counts,lines,engineeringApproved:false};
}

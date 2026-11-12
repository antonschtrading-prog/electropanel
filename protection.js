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

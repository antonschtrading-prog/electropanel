'use strict';
// Persist declared inputs, never trust serialized derived reports or approval flags.
function epRestoreProjectExtensionsV2(raw,project){
 const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 const clone=(value,label,limit=100000)=>{
  let count=0;
  const walk=(v,depth)=>{
   if(depth>16||++count>20000)throw Error(label+': слишком сложные данные');
   if(v===null||typeof v==='boolean')return v;
   if(typeof v==='number'){if(!Number.isFinite(v))throw Error(label+': некорректное число');return v;}
   if(typeof v==='string'){if(v.length>10000)throw Error(label+': слишком длинная строка');return v;}
   if(Array.isArray(v)){if(v.length>1000)throw Error(label+': слишком много записей');return v.map(x=>walk(x,depth+1));}
   if(!object(v))throw Error(label+': некорректный тип');
   const result={};
   for(const [k,x] of Object.entries(v)){
    if(['__proto__','constructor','prototype'].includes(k))throw Error(label+': недопустимый ключ');
    result[k]=walk(x,depth+1);
   }
   return result;
  };
  const result=walk(value,0);if(JSON.stringify(result).length>limit)throw Error(label+': превышен размер');return result;
 };
 if(raw.projectExtensionsVersion!==undefined&&raw.projectExtensionsVersion!==1)
  throw Error('Неподдерживаемая версия расширений проекта');
 const objects=['evidence','network','enclosure','dinEvidence'];
 const arrays=['catalogArticles','dinPlacementsV1','manualLayoutV1','cables'];
 for(const key of objects)if(raw[key]!==undefined){if(!object(raw[key]))throw Error(key+': ожидается объект');project[key]=clone(raw[key],key);}
 for(const key of arrays)if(raw[key]!==undefined){if(!Array.isArray(raw[key])||raw[key].length>500)throw Error(key+': ожидается массив до 500 записей');project[key]=clone(raw[key],key,250000);}
 if(project.catalogArticles!==undefined){
  if(typeof epProjectCatalogV1!=='function')throw Error('Модуль каталога недоступен');
  const audit=epProjectCatalogV1(project,typeof EP_CATALOG==='object'?EP_CATALOG:{});
  if(audit.issues.length)throw Error('Некорректный каталог: '+audit.issues.map(x=>x.code).join(', '));
 }
 for(const line of project.lines){
  const source=raw.lines.find(x=>x.id===line.id);if(!source)continue;
  for(const key of ['loadCurrentCalculation','cableReferenceInput','cableDesignInput','voltageDropDesignInput','coordinationEvidence','faultLoopEvidence']){
   if(source[key]===undefined)continue;
   if(!object(source[key]))throw Error(key+': ожидается объект');
   line[key]=clone(source[key],key,20000);
  }
  if(typeof source.protectionInputSource==='string')line.protectionInputSource=source.protectionInputSource.slice(0,100);
  const saved=line.loadCurrentCalculation;
  if(saved){
   const result=typeof epLoadCurrentV1==='function'?epLoadCurrentV1({mode:saved.mode,...saved.inputs}):null;
   const stale=saved.stale===true||!result||result.status!=='CALCULATED'||
    Number(saved.roundedIbA)!==result.roundedIbA||Number(line.overloadInput?.ibA)!==result.roundedIbA||
    (line.phase==='3Ф'?saved.mode!=='three_phase':saved.mode!=='single_phase');
   if(result?.status==='CALCULATED')line.loadCurrentCalculation={mode:result.mode,inputs:result.inputs,
    formula:result.formula,ibA:result.ibA,roundedIbA:result.roundedIbA,assumptions:result.assumptions,
    powerSource:saved.powerSource==='circuit'?'circuit':'manual',stale};
   else saved.stale=true;
   if(stale)line.calculationReview={required:true,reason:'IMPORTED_CURRENT_REQUIRES_REVIEW'};
  }
 }
 project.projectExtensionsVersion=1;
 return project;
}
if(typeof module!=='undefined'&&module.exports)module.exports={epRestoreProjectExtensionsV2};

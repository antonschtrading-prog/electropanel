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
 if(raw.fireControlV1!==undefined){
  if(typeof epFireControlAuditV1!=='function')throw Error('FIRE_CONTROL_MODULE_MISSING');
  const data=clone(raw.fireControlV1,'fireControlV1',150000);
  const audit=epFireControlAuditV1(project,data);
  if(audit.status==='BLOCKED')throw Error('FIRE_CONTROL_IMPORT_INVALID');
  if(typeof epFireControlDesignV1!=='function')throw Error('FIRE_CONTROL_DESIGN_MODULE_MISSING');
  if(epFireControlDesignV1({...project,fireControlV1:data}).status==='BLOCKED')throw Error('FIRE_CONTROL_DESIGN_IMPORT_INVALID');
  if(typeof epFireControlWiringV1!=='function')throw Error('FIRE_CONTROL_WIRING_MODULE_MISSING');
  if(epFireControlWiringV1({...project,fireControlV1:data}).status==='BLOCKED')throw Error('FIRE_CONTROL_WIRING_IMPORT_INVALID');
  project.fireControlV1=data;
 }
 if(raw.consumerGroupMergeRulesV1!==undefined){
  if(typeof epGroupMergeRulesV1!=='function')
   throw Error('Модуль объединения групп недоступен');
  project.consumerGroupMergeRulesV1=
   epGroupMergeRulesV1(raw.consumerGroupMergeRulesV1);
 }
 if(raw.consumerGroupSplitRulesV1!==undefined){
  if(typeof epGroupSplitRulesV1!=='function')
   throw Error('Модуль правил группировки недоступен');
  project.consumerGroupSplitRulesV1=
   epGroupSplitRulesV1(raw.consumerGroupSplitRulesV1);
 }
 if(raw.workflowDesignInputsV1!==undefined){
  if(typeof epWorkflowInputsV1!=='function')
   throw Error('Модуль единого проектного маршрута недоступен');
  project.workflowDesignInputsV1=
   epWorkflowInputsV1(raw.workflowDesignInputsV1);
 }
 if(raw.designReviewNoticeV1!==undefined){
  if(typeof epDesignReviewNoticeNormalizeV1!=='function')
   throw Error('DESIGN_REVIEW_NOTICE_MODULE_MISSING');
  project.designReviewNoticeV1=epDesignReviewNoticeNormalizeV1(raw.designReviewNoticeV1);
 }
 if(raw.designStageV1!==undefined){
  if(!['PRELIMINARY','BOARD_DESIGN','DETAILED'].includes(raw.designStageV1))
   throw Error('Неизвестная стадия проектирования');
  project.designStageV1=raw.designStageV1;
 }
 if(raw.designRequirementsV1!==undefined){
  if(!object(raw.designRequirementsV1)||
   Object.keys(raw.designRequirementsV1).some(k=>!['selectivity','externalNetwork'].includes(k))||
   Object.values(raw.designRequirementsV1).some(v=>typeof v!=='boolean'))
   throw Error('Некорректные требования к необязательным проверкам');
  project.designRequirementsV1=clone(raw.designRequirementsV1,'designRequirementsV1',2000);
 }
 if(raw.cabinetGeometryV1!==undefined){
  if(typeof epCabinetGeometryNormalizeV1!=='function')throw Error('CABINET_GEOMETRY_MODULE_MISSING');
  project.cabinetGeometryV1=epCabinetGeometryNormalizeV1(raw.cabinetGeometryV1);
 }
 if(raw.projectExtensionsVersion!==undefined&&raw.projectExtensionsVersion!==1)
  throw Error('Неподдерживаемая версия расширений проекта');
 const objects=['evidence','network','enclosure','dinEvidence'];
 const arrays=['catalogArticles','dinPlacementsV1','manualLayoutV1','cables','manufacturerEvidenceRecords'];
 for(const key of objects)if(raw[key]!==undefined){if(!object(raw[key]))throw Error(key+': ожидается объект');project[key]=clone(raw[key],key);}
 for(const key of arrays)if(raw[key]!==undefined){if(!Array.isArray(raw[key])||raw[key].length>500)throw Error(key+': ожидается массив до 500 записей');project[key]=clone(raw[key],key,250000);}
 if(raw.incomingMaximumStudiesV1!==undefined){
  if(typeof epIncomingMaximumNormalizeV1!=='function')
   throw Error('Модуль Ik,max на вводных аппаратах недоступен');
 }
 if(raw.calculatedDeviceFaultBindingsV1!==undefined){
  if(typeof epCalculatedDeviceFaultNormalizeV1!=='function')
   throw Error('Модуль привязки расчётного тока КЗ недоступен');
 }
 if(raw.deviceCoordinationEvidenceV1!==undefined){
  if(typeof epCoordNormalizeV1!=='function')throw Error('Модуль доказательств селективности недоступен');
 }
 if(raw.deviceFaultScenariosV1!==undefined){
  if(typeof epDeviceFaultNormalizeV1!=='function')
   throw Error('Модуль проверки токов КЗ в точках аппаратов недоступен');
 }
 if(raw.deviceSupplyV1!==undefined){
  if(raw.incomingTerminalBindingsV1!==undefined&&typeof epIncomingTerminalBindingsNormalizeV1!=='function')
   throw Error('Модуль привязки вводных аппаратов недоступен');
  if(typeof epDeviceSupplyValidateV1!=='function')throw Error('Модуль питания устройств недоступен');
  project.deviceSupplyV1=epDeviceSupplyValidateV1(project,raw.deviceSupplyV1);
 }
 // If both are present, bind only after restoring the versioned incoming inventory.
 if(raw.incomingTerminalBindingsV1!==undefined){
  project.incomingTerminalBindingsV1=
   epIncomingTerminalBindingsNormalizeV1(project,raw.incomingTerminalBindingsV1);
 }
 if(raw.incomingMaximumStudiesV1!==undefined)
  project.incomingMaximumStudiesV1=
   epIncomingMaximumNormalizeV1(project,raw.incomingMaximumStudiesV1);
 if(raw.calculatedDeviceFaultBindingsV1!==undefined)
  project.calculatedDeviceFaultBindingsV1=
   epCalculatedDeviceFaultNormalizeV1(project,raw.calculatedDeviceFaultBindingsV1);
 if(raw.deviceFaultScenariosV1!==undefined)
  project.deviceFaultScenariosV1=epDeviceFaultNormalizeV1(project,raw.deviceFaultScenariosV1);
 if(raw.deviceCoordinationEvidenceV1!==undefined)
  project.deviceCoordinationEvidenceV1=epCoordNormalizeV1(project,raw.deviceCoordinationEvidenceV1);
 if(raw.protectionLinksVersion!==undefined&&raw.protectionLinksVersion!==1)
  throw Error('Неподдерживаемая версия иерархии защиты');
 if(raw.protectionLinks!==undefined){
  if(raw.protectionLinksVersion!==1)throw Error('У иерархии защиты отсутствует номер версии');
  if(typeof epProtectionLinksValidateV1!=='function')
   throw Error('Модуль проверки иерархии недоступен');
  project.protectionLinks=epProtectionLinksValidateV1(project,raw.protectionLinks);
  project.protectionLinksVersion=1;
 }else if(raw.protectionLinksVersion===1){
  throw Error('Отсутствует список иерархии защиты');
 }
 if(project.catalogArticles!==undefined){
  if(typeof epProjectCatalogV1!=='function')throw Error('Модуль каталога недоступен');
  const audit=epProjectCatalogV1(project,typeof EP_CATALOG==='object'?EP_CATALOG:{});
  if(audit.issues.length)throw Error('Некорректный каталог: '+audit.issues.map(x=>x.code).join(', '));
 }
 for(const line of project.lines){
  const source=raw.lines.find(x=>x.id===line.id);if(!source)continue;
  for(const key of ['loadCurrentCalculation','cableReferenceInput','cableDesignInput','overloadCoordinationInput','shortCircuitThermalInput','letThroughInput','voltageDropDesignInput','coordinationEvidence','faultLoopEvidence','faultRouteInput','maximumFaultInput']){
   if(source[key]===undefined)continue;
   if(!object(source[key]))throw Error(key+': ожидается объект');
   line[key]=clone(source[key],key,20000);
  }
  if(source.articleReplacementReview!==undefined){
   const review=source.articleReplacementReview;
   if(!object(review)||review.required!==true||
      !(review.from===null||typeof review.from==='string')||
      typeof review.to!=='string'||review.to.length>100||
      !Array.isArray(review.warnings)||review.warnings.length>30||
      review.warnings.some(x=>typeof x!=='string'||x.length>100))
    throw Error('articleReplacementReview: некорректный журнал замены');
   // A serialized approval flag may never acknowledge a replacement.
   line.articleReplacementReview={required:true,from:review.from,to:review.to,
    warnings:review.warnings.slice(),engineeringApproved:false};
   if(line.catalogSku!==review.to)
    line.articleReplacementReview.warnings.push('ARTICLE_SELECTION_CHANGED_SINCE_REVIEW');
  }
  if(typeof source.protectionInputSource==='string')line.protectionInputSource=source.protectionInputSource.slice(0,100);
  const saved=line.loadCurrentCalculation;
  if(saved){
   const result=typeof epLoadCurrentV1==='function'?epLoadCurrentV1({mode:saved.mode,...saved.inputs}):null;
   const linkedPower=line.power??line.powerKw;
   const linkedMismatch=saved.powerSource==='circuit'&&
    (linkedPower===null||linkedPower===undefined||
     Number(linkedPower)!==Number(saved.inputs?.powerKw));
   const stale=saved.stale===true||!result||result.status!=='CALCULATED'||
    Number(saved.roundedIbA)!==result.roundedIbA||Number(line.overloadInput?.ibA)!==result.roundedIbA||
    (line.phase==='3Ф'?saved.mode!=='three_phase':saved.mode!=='single_phase')||linkedMismatch;
   if(result?.status==='CALCULATED')line.loadCurrentCalculation={mode:result.mode,inputs:result.inputs,
    formula:result.formula,ibA:result.ibA,roundedIbA:result.roundedIbA,assumptions:result.assumptions,
    powerSource:saved.powerSource==='circuit'?'circuit':'manual',stale};
   else saved.stale=true;
   if(stale){
    if(typeof epMarkCalculationReviewV1==='function')
     epMarkCalculationReviewV1(line,'IMPORTED_CURRENT_REQUIRES_REVIEW',['overloadInput','overloadV30','lv43Input'],true);
    else{
     const valid=['overloadInput','faultInput','overloadV30','lv43Input','route44Input'];
     const previous=line.calculationReview||{};
     const pending=new Set(Array.isArray(previous.pending)?previous.pending.filter(x=>valid.includes(x)):[]);
     for(const key of ['overloadInput','overloadV30','lv43Input'])if(line[key])pending.add(key);
     line.calculationReview={...previous,required:true,reason:'IMPORTED_CURRENT_REQUIRES_REVIEW',pending:[...pending]};
    }
   }
  }
 }
 project.projectExtensionsVersion=1;
 return project;
}
if(typeof module!=='undefined'&&module.exports)module.exports={epRestoreProjectExtensionsV2};

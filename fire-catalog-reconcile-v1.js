'use strict';
// Reconcile engineer-declared fire actuators with the existing article catalogue.
// A catalogue match does not imply suitability, coil compatibility or normative approval.
function epFireCatalogReconcileV1(project,lookupSku){
 const issues=[],rows=[],articles=new Map();
 const fail=(code,level='BLOCKED',id=null)=>issues.push({code,level,objectId:id});
 if(typeof epFireControlDesignV1!=='function'){fail('FIRE_CATALOG_DESIGN_ENGINE_MISSING');return {status:'BLOCKED',rows,issues,engineeringApproved:false};}
 const design=epFireControlDesignV1(project);
 if(design.status==='NOT_CONFIGURED')return {schema:'electropanel.fire.catalog.1',status:'NOT_CONFIGURED',rows,issues,engineeringApproved:false};
 issues.push(...design.issues);
 const projectCatalog=typeof epProjectCatalogV1==='function'?epProjectCatalogV1(project,typeof EP_CATALOG==='object'?EP_CATALOG:{}):null;
 const lookup=typeof lookupSku==='function'?lookupSku:projectCatalog?.lookup??(typeof epCatalogSku==='function'?epCatalogSku:null);
 const validCategories={CONTACTOR:['CONTACTOR'],SHUNT_TRIP:['SHUNT_TRIP','ACCESSORY'],UNDERVOLTAGE_RELEASE:['UNDERVOLTAGE_RELEASE','ACCESSORY'],INTERFACE_RELAY:['INTERFACE_RELAY','RELAY']};
 for(const item of design.rows){
  let article=null;
  if(item.articleSku){
   if(!lookup)fail('FIRE_CATALOG_LOOKUP_UNAVAILABLE','UNKNOWN',item.actionId);
   else try{article=lookup(item.articleSku)||null;}catch(_){fail('FIRE_CATALOG_LOOKUP_FAILED','UNKNOWN',item.actionId);}
   if(!article)fail('FIRE_CATALOG_ARTICLE_NOT_FOUND','BLOCKED',item.actionId);
  }
  const kind=article?.kind??article?.category??null;
  if(article&&item.actuator!=='EXTERNAL'&&(!validCategories[item.actuator]||!validCategories[item.actuator].includes(kind)))
   fail('FIRE_CATALOG_ACTUATOR_KIND_MISMATCH','BLOCKED',item.actionId);
  if(article&&Number.isInteger(article.modules)&&item.moduleWidth!==null&&article.modules!==item.moduleWidth)
   fail('FIRE_CATALOG_MODULE_WIDTH_MISMATCH','BLOCKED',item.actionId);
  if(article&&!Number.isInteger(article.modules))fail('FIRE_CATALOG_MODULES_UNDECLARED','UNKNOWN',item.actionId);
  if(article&&!article.source)fail('FIRE_CATALOG_MANUFACTURER_EVIDENCE_MISSING','UNKNOWN',item.actionId);
  if(article&&article.controlVoltageV!==undefined&&item.controlVoltageV!==null&&article.controlVoltageV!==item.controlVoltageV)
   fail('FIRE_CATALOG_COIL_VOLTAGE_MISMATCH','BLOCKED',item.actionId);
  if(article&&article.controlVoltageV===undefined)fail('FIRE_CATALOG_COIL_VOLTAGE_UNVERIFIED','UNKNOWN',item.actionId);
  if(article&&article.mounting!==undefined&&article.mounting!=='DIN')fail('FIRE_CATALOG_DIN_MOUNTING_MISMATCH','BLOCKED',item.actionId);
  if(article&&article.verificationStatus!=='VERIFIED')fail('FIRE_CATALOG_ARTICLE_UNVERIFIED','UNKNOWN',item.actionId);
  rows.push({actionId:item.actionId,deviceId:item.deviceId,articleSku:item.articleSku,
   manufacturer:article?.maker??article?.manufacturer??null,series:article?.series??null,
   category:kind,declaredWidthModules:item.moduleWidth,catalogWidthModules:article?.modules??null,
   declaredControlVoltageV:item.controlVoltageV,catalogControlVoltageV:article?.controlVoltageV??null,
   matched:!!article,reviewed:item.reviewed});
  if(article&&item.articleSku){
   const key=item.articleSku+'|'+item.actuator;
   if(!articles.has(key))articles.set(key,{sku:item.articleSku,actuator:item.actuator,quantity:0,manufacturer:article.maker??article.manufacturer??null,series:article.series??null});
   articles.get(key).quantity++;
  }
 }
 return {schema:'electropanel.fire.catalog.1',status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN',
  rows,articles:[...articles.values()],issues,engineeringApproved:false,ready_for_installation:false};
}
if(typeof module!=='undefined')module.exports={epFireCatalogReconcileV1};

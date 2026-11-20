'use strict';
// Schema for future DIN catalogue. Templates intentionally contain NO fake SKU.
const EP_DIN_CATEGORIES_V1=Object.freeze({
 MCB:'Автоматический выключатель',RCD:'УЗО',RCBO:'Дифавтомат',
 METER:'Счётчик электроэнергии',CONTACTOR:'Контактор',RELAY:'Реле',
 TERMINAL:'Клемма',DIN_PSU:'DIN-блок питания',LOW_VOLTAGE:'Слаботочный модуль',
 LED_DRIVER:'LED-драйвер',FIRE_SUPPRESSION:'Модуль пожаротушения'
});
function epDinCatalogValidateV1(record){
 const issues=[],add=(code,level='BLOCKED')=>issues.push({code,level});
 if(!record||typeof record!=='object'||Array.isArray(record))
  return {status:'BLOCKED',issues:[{code:'RECORD_INVALID',level:'BLOCKED'}],engineeringApproved:false};
 if(!Object.hasOwn(EP_DIN_CATEGORIES_V1,record.category))add('CATEGORY_INVALID');
 for(const key of ['manufacturer','series','article']){
  if(typeof record[key]!=='string'||!record[key].trim())add('IDENTITY_'+key.toUpperCase()+'_MISSING');
 }
 if(!['VERIFIED','UNVERIFIED','TEMPLATE'].includes(record.verificationStatus))add('VERIFICATION_STATUS_INVALID');
 if(record.verificationStatus==='VERIFIED'&&
    (!record.evidence||typeof record.evidence.url!=='string'||!/^https:\/\//.test(record.evidence.url)))
  add('VERIFIED_REQUIRES_SOURCE');
 if(!['DIN','PANEL','OTHER','UNKNOWN'].includes(record.mounting))add('MOUNTING_UNKNOWN','UNKNOWN');
 const g=record.geometry;
 if(!g||typeof g!=='object')add('GEOMETRY_MISSING','UNKNOWN');
 else for(const k of ['widthMm','heightMm','depthMm']){
  if(g[k]!==null&&g[k]!==undefined&&(!Number.isFinite(g[k])||g[k]<=0))add('GEOMETRY_'+k.toUpperCase()+'_INVALID');
  else if(g[k]==null)add('GEOMETRY_'+k.toUpperCase()+'_UNKNOWN','UNKNOWN');
 }
 if(record.category==='FIRE_SUPPRESSION'){
  if(record.mounting==='DIN'&&!record.evidence?.mountingDocument)
   add('FIRE_DIN_MOUNTING_UNVERIFIED','UNKNOWN');
  if(!Number.isFinite(record.activationTemperatureC))
   add('FIRE_ACTIVATION_TEMPERATURE_UNVERIFIED','UNKNOWN');
  if(!record.evidence?.certification) add('FIRE_CERTIFICATION_UNVERIFIED','UNKNOWN');
  if(!record.evidence?.protectedVolume) add('FIRE_PROTECTED_VOLUME_UNVERIFIED','UNKNOWN');
 }
 const status=issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN';
 return {status,issues,engineeringApproved:false,ready_for_installation:false};
}
function epDinCatalogTemplateV1(category){
 if(!Object.hasOwn(EP_DIN_CATEGORIES_V1,category))return null;
 return {category,manufacturer:'Не выбран',series:'Не выбрана',article:'TEMPLATE_NOT_A_PRODUCT',
  verificationStatus:'TEMPLATE',mounting:'UNKNOWN',
  geometry:{widthMm:null,heightMm:null,depthMm:null},evidence:null,
  visual:{mode:'NEUTRAL_PLACEHOLDER',verified:false},
  engineeringApproved:false,ready_for_installation:false};
}
if(typeof module!=='undefined'&&module.exports)module.exports={EP_DIN_CATEGORIES_V1,epDinCatalogValidateV1,epDinCatalogTemplateV1};

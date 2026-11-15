'use strict';
// Small, explicitly sourced factual reference index. Records are candidates for
// documentary engineering review, NOT auto-verified manufacturer's guarantees.
// No I²t bands, rated voltage, energy selectivity or trip-time curves inferred.
const EP_MANUFACTURER_FACT_REFERENCES_V1=Object.freeze([
 Object.freeze({
  id:'SOURCE-SCHNEIDER-A9F73110-2026',catalogKey:'SE-A9F73110',
  manufacturer:'Schneider Electric',sku:'A9F73110',
  title:'Acti9 iC60N 1P 10A B, 6000A IEC/EN 60898-1',
  sourceUrl:'https://eshop.se.com/sg/miniature-circuit-breaker-mcb-acti9-ic60n-1p-10a-b-curve-6000a-iec-en-60898-1-10ka-iec-en-60947-2-a9f73110.html',
  sourceKind:'OFFICIAL_MANUFACTURER_PRODUCT_LISTING',
  sourceLocation:'Product heading and SKU',
  observedAt:'2026-11-15',
  fields:Object.freeze({kind:'MCB',inA:10,poles:1,curve:'B',icnKa:6,
   icnStandard:'IEC/EN 60898-1'}),
  absentEvidence:Object.freeze(['I2T_LET_THROUGH_BANDS','OPERATING_I2','TRIP_UPPER_ENVELOPE',
   'ICN_APPLICATION_VOLTAGE','CABLE_IZ','SELECTIVITY']),
 }),
 Object.freeze({
  id:'SOURCE-SCHNEIDER-A9F74116-2026',catalogKey:'SE-A9F74116',
  manufacturer:'Schneider Electric',sku:'A9F74116',
  title:'Acti9 iC60N 1P C16, manufacturer product specification',
  sourceUrl:'https://eshop.se.com/sg/ic60n-miniature-circuit-breaker-1p-16a-c-curve-a9f74116.html',
  sourceKind:'OFFICIAL_MANUFACTURER_PRODUCT_LISTING',
  sourceLocation:'Product specifications: 1P, C16, Icn 6000 A at 230 V',
  observedAt:'2026-11-15',
  fields:Object.freeze({kind:'MCB',inA:16,poles:1,curve:'C',icnKa:6,
   icnVoltageV:230,icnStandard:'IEC/EN 60898-1'}),
  absentEvidence:Object.freeze(['I2T_LET_THROUGH_BANDS','OPERATING_I2',
   'TRIP_UPPER_ENVELOPE','SELECTIVITY','CABLE_IZ'])
 }),
 Object.freeze({
  id:'SOURCE-SCHNEIDER-A9F74316-2026',catalogKey:'SE-A9F74316',
  manufacturer:'Schneider Electric',sku:'A9F74316',
  title:'Acti9 iC60N 3P C16, manufacturer product specification',
  sourceUrl:'https://eshop.se.com/sg/ic60n-miniature-circuit-breaker-3p-16a-c-curve-a9f74316.html',
  sourceKind:'OFFICIAL_MANUFACTURER_PRODUCT_LISTING',
  sourceLocation:'Product specifications: 3P, C16, Icn 6000 A at 400 V',
  observedAt:'2026-11-15',
  fields:Object.freeze({kind:'MCB',inA:16,poles:3,curve:'C',icnKa:6,
   icnVoltageV:400,icnStandard:'IEC/EN 60898-1'}),
  absentEvidence:Object.freeze(['I2T_LET_THROUGH_BANDS','OPERATING_I2',
   'TRIP_UPPER_ENVELOPE','SELECTIVITY','CABLE_IZ'])
 }),
 Object.freeze({
  id:'SOURCE-ABB-S201-C16-2020',catalogKey:'ABB-2CDS251001R0164',
  manufacturer:'ABB',sku:'2CDS251001R0164',
  title:'Electrical Installation Solutions for Buildings, S200 C characteristic (2020)',
  sourceUrl:'https://new.abb.com/docs/librariesprovider66/huabb/elektromos-install%C3%A1ci%C3%B3s-megold%C3%A1sok-%C3%A9p%C3%BCletekhez-katal%C3%B3gus-2020_kismegszak%C3%ADt%C3%B3k.pdf',
  sourceKind:'OFFICIAL_MANUFACTURER_CATALOGUE',
  sourceLocation:'PDF page 29 (zero-based page 28), printed page 1/28, S201-C16 row',
  observedAt:'2026-11-15',
  fields:Object.freeze({kind:'MCB',inA:16,poles:1,curve:'C',icnKa:6,
   icnStandard:'IEC/EN 60898-1'}),
  absentEvidence:Object.freeze(['I2T_LET_THROUGH_BANDS','OPERATING_I2','TRIP_UPPER_ENVELOPE',
   'ICN_APPLICATION_VOLTAGE','CABLE_IZ','SELECTIVITY']),
 })
]);
function epManufacturerFactsReconciliationV1(project,lookup){
 const issues=[],rows=[],index=new Map();
 const add=(code,level,lineId,field)=>issues.push({code,level,lineId,field:field??null});
 const finish=()=>({schema:'electropanel.manufacturer.facts.reconciliation.1',
  rows,issues,status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN',
  engineeringApproved:false,ready_for_installation:false,
  notice:'Catalogue facts are checked against candidate published documentation only; a matching listing is not verified product conformity or evidence of I²t.'});
 if(!Array.isArray(project?.lines)||project.lines.length>1000){
  add('MANUFACTURER_FACTS_PROJECT_INVALID','BLOCKED',null);
  return finish();
 }
 for(const r of EP_MANUFACTURER_FACT_REFERENCES_V1)index.set(r.catalogKey,r);
 const seen=new Set();
 for(const line of project.lines){
  const lineId=line?.id??null,key=line?.catalogSku;
  if(typeof lineId!=='string'||!lineId||seen.has(lineId)){
   add('MANUFACTURER_FACTS_LINE_INVALID','BLOCKED',lineId);continue;
  }
  seen.add(lineId);
  const ref=index.get(key);
  let article=null;
  try{article=typeof lookup==='function'?lookup(key):null;}
  catch(_){add('MANUFACTURER_FACTS_LOOKUP_FAILED','BLOCKED',lineId);}
  if(!ref){
   add('MANUFACTURER_FACTS_REFERENCE_NOT_INDEXED','UNKNOWN',lineId);
   rows.push({lineId,catalogKey:key??null,sourceId:null,sourceUrl:null,
    status:'NOT_INDEXED',matchedFields:[],missingFields:[],conflictingFields:[],
    unavailableClaims:[],engineeringApproved:false});
   continue;
  }
  const matchedFields=[],missingFields=[],conflictingFields=[];
  if(!article||typeof article!=='object'){
   add('MANUFACTURER_FACTS_ARTICLE_NOT_FOUND','BLOCKED',lineId);
  }else{
   if(article.sku!==ref.sku){
    add('MANUFACTURER_FACTS_SKU_CONFLICT','BLOCKED',lineId,'sku');
    conflictingFields.push('sku');
   }
   if(article.maker!==ref.manufacturer){
    add('MANUFACTURER_FACTS_MAKER_CONFLICT','BLOCKED',lineId,'maker');
    conflictingFields.push('maker');
   }
   for(const [field,expected] of Object.entries(ref.fields)){
    const actual=article[field];
    if(actual===null||actual===undefined||actual===''){
     add('MANUFACTURER_FACTS_CATALOG_FIELD_MISSING','UNKNOWN',lineId,field);
     missingFields.push(field);
    }else if(actual!==expected){
     // Equivalent spellings of a standard need human review; no assumptions.
     add('MANUFACTURER_FACTS_CATALOG_FIELD_CONFLICT','BLOCKED',lineId,field);
     conflictingFields.push(field);
    }else matchedFields.push(field);
   }
  }
  add('MANUFACTURER_FACTS_I2T_UNDOCUMENTED','UNKNOWN',lineId);
  add('MANUFACTURER_FACTS_MANUAL_APPLICABILITY_REVIEW','UNKNOWN',lineId);
  rows.push({lineId,catalogKey:key,sourceId:ref.id,sourceUrl:ref.sourceUrl,
   sourceTitle:ref.title,sourceLocation:ref.sourceLocation,sourceKind:ref.sourceKind,
   sourceObservedAt:ref.observedAt,manufacturer:ref.manufacturer,sku:ref.sku,
   status:conflictingFields.length?'CONFLICT':missingFields.length?'INCOMPLETE':'FACTS_MATCH',
   matchedFields,missingFields,conflictingFields,
   unavailableClaims:[...ref.absentEvidence],engineeringApproved:false});
 }
 return finish();
}
if(typeof module!=='undefined'&&module.exports)
 module.exports={EP_MANUFACTURER_FACT_REFERENCES_V1,epManufacturerFactsReconciliationV1};

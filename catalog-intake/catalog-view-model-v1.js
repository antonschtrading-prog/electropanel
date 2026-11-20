'use strict';
// Engineering-safe, read-only normalization of staged apparatus into UI-friendly rows.
const {items}=require('./staged-selector-v1.js');
const {reviewCandidate}=require('./field-evidence-v1.js');
const {validateCandidate}=require('./candidate-schema-v1.js');
const DISPLAY_FIELDS={
 MCB:['inA','poles','curve','icnKa','icnVoltageV','icnStandard','modules','widthMm'],
 RCD:['inA','poles','residualCurrentMa','residualType','conditionalShortCircuitKa','modules','widthMm'],
 RCBO:['inA','poles','protectedPoles','curve','residualCurrentMa','residualType','icnKa','icnVoltageV','icnStandard','modules','widthMm'],
 METER:['ratedVoltageV','connectionType','poles','modules','widthMm'],
 RELAY:['coilVoltageV','coilSupplyType','coilFrequencyHz','contactRatingA','modules','widthMm'],
 CONTACTOR:['contactRatingA','contactConfiguration','coilVoltageV','coilSupplyType','coilFrequencyHz','utilizationCategory','modules','widthMm']
};
const SORT_KEYS=['kind','maker','series','sku'];
function textValue(value){return value===null||value===undefined?'—':String(value)}
function makeCard(item){
 const d=item.record,review=reviewCandidate(d,item.evidence);
 const errors=validateCandidate(d);
 const fields=Object.fromEntries((DISPLAY_FIELDS[d.kind]||[]).map(k=>[k,d[k]??null]));
 return Object.freeze({id:d.sku,sku:d.sku,title:[d.maker,d.series,d.sku].join(' '),
  kind:d.kind,manufacturer:d.maker,series:d.series,batch:item.batch,
  fields,fieldLabels:Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,textValue(v)])),
  sourceUrl:d.source||null,reviewStatus:review.status,
  missingRequired:errors.filter(x=>x.code==='REQUIRED_SPEC_UNKNOWN').map(x=>x.field),
  warnings:[...new Set(review.errors.map(x=>x.code))],
  selectable:false,engineeringApproved:false,imageUrl:null});
}
function makeCards(source=items){
 const cards=source.map(makeCard);
 cards.sort((a,b)=>SORT_KEYS.map(k=>String(a[k]||'').localeCompare(String(b[k]||''))).find(n=>n!==0)||0);
 return cards;
}
function filterCards({kind,maker,search,onlyIncomplete=false}={},source=items){
 let cards=makeCards(source);
 if(kind)cards=cards.filter(c=>c.kind===kind);
 if(maker)cards=cards.filter(c=>c.manufacturer.toLowerCase()===String(maker).toLowerCase());
 if(search){const q=String(search).toLowerCase().trim();cards=cards.filter(c=>c.title.toLowerCase().includes(q))}
 if(onlyIncomplete)cards=cards.filter(c=>c.reviewStatus==='BLOCKED'||c.missingRequired.length>0);
 return {mode:'READ_ONLY_STAGING',count:cards.length,cards,canAddToPanel:false};
}
module.exports={DISPLAY_FIELDS,makeCard,makeCards,filterCards};

'use strict';
const {handleCatalogueRequest}=require('./catalog-api-v1.js');
const {KINDS}=require('./candidate-schema-v1.js');
const {makeCards}=require('./catalog-view-model-v1.js');
function buildFacets(cards=makeCards()){
 const makers=[...new Set(cards.map(c=>c.manufacturer))].sort();
 const kinds=KINDS.map(kind=>({kind,count:cards.filter(c=>c.kind===kind).length}));
 const series=[...new Set(cards.map(c=>c.series))].sort();
 return {makers,kinds,series,articles:cards.length,approved:0};
}
function buildComparison(skus){
 if(!Array.isArray(skus)||skus.length<2||skus.length>8)return {ok:false,error:'COMPARE_REQUIRES_2_TO_8_SKUS'};
 const normalized=skus.map(s=>String(s).trim().toUpperCase());
 if(new Set(normalized).size!==normalized.length)return {ok:false,error:'DUPLICATE_SKU'};
 const cards=normalized.map(s=>handleCatalogueRequest({operation:'get',sku:s}));
 if(cards.some(c=>!c.ok))return {ok:false,error:'UNKNOWN_SKU',missing:normalized.filter((_,i)=>!cards[i].ok)};
 const kinds=[...new Set(cards.map(c=>c.card.kind))];
 const keys=[...new Set(cards.flatMap(c=>Object.keys(c.card.fields)))].sort();
 const rows=keys.map(field=>({field,values:cards.map(c=>c.card.fields[field]??null)}));
 return {ok:true,mode:'STAGING_COMPARISON_ONLY',skus:normalized,kinds,mixedKinds:kinds.length>1,
  rows,canSubstitute:false,engineeringApproved:false};
}
function buildBrowserSnapshot({kind,maker,search,onlyIncomplete=false}={}){
 const list=handleCatalogueRequest({operation:'list',filters:{kind,maker,search,onlyIncomplete}});
 return {mode:'READ_ONLY_STAGING_BROWSER',facets:buildFacets(),results:list.cards,
  count:list.count,canAddToPanel:false};
}
module.exports={buildFacets,buildComparison,buildBrowserSnapshot};

'use strict';
// Coverage of existing curated articles. Missing electrical context is not guessed.
const {EP_CATALOG}=require('../catalog.js');
const {KINDS}=require('./candidate-schema-v1.js');
const {items}=require('./staged-selector-v1.js');
function coverage(seed=EP_CATALOG,staged=items){
 const records=Object.entries(seed).map(([id,d])=>{
  const fields=['maker','series','sku','kind','poles','modules','widthMm','heightMm','depthMm','inA','source'];
  const missing=fields.filter(k=>d[k]==null||d[k]==='');
  const warnings=[...missing.map(k=>'MISSING_'+k.toUpperCase())];
  if(['MCB','RCBO'].includes(d.kind)){
   for(const k of ['icnKa','icnVoltageV','icnStandard'])if(d[k]==null)warnings.push('BREAKING_CONTEXT_'+k.toUpperCase());
  }
  if(['RCD','RCBO'].includes(d.kind)){
   for(const k of ['residualCurrentMa','residualType'])if(d[k]==null)warnings.push('RESIDUAL_CONTEXT_'+k.toUpperCase());
  }
  return {id,sku:d.sku,maker:d.maker,series:d.series,kind:d.kind,missing,warnings,
   dimensionsKnown:[d.widthMm,d.heightMm,d.depthMm].every(x=>Number.isFinite(x)&&x>0),
   electricalContextComplete:!warnings.some(x=>x.startsWith('BREAKING_CONTEXT_')||x.startsWith('RESIDUAL_CONTEXT_')),
   source:d.source||null,engineeringApproved:false};
 }).sort((a,b)=>a.maker.localeCompare(b.maker)||a.sku.localeCompare(b.sku));
 const byKind=Object.fromEntries(KINDS.map(k=>[k,{curated:records.filter(r=>r.kind===k).length,staged:staged.filter(x=>x.record.kind===k).length}]));
 const makers=[...new Set(records.map(r=>r.maker))].sort();
 return {mode:'CURATED_COVERAGE_AUDIT',engineeringApproved:false,total:records.length,
  completeDimensions:records.filter(r=>r.dimensionsKnown).length,
  completeElectricalContext:records.filter(r=>r.electricalContextComplete).length,
  byKind,makers,records};
}
module.exports={coverage};

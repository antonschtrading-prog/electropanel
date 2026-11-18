'use strict';
// Pure engineering filter for staged catalogue. This NEVER approves a staged device.
const {batches}=require('./portfolio-v1.js');
const {reviewCandidate}=require('./field-evidence-v1.js');
const items=batches.flatMap(([batch,data])=>data.candidates.map(record=>({batch,record,evidence:data.evidence?.[record.sku]||{}})));
const allowed=new Set(['MCB','RCD','RCBO','METER','RELAY','CONTACTOR']);
function normalizeCriteria(c={}){
 if(!c||typeof c!=='object'||Array.isArray(c))throw new TypeError('Criteria must be an object');
 if(c.kind!=null&&!allowed.has(c.kind))throw new RangeError('Unsupported device kind');
 for(const k of ['inA','poles','modules','maxWidthMm','residualCurrentMa','icnKa','coilVoltageV','coilFrequencyHz','protectedPoles','icnVoltageV']){
  if(c[k]!=null&&(!Number.isFinite(c[k])||c[k]<=0))throw new RangeError('Invalid numeric criterion '+k);
 }
 if(c.poles!=null&&!Number.isInteger(c.poles))throw new RangeError('Poles must be integer');
 if(c.modules!=null&&!Number.isInteger(c.modules))throw new RangeError('Modules must be integer');
 if(c.protectedPoles!=null&&!Number.isInteger(c.protectedPoles))throw new RangeError('Protected poles must be integer');
 if(c.icnStandard!=null&&c.icnKa==null)throw new RangeError('Icn standard requires Icn threshold');
 if(c.icnVoltageV!=null&&c.icnKa==null)throw new RangeError('Icn voltage requires Icn threshold');
 return {...c};
}
function findStagedDevices(criteria={},source=items){
 const c=normalizeCriteria(criteria),matches=[],excluded={};
 for(const item of source){
  const d=item.record,why=[];
  if(c.kind&&d.kind!==c.kind)why.push('KIND_MISMATCH');
  for(const k of ['inA','poles','modules','residualCurrentMa','coilVoltageV','coilFrequencyHz','protectedPoles']){
   if(c[k]==null)continue;
   if(d[k]==null)why.push('UNKNOWN_'+k.toUpperCase());
   else if(d[k]!==c[k])why.push('MISMATCH_'+k.toUpperCase());
  }
  if(c.maxWidthMm!=null){
   if(d.widthMm==null)why.push('UNKNOWN_WIDTH');
   else if(d.widthMm>c.maxWidthMm)why.push('WIDTH_EXCEEDED');
  }
  if(c.icnKa!=null){
   if(d.kind==='RCD')why.push('RCD_ICN_NOT_APPLICABLE');
   else if(d.icnKa==null)why.push('UNKNOWN_ICN');
   else if(d.icnKa<c.icnKa)why.push('ICN_INSUFFICIENT');
   else if(d.icnStandard==null||d.icnVoltageV==null)why.push('ICN_CONTEXT_MISSING');
   else if(c.icnVoltageV!=null&&d.icnVoltageV!==c.icnVoltageV)why.push('ICN_VOLTAGE_MISMATCH');
   else if(c.icnStandard!=null&&d.icnStandard!==c.icnStandard)why.push('ICN_STANDARD_MISMATCH');
  }
  for(const k of ['curve','residualType','contactConfiguration','coilSupplyType']){
   if(c[k]==null)continue;
   if(d[k]==null)why.push('UNKNOWN_'+k.toUpperCase());
   else if(d[k]!==c[k])why.push('MISMATCH_'+k.toUpperCase());
  }
  if(why.length){for(const reason of why)excluded[reason]=(excluded[reason]||0)+1;continue}
  const review=reviewCandidate(d,item.evidence);
  matches.push({sku:d.sku,maker:d.maker,series:d.series,kind:d.kind,batch:item.batch,
   widthMm:d.widthMm??null,modules:d.modules??null,source:d.source||null,
   reviewStatus:review.status,engineeringApproved:false,selectable:false,
   warnings:[...new Set([...review.errors.map(x=>x.code),...(d.lifecycle||d.marketStatus?['LIFECYCLE_CHECK_REQUIRED']:[])])]});
 }
 matches.sort((a,b)=>a.kind.localeCompare(b.kind)||a.maker.localeCompare(b.maker)||a.sku.localeCompare(b.sku));
 return {mode:'STAGING_DISCOVERY_ONLY',criteria:c,totalScanned:source.length,count:matches.length,
  matches,excluded,canUseForEngineering:false};
}
module.exports={items,normalizeCriteria,findStagedDevices};

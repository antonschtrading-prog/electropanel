'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {epUniversalCabinetOptionsV1:plan}=require('../universal-cabinet-options-v1.js');
const {epCabinetOptionConstraintsV1:filter}=require('../cabinet-option-constraints-v1.js');
const {epCabinetCapacityCsvV1:csv}=require('../cabinet-capacity-csv-v1.js');
const base=()=>({lines:[{id:'A',modules:1,catalogSku:'SKU'}]});
const lookup=()=>({article:'SKU',modules:1,widthMm:18,heightMm:85,depthMm:80});
test('no limits preserves all unblocked candidates',()=>{
 const r=plan(base(),lookup),f=filter(r);
 assert.equal(f.status,'REVIEW_REQUIRED');
 assert.equal(f.summary.total,r.options.length);
 assert.equal(f.summary.eligible,r.options.filter(x=>x.status==='REVIEW_REQUIRED').length);
 assert.equal(f.summary.total,f.summary.eligible+f.summary.excluded);
 assert.equal(f.confirmedCabinetFit,false);
});
test('width limit excludes wide layouts without discarding narrower alternatives',()=>{
 const r=plan(base(),lookup);
 const f=filter(r,{maxUsableWidthMm:220});
 assert.ok(f.eligible.length>0);
 assert.ok(f.excluded.some(x=>x.reasons.includes('WIDTH_EXCEEDS_LIMIT')));
 assert.ok(f.eligible.every(x=>r.options.find(o=>o.id===x.optionId).envelope.preliminaryUsableWidthMm<=220));
});
test('height limit excludes tall layouts and preserves compact one-row layouts',()=>{
 const r=plan(base(),lookup);
 const f=filter(r,{maxUsableHeightMm:460});
 assert.ok(f.eligible.length>0);
 assert.ok(f.excluded.some(x=>x.reasons.includes('HEIGHT_EXCEEDS_LIMIT')));
 assert.ok(f.eligible.every(x=>r.options.find(o=>o.id===x.optionId).envelope.preliminaryUsableHeightMm<=460));
});
test('depth threshold accepts equal depth and rejects smaller threshold',()=>{
 const r=plan(base(),lookup);
 const equal=filter(r,{maxUsableDepthMm:140});
 assert.ok(equal.eligible.length>0);
 const smaller=filter(r,{maxUsableDepthMm:139});
 assert.equal(smaller.status,'BLOCKED');
 assert.equal(smaller.eligible.length,0);
 assert.ok(smaller.excluded.every(x=>x.reasons.includes('DEPTH_EXCEEDS_LIMIT')));
});
test('unknown depth never passes a finite depth threshold',()=>{
 const r=plan({lines:[{id:'A',modules:1}]});
 const f=filter(r,{maxUsableDepthMm:500});
 assert.equal(f.status,'BLOCKED');
 assert.equal(f.eligible.length,0);
 assert.ok(f.excluded.every(x=>x.reasons.includes('DEPTH_UNKNOWN')));
 assert.equal(f.confirmedCabinetFit,false);
});
test('unknown depth is allowed only when no depth constraint was specified',()=>{
 const r=plan({lines:[{id:'A',modules:1}]});
 const f=filter(r,{maxUsableDepthMm:null});
 assert.equal(f.status,'REVIEW_REQUIRED');
 assert.ok(f.eligible.length>0);
});
test('combined constraints explain multiple rejection reasons',()=>{
 const r=plan(base(),lookup);
 const f=filter(r,{maxUsableWidthMm:1,maxUsableHeightMm:1,maxUsableDepthMm:1});
 assert.equal(f.status,'BLOCKED');
 assert.ok(f.excluded.every(x=>x.reasons.includes('WIDTH_EXCEEDS_LIMIT')));
 assert.ok(f.excluded.every(x=>x.reasons.includes('HEIGHT_EXCEEDS_LIMIT')));
 assert.ok(f.excluded.every(x=>x.reasons.includes('DEPTH_EXCEEDS_LIMIT')));
});
test('blocked DIN layouts never pass even with generous dimensions',()=>{
 const r=plan({lines:[{id:'A',modules:19}]},null,{reserveFraction:0});
 const f=filter(r,{maxUsableWidthMm:10000,maxUsableHeightMm:10000});
 assert.ok(f.excluded.some(x=>x.reasons.includes('PATTERN_BLOCKED')));
 assert.ok(f.eligible.every(x=>r.options.find(o=>o.id===x.optionId).status==='REVIEW_REQUIRED'));
});
test('malformed reports and invalid limits are blocked',()=>{
 const r=plan(base(),lookup);
 for(const value of [-1,0,Infinity,NaN,'200',{},[]]){
  assert.equal(filter(r,{maxUsableDepthMm:value}).status,'BLOCKED');
 }
 assert.equal(filter(r,{bogus:1}).status,'BLOCKED');
 assert.equal(filter(null).status,'BLOCKED');
 assert.equal(filter({schema:'bad',options:[]}).status,'BLOCKED');
});
test('filter is deterministic and never mutates input reports or limits',()=>{
 const r=plan(base(),lookup),limits={maxUsableDepthMm:140};
 const before=JSON.stringify(r),l=JSON.stringify(limits);
 assert.deepEqual(filter(r,limits),filter(r,limits));
 assert.equal(JSON.stringify(r),before);
 assert.equal(JSON.stringify(limits),l);
});
test('supplier CSV accepts null unset limits and remains preliminary',()=>{
 const r=plan(base(),lookup);
 const result=csv(r,{maxUsableWidthMm:null,maxUsableHeightMm:null,maxUsableDepthMm:null});
 assert.equal(result.status,'REVIEW_REQUIRED');
 assert.equal(result.summary.withinLimits,result.summary.considered);
 assert.equal(result.engineeringApproved,false);
 assert.equal(result.ready_for_installation,false);
});
test('supplier CSV and UI filter agree on known-depth limit outcomes',()=>{
 const r=plan(base(),lookup);
 for(const depth of [100,140,200]){
  const f=filter(r,{maxUsableDepthMm:depth});
  const c=csv(r,{maxUsableDepthMm:depth});
  assert.equal(f.summary.eligible,c.summary.withinLimits);
  assert.equal(f.summary.excluded,c.summary.exceedsLimits+c.summary.unknownDimensions);
 }
});
test('supplier CSV distinguishes unknown depth from exceeded depth',()=>{
 const r=plan({lines:[{id:'A',modules:1}]});
 const f=filter(r,{maxUsableDepthMm:200});
 const c=csv(r,{maxUsableDepthMm:200});
 assert.equal(f.summary.eligible,0);
 assert.equal(c.summary.unknownDimensions,c.summary.considered);
 assert.match(c.csv,/DEPTH_UNKNOWN/);
 assert.match(c.csv,/DIMENSIONS_UNKNOWN/);
});

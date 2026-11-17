'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {epUniversalCabinetOptionsV1:plan}=require('../universal-cabinet-options-v1.js');
const {epCabinetCapacityCsvV1:csv}=require('../cabinet-capacity-csv-v1.js');
const project={lines:[{id:'L1',modules:2,catalogSku:'A'}]};
const catalogue=()=>({article:'A',modules:2,widthMm:36,heightMm:85,depthMm:80});
test('supplier sizing constraints reject malformed width, height and depth limits',()=>{
 const report=plan(project,catalogue);
 for(const key of ['maxUsableWidthMm','maxUsableHeightMm','maxUsableDepthMm']){
  for(const value of [NaN,Infinity,-Infinity,0,-1,'250']){
   const r=csv(report,{[key]:value});
   assert.equal(r.status,'BLOCKED',key+':'+value);
   assert.ok(r.issues.some(x=>x.code==='CABINET_CSV_LIMITS_INVALID'));
  }
 }
 assert.equal(csv(report,{unrecognized:250}).status,'BLOCKED');
});
test('supplier sizing CSV marks a known depth exceeding declared maximum',()=>{
 const report=plan(project,catalogue);
 const r=csv(report,{maxUsableDepthMm:100});
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.match(r.csv,/EXCEEDS_LIMITS/);
 assert.equal(r.engineeringApproved,false);
});
test('unknown article depth cannot satisfy a finite depth constraint',()=>{
 const report=plan({lines:[{id:'L1',modules:2}]});
 const r=csv(report,{maxUsableDepthMm:300});
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.match(r.csv,/UNKNOWN/);
 assert.match(r.csv,/DIMENSIONS_UNKNOWN/);
 assert.match(r.csv,/DEPTH_UNKNOWN/);
 assert.equal(r.summary.unknownDimensions,r.summary.considered);
 assert.equal(r.ready_for_installation,false);
});
test('supplier sizing CSV accepts positive limits and never fabricates a cabinet SKU',()=>{
 const report=plan(project,catalogue);
 const r=csv(report,{maxUsableWidthMm:2000,maxUsableHeightMm:3000,maxUsableDepthMm:300});
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.match(r.csv,/PRELIMINARY_NOT_MANUFACTURER_FIT/);
 assert.match(r.csv,/REVIEW_REQUIRED/);
 assert.match(r.csv,/enclosure_sku/);
 assert.equal(r.engineeringApproved,false);
});

test('constraint reasons distinguish unknown from actual dimension overruns',()=>{
 const report=plan(project,catalogue);
 const r=csv(report,{maxUsableWidthMm:1,maxUsableDepthMm:1});
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.match(r.csv,/WIDTH_EXCEEDS_LIMIT\\|DEPTH_EXCEEDS_LIMIT/);
 assert.equal(r.summary.exceedsLimits,r.summary.considered);
 assert.equal(r.summary.withinLimits,0);
});
test('supplier CSV reports bounded packing method and planning provenance',()=>{
 const report=plan(project,catalogue);
 const r=csv(report,{maxUsableWidthMm:2000,maxUsableHeightMm:3000,maxUsableDepthMm:300});
 assert.match(r.csv,/packing_method/);
 assert.match(r.csv,/source_dimension_status/);
 assert.match(r.csv,/DEPTH_ESTIMATE_ONLY/);
 assert.equal(r.summary.exceedsLimits,0);
 assert.equal(r.summary.unknownDimensions,0);
 assert.equal(r.summary.withinLimits,r.summary.considered);
});
test('unknown depth with no depth limit remains reviewable, not dimension-verified',()=>{
 const report=plan({lines:[{id:'L1',modules:1}]});
 const r=csv(report,{maxUsableWidthMm:2000});
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.equal(r.summary.unknownDimensions,0);
 assert.match(r.csv,/DEPTH_UNKNOWN/);
 assert.equal(r.engineeringApproved,false);
});

test('unset cabinet limits represented by null are valid for UI export',()=>{
 const r=csv(plan(project,catalogue),{
  maxUsableWidthMm:null,maxUsableHeightMm:null,maxUsableDepthMm:null});
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.summary.considered>0);
 assert.equal(r.summary.withinLimits,r.summary.considered);
});

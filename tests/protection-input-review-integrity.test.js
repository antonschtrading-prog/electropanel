'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epProtectionInputsV1:apply}=require('../protection-inputs-v1.js');
const {epRefreshLinkedCurrentsV1}=require('../load-current-v1.js');
const {epAcknowledgeCalculationReviewV1:ack}=require('../calculation-review-v1.js');
function fixture(){
 return {lines:[{id:'L1',phase:'L1',device:'B16',overloadInput:{ibA:10,izA:20},
 faultInput:{ikKa:3},overloadV30:{sectionMm2:2.5},lv43Input:{context:'review'},
 route44Input:{route:'A'},faultRouteInput:{reviewRequired:false}}]};
}
const values={ibA:12,izA:25,ikKa:5};
test('manual current entry is transactional',()=>{
 const p=fixture(),before=JSON.stringify(p),result=apply(p,'L1',values);
 assert.ok(result.project);assert.equal(JSON.stringify(p),before);
 assert.deepEqual(result.values,{ibA:12,izA:25,ikKa:5});
 assert.equal(result.engineeringApproved,false);
});
test("manual entry preserves unrelated pending fault route",()=>{
 const p=fixture();p.lines[0].calculationReview={required:true,reason:'OLD',pending:['route44Input']};
 const result=apply(p,'L1',values);
 assert.ok(result.project,JSON.stringify(result));
 assert.ok(result.project.lines[0].calculationReview.pending.includes("route44Input"));
});
test("manual entry preserves overload review",()=>{
 const p=fixture();p.lines[0].calculationReview={required:true,reason:'OLD',pending:['overloadV30']};
 const result=apply(p,'L1',values);
 assert.ok(result.project,JSON.stringify(result));
 assert.ok(result.project.lines[0].calculationReview.pending.includes("overloadV30"));
});
test("manual entry preserves earlier fault input review",()=>{
 const p=fixture();p.lines[0].calculationReview={required:true,reason:'OLD',pending:['faultInput']};
 const result=apply(p,'L1',values);
 assert.ok(result.project,JSON.stringify(result));
 assert.ok(result.project.lines[0].calculationReview.pending.includes("faultInput"));
});
test("manually overridden Ib becomes stale",()=>{
 const p=fixture();p.lines[0].loadCurrentCalculation={roundedIbA:10,powerSource:'circuit',stale:false};
 const result=apply(p,'L1',values);
 assert.ok(result.project,JSON.stringify(result));
 assert.deepEqual(result.project.lines[0].loadCurrentCalculation.stale,true);
});
test("linked current source becomes manual on override",()=>{
 const p=fixture();p.lines[0].loadCurrentCalculation={roundedIbA:10,powerSource:'circuit',stale:false};
 const result=apply(p,'L1',values);
 assert.ok(result.project,JSON.stringify(result));
 assert.deepEqual(result.project.lines[0].loadCurrentCalculation.powerSource,"manual");
});
test("consistent previously calculated Ib remains linked",()=>{
 const p=fixture();p.lines[0].loadCurrentCalculation={roundedIbA:12,powerSource:'circuit',stale:false};
 const result=apply(p,'L1',values);
 assert.ok(result.project,JSON.stringify(result));
 assert.deepEqual(result.project.lines[0].loadCurrentCalculation.powerSource,"circuit");
});
test("consistent calculated Ib is not marked stale",()=>{
 const p=fixture();p.lines[0].loadCurrentCalculation={roundedIbA:12,powerSource:'circuit',stale:false};
 const result=apply(p,'L1',values);
 assert.ok(result.project,JSON.stringify(result));
 assert.deepEqual(result.project.lines[0].loadCurrentCalculation.stale,false);
});
test("Iz and Ik entry does not erase load-current evidence",()=>{
 const p=fixture();p.lines[0].loadCurrentCalculation={roundedIbA:12,powerSource:'circuit',inputs:{powerKw:2.76},stale:false};
 const result=apply(p,'L1',values);
 assert.ok(result.project,JSON.stringify(result));
 assert.deepEqual(result.project.lines[0].loadCurrentCalculation.inputs.powerKw,2.76);
});
test("manual Ib override does not recalculate old current",()=>{
 const p=fixture();p.lines[0].loadCurrentCalculation={roundedIbA:10,powerSource:'circuit',inputs:{powerKw:2.3}};
 const result=apply(p,'L1',values);
 assert.ok(result.project,JSON.stringify(result));
 assert.deepEqual(result.project.lines[0].loadCurrentCalculation.roundedIbA,10);
});
test("entry exposes explicit provenance",()=>{
 const p=fixture();p.lines[0].faultInput={ikKa:2};
 const result=apply(p,'L1',values);
 assert.ok(result.project,JSON.stringify(result));
 assert.deepEqual(result.project.lines[0].protectionInputSource,"manual_declaration");
});
test("input changes mark overload pending",()=>{
 const p=fixture();p.lines[0].calculationReview={required:true,reason:'OLD',pending:[]};
 const result=apply(p,'L1',values);
 assert.ok(result.project,JSON.stringify(result));
 assert.deepEqual(result.project.lines[0].calculationReview.pending.slice().sort(),["faultInput","lv43Input","overloadInput","overloadV30","route44Input"]);
});

test('manual override cannot be silently overwritten by opt-in linked arithmetic',()=>{
 const p=fixture();p.lines[0].power=2.3;
 p.lines[0].loadCurrentCalculation={roundedIbA:10,mode:'single_phase',
  inputs:{powerKw:2.3,voltageV:230,powerFactor:1,efficiency:1,demandFactor:1},
  powerSource:'circuit',stale:false};
 const r=apply(p,'L1',values);
 epRefreshLinkedCurrentsV1(r.project);
 assert.equal(r.project.lines[0].overloadInput.ibA,12);
 assert.equal(r.project.lines[0].loadCurrentCalculation.powerSource,'manual');
 assert.equal(r.project.lines[0].loadCurrentCalculation.stale,true);
});
test('acknowledging only overloadInput retains the remaining engineer reviews',()=>{
 const p=fixture(),r=apply(p,'L1',values);
 assert.ok(ack(r.project.lines[0],'overloadInput'));
 assert.ok(r.project.lines[0].calculationReview.required);
 assert.ok(r.project.lines[0].calculationReview.pending.includes('faultInput'));
 assert.ok(r.project.lines[0].calculationReview.pending.includes('route44Input'));
});
test('duplicate circuit IDs fail closed and leave input intact',()=>{
 const p=fixture();p.lines.push({...p.lines[0]});
 const before=JSON.stringify(p),r=apply(p,'L1',values);
 assert.equal(r.status,'BLOCKED');assert.equal(r.code,'LINE_NOT_UNIQUE');
 assert.equal(r.project,null);assert.equal(JSON.stringify(p),before);
});
test('input of nonexisting circuit does not touch project',()=>{
 const p=fixture(),before=JSON.stringify(p);
 assert.equal(apply(p,'ABSENT',values).code,'LINE_NOT_FOUND');
 assert.equal(JSON.stringify(p),before);
});
test('nonpositive inputs never override old calculated current',()=>{
 const p=fixture(),before=JSON.stringify(p);
 for(const bad of [0,-1,'no',{},true,'NaN',null]){
  assert.equal(apply(p,'L1',{...values,ikKa:bad}).status,'BLOCKED');
  assert.equal(JSON.stringify(p),before);
 }
});
test('applicable views change without incorrectly invalidating BOM item identity',()=>{
 const p=fixture(),r=apply(p,'L1',values);
 assert.deepEqual(r.affectedViews,['protection','singleLine','engineeringReview','loadCurrent']);
 assert.equal(r.manualIbOverride,false);
});
test('manual Ib above declared Iz is a blocking conflict',()=>{
 const p=fixture(),r=apply(p,'L1',{ibA:30,izA:20,ikKa:5});
 assert.equal(r.status,'BLOCKED');
 assert.equal(r.code,'IB_EXCEEDS_IZ');
});
test('new typed electrical inputs preserve any existing nonreview metadata',()=>{
 const p=fixture();p.lines[0].overloadInput.method='engineer input';p.lines[0].faultInput.source='calculated';
 const r=apply(p,'L1',values);
 assert.equal(r.project.lines[0].overloadInput.method,'engineer input');
 assert.equal(r.project.lines[0].faultInput.source,'calculated');
});

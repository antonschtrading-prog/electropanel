'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const start=app.indexOf("const REVIEW_FIELDS=");
const end=app.indexOf("function applyCatalogueSku(",start);
assert.ok(start>0&&end>start);
const {markCalculationReview,acknowledgeCalculationReview}=vm.runInNewContext(
 app.slice(start,end)+"\n({markCalculationReview,acknowledgeCalculationReview})");
function row(){return {overloadInput:{ibA:'12'},faultInput:{ikKa:'3'},overloadV30:{ib_a:'12'}};}
test('change invalidates all three existing calculations',()=>{
 const line=row();markCalculationReview(line,'ARTICLE_CHANGED');
 assert.deepEqual(Array.from(line.calculationReview.pending),['overloadInput','faultInput','overloadV30']);
});
test('resaving current and fault declarations does not clear stale advanced calculation',()=>{
 const line=row();markCalculationReview(line,'ARTICLE_CHANGED');
 acknowledgeCalculationReview(line,'overloadInput');
 acknowledgeCalculationReview(line,'faultInput');
 assert.equal(line.calculationReview.required,true);
 assert.deepEqual(Array.from(line.calculationReview.pending),['overloadV30']);
});
test('only final explicit recheck clears review flag',()=>{
 const line=row();markCalculationReview(line,'ARTICLE_CHANGED');
 for(const field of ['faultInput','overloadV30','overloadInput'])acknowledgeCalculationReview(line,field);
 assert.equal(line.calculationReview,undefined);
});
test('additional changes never throw away still-pending fields',()=>{
 const line=row();markCalculationReview(line,'ARTICLE_CHANGED');
 acknowledgeCalculationReview(line,'overloadInput');
 markCalculationReview(line,'LOAD_CHANGED');
 assert.equal(line.calculationReview.required,true);
 assert.ok(Array.from(line.calculationReview.pending).includes('overloadV30'));
 assert.ok(Array.from(line.calculationReview.pending).includes('overloadInput'));
});
test('no declared current means no accidental safety signoff',()=>{
 const line={};markCalculationReview(line,'ARTICLE_CHANGED');
 assert.equal(line.calculationReview,undefined);
});

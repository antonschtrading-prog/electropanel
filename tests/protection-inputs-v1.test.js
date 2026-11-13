'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {epProtectionInputsV1:apply}=require('../protection-inputs-v1.js');
const p=()=>({lines:[{id:'L1',name:'Kitchen',overloadInput:{method:'declared'},faultInput:{source:'estimate'}}]});
const data=()=>({ibA:'12,5',izA:'20.0',ikKa:'4,5'});
test('valid manual declarations produce new project and stale review',()=>{
 const x=p(),r=apply(x,'L1',data());assert.equal(r.status,'UNKNOWN');
 assert.equal(r.project.lines[0].overloadInput.ibA,12.5);
 assert.equal(r.project.lines[0].overloadInput.izA,20);
 assert.equal(r.project.lines[0].faultInput.ikKa,4.5);
 assert.equal(r.project.lines[0].calculationReview.required,true);
 assert.equal(r.project.lines[0].protectionInputSource,'manual_declaration');
 assert.equal(x.lines[0].overloadInput.ibA,undefined);
});
test('existing unrelated input fields are preserved',()=>{
 const r=apply(p(),'L1',data());assert.equal(r.project.lines[0].overloadInput.method,'declared');
 assert.equal(r.project.lines[0].faultInput.source,'estimate');
});
test('invalid or zero values cannot be stored',()=>{
 for(const bad of ['',0,-1,'1e309','Infinity','-5','0,0','abc',true,{},null]){
  const d=data();d.ikKa=bad;assert.equal(apply(p(),'L1',d).status,'BLOCKED');
 }
});
test('current greater than cable capacity is blocked',()=>{
 assert.equal(apply(p(),'L1',{ibA:25,izA:16,ikKa:5}).code,'IB_EXCEEDS_IZ');
});
test('extreme unrealistic numeric inputs are rejected',()=>{
 assert.equal(apply(p(),'L1',{ibA:10,izA:20,ikKa:1001}).status,'BLOCKED');
});
test('missing circuit cannot mutate project',()=>{
 const x=p(),before=JSON.stringify(x);
 assert.equal(apply(x,'missing',data()).status,'BLOCKED');
 assert.equal(JSON.stringify(x),before);
});
test('valid input does not approve protection',()=>{
 const r=apply(p(),'L1',data());
 assert.equal(r.engineeringApproved,false);assert.equal(r.ready_for_installation,false);
});
test('input object itself is not changed',()=>{
 const d=data(),before=JSON.stringify(d);apply(p(),'L1',d);assert.equal(JSON.stringify(d),before);
});

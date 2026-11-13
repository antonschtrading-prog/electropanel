'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epVoltageDropDesignV1}=require('../voltage-drop-design-v1');
global.epVoltageDropDesignV1=epVoltageDropDesignV1;
const {epCircuitDesignReviewV1}=require('../circuit-design-review-v1');
global.epCircuitDesignReviewV1=epCircuitDesignReviewV1;
const {epDesignWorkQueueV1:queue,epDesignWorkQueueHtmlV1:html}=require('../design-work-queue-v1');
test('prioritizes engineering contradictions above missing inputs',()=>{
 const project={lines:[{id:'A',phase:'L1',catalogSku:'X',
  overloadInput:{ibA:25,izA:15},faultInput:{ikKa:10}},
  {id:'B',phase:'L1',overloadInput:{}}]};
 const q=queue(project,()=>({inA:16,icnKa:6}));
 assert.equal(q.status,'BLOCKED');assert.equal(q.items[0].priority,1);
 assert.ok(q.items.some(x=>x.lineId==='A'&&x.code==='IB_EXCEEDS_IN'));
 assert.ok(q.items.some(x=>x.lineId==='A'&&x.code==='ICN_BELOW_IK'));
 assert.ok(q.items.some(x=>x.lineId==='B'&&x.code==='IB_REQUIRED'));
});
test('flags missing voltage drop separately from known failures',()=>{
 const q=queue({lines:[{id:'A',phase:'L1',overloadInput:{ibA:10}}]},()=>null);
 assert.ok(q.items.some(x=>x.code==='VOLTAGE_DROP_REQUIRED'));
 assert.equal(q.summary.urgent,0);
});
test('unknown empty project produces empty work queue',()=>{
 const q=queue({lines:[]},()=>null);assert.equal(q.items.length,0);
 assert.equal(q.summary.circuits,0);
});
test('invalid project is blocked and not shown as successful',()=>{
 const q=queue(null,()=>null);assert.equal(q.status,'BLOCKED');
});
test('work queue UI escapes IDs and action strings',()=>{
 const q={summary:{urgent:1,missing:0,review:0},items:[{
  priority:1,lineId:'<svg onload=x>',action:'<script>alert(1)</script>',section:'load'}]};
 const h=html(q);assert.doesNotMatch(h,/<script|<svg/);
 assert.match(h,/&lt;script&gt;/);assert.match(h,/data-design-focus/);
});

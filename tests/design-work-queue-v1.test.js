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

test('maximum current above Icn is prioritised separately from min L-PE path',()=>{
 const route=require('../fault-route-design-v2.js');
 global.epMaximumFaultCurrentV2=route.epMaximumFaultCurrentV2;
 global.epFaultRouteProjectV2=route.epFaultRouteProjectV2;
 const article={kind:'MCB',sku:'A',inA:16,icnKa:4,poles:3,modules:3,label:'C16',
  icnVoltageV:400,icnStandard:'IEC 60898-1',verificationStatus:'UNVERIFIED'};
 const p={earthing:'TN-S',lines:[{id:'L1',phase:'3Ф',catalogSku:'A',device:'C16',modules:3,
  overloadInput:{ibA:8,izA:25},faultInput:{ikKa:2,voltageV:400,source:'separate study'},
  maximumFaultInput:{model:'THREE_PHASE_POSITIVE_SEQUENCE',uLLV:400,cmax:1.1,
   sourceROhm:0.04,sourceXOhm:0.03,networkSource:'grid calculation',
   segments:[{lengthM:30,r1OhmKm:0.4,x1OhmKm:0.08,source:'cable R/X',
    temperatureBasisConfirmed:true}]}}],branchDevices:[{id:'BD1',circuitId:'L1',modules:3,label:'C16'}]};
 const result=queue(p,()=>article);
 assert.ok(result.items.some(x=>x.code==='MAX_FAULT_EXCEEDS_ICN'&&x.priority===1));
 assert.ok(!result.items.some(x=>x.code==='FAULT_ROUTE_BLOCKED'),
  'the missing min-loop calculation is not a measured failure');
 assert.equal(result.status,'BLOCKED');
});

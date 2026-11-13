'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {epDraftBoardPlanV1}=require('../draft-board-plan-v1.js');
global.epDraftBoardPlanV1=epDraftBoardPlanV1;
const {epDraftBoardPreviewV1}=require('../draft-board-preview-v1.js');
const p=()=>({railCount:2,railCapacity:4,lines:[{id:'L1',modules:2},{id:'L2',modules:3}]});
test('preview renders both DIN rails and available capacity',()=>{const h=epDraftBoardPreviewV1(p());assert.match(h,/DIN 1/);assert.match(h,/DIN 2/);assert.match(h,/свободно 2/);});
test('preview never changes input',()=>{const x=p(),before=JSON.stringify(x);epDraftBoardPreviewV1(x);assert.equal(JSON.stringify(x),before);});
test('preview escapes untrusted IDs and article labels',()=>{const x=p();x.lines[0].id='<script>alert(1)</script>';const h=epDraftBoardPreviewV1(x);assert.doesNotMatch(h,/<script>/);assert.match(h,/&lt;script&gt;/);});
test('invalid dimensions display blocked warning',()=>{const x=p();x.railCount=0;assert.match(epDraftBoardPreviewV1(x),/заблокировано/);});
test('over-capacity is displayed as blocking issue',()=>{const x=p();x.railCount=1;assert.match(epDraftBoardPreviewV1(x),/RAIL_CAPACITY_EXCEEDED/);});
test('branch device stable ID is shown, not circuit ID',()=>{const x=p();x.branchDevices=[{id:'BR_L1',circuitId:'L1',modules:2}];assert.match(epDraftBoardPreviewV1(x),/BR_L1/);});

test('selected circuit is highlighted in preliminary DIN plan',()=>{
 const x=p();x.branchDevices=[{id:'BR_L1',circuitId:'L1',modules:2},{id:'BR_L2',circuitId:'L2',modules:3}];
 const h=epDraftBoardPreviewV1(x,null,'L1');
 assert.match(h,/class="ep-circuit-active"><strong>BR_L1/);
 assert.doesNotMatch(h,/class="ep-circuit-active"><strong>BR_L2/);
});

test('DIN preview uses actual proportional CSS grid module spans',()=>{
 const h=epDraftBoardPreviewV1(p());
 assert.match(h,/--ep-din-columns:4/);
 assert.match(h,/class="ep-din-block ep-din-unverified" style="grid-column:span 2"/);
 assert.match(h,/class="ep-din-block ep-din-unverified" style="grid-column:span 3"/);
 assert.match(h,/class="ep-din-empty" style="grid-column:span 2"/);
});
test('each rail has an accessible label and collapsible position list',()=>{
 const h=epDraftBoardPreviewV1(p());
 assert.match(h,/aria-label="Предварительная рейка DIN 1"/);
 assert.match(h,/<summary>Позиции аппаратов<\/summary>/);
});
test('selected circuit highlights visual DIN block as well as position list',()=>{
 const x=p();x.branchDevices=[{id:'BR_L1',circuitId:'L1',modules:2},{id:'BR_L2',circuitId:'L2',modules:3}];
 const h=epDraftBoardPreviewV1(x,null,'L1');
 assert.match(h,/ep-din-block ep-circuit-active ep-din-unverified/);
});
test('catalogue article is escaped in visual DIN tooltip',()=>{
 const x=p();x.lines[0].catalogSku='<img src=x onerror=alert(1)>';
 const h=epDraftBoardPreviewV1(x,()=>({modules:2}));
 assert.doesNotMatch(h,/<img/);
 assert.match(h,/&lt;img/);
});

test('branch DIN block can focus its circuit without editing project',()=>{
 const x=p();x.branchDevices=[{id:'BR_L1',circuitId:'L1',modules:2},{id:'BR_L2',circuitId:'L2',modules:3}];
 const before=JSON.stringify(x),h=epDraftBoardPreviewV1(x,null,'L1');
 assert.match(h,/data-din-focus="L1"/);
 assert.match(h,/data-din-focus="L2"/);
 assert.equal(JSON.stringify(x),before);
});
test('shared DIN apparatus does not invent a circuit navigation target',()=>{
 const x=p();x.sharedDevices=[{id:'MAIN',modules:1}];
 const h=epDraftBoardPreviewV1(x);
 assert.match(h,/disabled><span class="ep-din-block-id">MAIN/);
});
test('DIN circuit IDs in button attributes are HTML escaped',()=>{
 const x=p();x.lines[0].id='"><svg onload=alert(1)>';
 const h=epDraftBoardPreviewV1(x);
 assert.doesNotMatch(h,/<svg/);
 assert.match(h,/data-din-focus="&quot;&gt;&lt;svg/);
});

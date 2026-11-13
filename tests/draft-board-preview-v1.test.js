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

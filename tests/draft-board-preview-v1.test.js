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

test('curated manufacturer ratings appear on nominal DIN facade',()=>{
 const {EP_CATALOG,epCatalogSku}=require('../catalog.js');
 const x=p();x.lines[0].catalogSku='ABB-2CDS251001R0164';
 x.lines[0].modules=1;
 const h=epDraftBoardPreviewV1(x,epCatalogSku);
 assert.match(h,/ep-din-brand/);
 assert.match(h,/ABB/);
 assert.match(h,/System pro M S200/);
 assert.match(h,/16 A/);
 assert.match(h,/6 kA/);
});
test('unknown article does not invent manufacturer facade',()=>{
 const x=p();x.lines[0].catalogSku='NONEXISTENT';
 const h=epDraftBoardPreviewV1(x,()=>null);
 assert.doesNotMatch(h,/ep-din-brand">ABB/);
 assert.match(h,/ARTICLE_UNKNOWN|Не выбран|Артикул/);
});

test('preview shows illustrated apparatus faceplate without claiming manufacturer photography',()=>{
 const {epDraftBoardPreviewV1}=require('../draft-board-preview-v1');
 const project={railCount:1,railCapacity:12,lines:[{id:'L1',modules:1,catalogSku:'ABB'}],
  branchDevices:[{id:'BR1',circuitId:'L1',modules:1}],sharedDevices:[]};
 const h=epDraftBoardPreviewV1(project,sku=>sku==='ABB'?{
  maker:'ABB',series:'S200',appearance:'abb',modules:1,inA:16,icnKa:6}:null,'L1');
 assert.match(h,/ep-din-device-face/);assert.match(h,/ep-din-face-abb/);
 assert.match(h,/ep-din-device-toggle/);
});

test('DIN preview carries declared body dimensions into accessible labels and visible face',()=>{
 const project={railCount:1,railCapacity:4,
  lines:[{id:'L1',modules:1,catalogSku:'CUSTOM'}],
  branchDevices:[{id:'BR1',circuitId:'L1',modules:1}],sharedDevices:[]};
 const device={sku:'CUSTOM',maker:'ABB',series:'Example',kind:'MCB',modules:1,widthMm:18,
  heightMm:85,depthMm:78.5,inA:16,source:'https://example.org/data'};
 const before=JSON.stringify(project);
 const h=epDraftBoardPreviewV1(project,()=>device,'L1');
 assert.match(h,/Корпус Ш×В×Г: 18 × 85 × 78.5 мм/);
 assert.match(h,/class="ep-din-block-body-size"/);
 assert.match(h,/18 × 85 × 78.5 мм<\/span>/);
 assert.equal(JSON.stringify(project),before);
});
test('DIN preview never fabricates missing cabinet body dimensions',()=>{
 const project={railCount:1,railCapacity:4,lines:[{id:'L1',modules:1,catalogSku:'CUSTOM'}],
  branchDevices:[{id:'BR1',circuitId:'L1',modules:1}]};
 const h=epDraftBoardPreviewV1(project,()=>({modules:1,widthMm:18,kind:'MCB'}));
 assert.match(h,/18 × — × — мм/);
 assert.doesNotMatch(h,/18 × 85 × 78.5/);
});

test('new official-source manufacturer series have distinct styled DIN facades',()=>{
 const {epCatalogSku}=require('../catalog.js');
 for(const [id,appearance] of [['HA-MBN116','hager'],['LE-406775','legrand'],['SI-5SL6116-7','siemens']]){
  const device=epCatalogSku(id),project={railCount:1,railCapacity:6,
   lines:[{id:'L1',modules:1,catalogSku:id}],branchDevices:[{id:'BR1',circuitId:'L1',modules:1}]};
  const h=epDraftBoardPreviewV1(project,epCatalogSku,'L1');
  assert.match(h,new RegExp('ep-din-face-'+appearance));
  assert.match(h,new RegExp('ep-din-block-body-size'));
  assert.ok(h.includes(String(device.widthMm)));
  assert.equal(device.verificationStatus,undefined);
 }
});

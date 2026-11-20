'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
global.epDraftBoardPlanV1=require('../draft-board-plan-v1.js').epDraftBoardPlanV1;
global.epDinPhysicalEnvelopeV1=require('../din-physical-envelope-v1.js').epDinPhysicalEnvelopeV1;
global.epCatalogFrontSvgV1=require('../catalog-front-svg-v1.js').epCatalogFrontSvgV1;
global.epManufacturerVisualHtmlV1=require('../manufacturer-visual-library-v1.js').epManufacturerVisualHtmlV1;
const {epDraftBoardPreviewV1:render}=require('../draft-board-preview-v1.js');
const device=()=>({maker:'ABB',series:'S200',sku:'A1',kind:'MCB',poles:1,modules:1,
 widthMm:17.5,heightMm:85,depthMm:75,inA:16,curve:'C'});
const project=()=>({railCount:1,railCapacity:4,
 lines:[{id:'L1',name:'Light',modules:1,catalogSku:'A1'}],sharedDevices:[]});
test('full preview contains original vector face and physical measurements',()=>{
 const p=project(),before=JSON.stringify(p),html=render(p,()=>device(),'L1');
 assert.match(html,/class="ep-manufacturer-front"/);
 assert.match(html,/Габаритная ширина по каталогу: 1/);
 assert.match(html,/17.5 × 85 × 75 мм/);
 assert.doesNotMatch(html,/<img class="ep-manufacturer-front-image"/);
 assert.equal(JSON.stringify(p),before);
});
test('overflowing physical body is visibly blocked',()=>{
 const html=render(project(),()=>({...device(),widthMm:19}));
 assert.match(html,/DIN_ENVELOPE_BODY_OVERFLOW/);
 assert.match(html,/Противоречия физических габаритов/);
});
test('unknown body height and depth do not become made-up numbers',()=>{
 const d=device();delete d.heightMm;delete d.depthMm;
 const html=render(project(),()=>d);
 assert.match(html,/17.5 × — × — мм/);
 assert.doesNotMatch(html,/17.5 × 85 × 75 мм/);
});
test('unresolved article stays unverified and cannot invent manufacturer geometry',()=>{
 const html=render(project(),()=>null);
 assert.match(html,/ARTICLE_UNKNOWN/);
 assert.doesNotMatch(html,/class="ep-manufacturer-front"/);
 assert.match(html,/DIN 1 · 0\/4 мод/);
});

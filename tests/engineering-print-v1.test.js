'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epEngineeringPrintV1:print}=require('../engineering-print-v1');
const bundle=()=>({projectTitle:'ЩР-1',overallStatus:'BLOCKED',statuses:{board:'UNKNOWN',crossView:'BLOCKED'},
 sections:{dossier:{rows:[{circuitId:'L1',name:'Розетки',phase:'L1',sku:'ABB-1',placement:{rail:1,from:1,to:1},calculationReviewRequired:true}]},
 protection:{rows:[{lineId:'L1',ibA:12,izA:20,ikKa:5,selectedSku:'ABB-1',selectedArticle:{inA:16,icnKa:6},status:'UNKNOWN',reasons:['REVIEW_REQUIRED']}]},
 board:{placements:[{deviceId:'BR_L1',railIndex:0,startModule:0,modules:1,article:'ABB-1'}]},
 bom:{items:[{sku:'ABB-1',maker:'ABB',series:'S200',quantity:1,modules:1,source:'https://example.org'}]},
 crossView:{issues:[{level:'BLOCKED',code:'MISMATCH',lineId:'L1'}]}}});
test('print report includes all five engineering sections',()=>{
 const h=print(bundle());
 for(const title of ['Ведомость цепей','Предварительный подбор защиты','DIN-компоновка',
 'Спецификация оборудования','Расхождения между представлениями'])assert.ok(h.includes(title),title);
 assert.match(h,/BR_L1/);assert.match(h,/ABB-1/);
});
test('print report is self-contained and clearly not for installation',()=>{
 const h=print(bundle());
 assert.match(h,/<!doctype html>/);assert.match(h,/НЕ ДЛЯ МОНТАЖА/);
 assert.match(h,/@page/);assert.doesNotMatch(h,/<script|<link /);
});
test('print report escapes user-controlled project and issue text',()=>{
 const b=bundle();b.projectTitle='<img src=x onerror=alert(1)>';
 b.sections.crossView.issues[0].code='<script>alert(1)</script>';
 const h=print(b);assert.doesNotMatch(h,/<img|<script/);
 assert.match(h,/&lt;img/);assert.match(h,/&lt;script&gt;/);
});
test('missing bundle still yields explicitly blocked report',()=>{
 const h=print(null);assert.match(h,/Состояние: BLOCKED/);
 assert.match(h,/НЕ ДЛЯ МОНТАЖА/);
});
test('print does not mutate report data',()=>{
 const b=bundle(),before=JSON.stringify(b);print(b);assert.equal(JSON.stringify(b),before);
});

test('print report includes the complete engineering issue register',()=>{
 const b=bundle();b.sections.issueRegister={entries:[
  {section:'protection',level:'BLOCKED',code:'IN_GT_IZ',circuitId:'L1'},
  {section:'board',level:'UNKNOWN',code:'THERMAL_NOT_VERIFIED',circuitId:null}]};
 const h=print(b);
 assert.match(h,/Все инженерные замечания/);
 assert.match(h,/IN_GT_IZ/);
 assert.match(h,/THERMAL_NOT_VERIFIED/);
});

test('print embeds vector one-line diagram when renderer is loaded',()=>{
 const b=bundle();b.sections.singleLine={status:'UNKNOWN',nodes:[
  {id:'SOURCE:MAIN',type:'source',name:'Ввод'},
  {id:'CIRCUIT:L1',type:'circuit',lineId:'L1',name:'Розетки',phase:'L1',
   article:{maker:'ABB',series:'S200',label:'S201-C16',inA:16,icnKa:6,poles:1}}],
 edges:[{from:'SOURCE:MAIN',to:'CIRCUIT:L1'}]};
 global.epSingleLineSvgV1=require('../single-line-svg-v1').epSingleLineSvgV1;
 try{
  const h=print(b);assert.match(h,/<svg/);assert.match(h,/data-single-line-focus="L1"/);
  assert.match(h,/НЕ ДЛЯ МОНТАЖА/);
 }finally{delete global.epSingleLineSvgV1;}
});

test('print report includes declared equipment W H D dimensions and marks unknowns',()=>{
 const b=bundle();
 b.sections.bom.items[0]={...b.sections.bom.items[0],widthMm:18,heightMm:85,depthMm:78.5};
 b.sections.catalogEvidence={items:[{role:'circuit',ownerId:'L1',articleId:'ABB-1',
  sku:'ABB-1',manufacturer:'ABB',series:'S200',widthMm:18,heightMm:85,depthMm:null,
  source:'https://example.org/abb',verificationStatus:'UNVERIFIED'}]};
 const h=print(b);
 assert.match(h,/Глубина, мм/);assert.match(h,/>78.5<\/td>/);
 assert.match(h,/>85<\/td>/);assert.match(h,/>—<\/td>/);
 assert.match(h,/НЕ ДЛЯ МОНТАЖА/);
});

test('print cabinet capacity rows are transparently preliminary',()=>{
 const b=bundle();
 b.sections.cabinetCapacity={options:[{
  status:'REVIEW_REQUIRED',capacityModules:36,railCount:3,modulesPerRail:12,reserveModules:4,
  envelope:{preliminaryUsableWidthMm:356,preliminaryUsableHeightMm:650,
   preliminaryUsableDepthMm:null},withinDeclaredLimits:false
 }]};
 const html=print(b);
 assert.match(html,/Варианты вместимости и предварительной компоновки/);
 assert.match(html,/Превышены/);
 assert.match(html,/НЕИЗВЕСТНА/);
 assert.match(html,/не паспортные размеры/);
});

test('print distinguishes nominal region distances from manufacturer connection proof',()=>{
 const b=bundle();
 b.sections.cabinetConnectionSpace={status:'REVIEW_REQUIRED',rows:[{
  deviceId:'BR_L1',railIndex:0,
  nearestWireDuct:{regionId:'ductA',distanceMm:12},
  nearestTerminalRegion:{regionId:'termA',distanceMm:44}
 }]};
 const h=print(b);
 assert.match(h,/Зоны подключения и кабельные каналы/);
 assert.match(h,/ductA/);assert.match(h,/termA/);
 assert.match(h,/НЕ ВЫПОЛНЕНА/);
 assert.match(h,/не отражают путь проводника/);
});

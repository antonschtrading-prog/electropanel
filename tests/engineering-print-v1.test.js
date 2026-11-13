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

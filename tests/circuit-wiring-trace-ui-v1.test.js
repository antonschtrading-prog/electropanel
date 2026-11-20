'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epCircuitWiringTraceHtmlV1:html,epCircuitWiringTraceCsvV1:csv}=require('../circuit-wiring-trace-ui-v1');
const report=()=>({status:'UNKNOWN',summary:{connections:1,declaredPaths:1,blocked:0,unknown:1},
 rows:[{lineId:'L1',status:'UNKNOWN',declaredPaths:1,blocked:0,unknown:1,
 connections:[{id:'C1',group:'terminalLinks',role:'L1',from:'BRANCH:b/L1',to:'LOAD:l/L1',
 status:'DECLARED_PATH',code:'DECLARED_WIRE_PATH_ONLY',path:['a','b','c']}]}]});
test('wiring UI displays circuit-specific path and no physical approval',()=>{
 const h=html(report(),'L1');
 assert.match(h,/a → b → c/);assert.match(h,/прохождение тока|Прохождение тока/);
 assert.match(h,/<details[^>]*open/);
});
test('wiring UI escapes user-controlled refs and IDs',()=>{
 const r=report();r.rows[0].lineId='"><img src=x>';r.rows[0].connections[0].from='<script>alert(1)</script>';
 const h=html(r);assert.doesNotMatch(h,/<img|<script/);
 assert.match(h,/&lt;script&gt;/);
});
test('wiring CSV contains all lines even when UI focus filters',()=>{
 const r=report();r.rows.push({lineId:'L2',connections:[{group:'feedLinks',role:'N',from:'A',to:'B',
 status:'UNKNOWN',code:'UNBOUND',path:[]}]});
 const s=csv(r);assert.match(s,/L1/);assert.match(s,/L2/);
});
test('wiring CSV neutralizes spreadsheet formulas',()=>{
 const r=report();r.rows[0].connections[0].from='=HYPERLINK(1)';
 assert.match(csv(r),/"'=HYPERLINK\(1\)"/);
});
test('missing trace report shows fail-closed message',()=>assert.match(html(null),/не выполнена/));

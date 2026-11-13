'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {epEngineeringDiagnosticsPanelV1:panel}=require('../engineering-diagnostics-ui-v1.js');
test('UI remains conservative without gate',()=>{
 const h=panel({});assert.match(h,/Монтаж не подтверждён/);
 assert.match(h,/ENGINEERING_GATE_MISSING/);
});
test('UI does not render untrusted HTML from project',()=>{
 const h=panel({name:'<img src=x onerror=alert(1)>'});
 assert.doesNotMatch(h,/<img/);
});
test('UI provides region and visible draft warning',()=>{
 const h=panel({});assert.match(h,/role="region"/);assert.match(h,/черновик/);
});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epConductorTraceSvgV1:svg}=require('../conductor-trace-svg-v1');
const fixture=()=>({rows:[{lineId:'L1',connections:[
 {group:'terminalLinks',from:'BRANCH:BR1/L1',to:'LOAD:LD1/L1',role:'L1',status:'DECLARED_PATH',
  code:'DECLARED_WIRE_PATH_ONLY',path:['t1','t2','t3']},
 {group:'terminalLinks',from:'BUS:N_MAIN/N',to:'LOAD:LD1/N',role:'N',status:'BLOCKED',
  code:'DECLARED_WIRE_PATH_MISSING',path:[]},
 {group:'terminalLinks',from:'BUS:PE_MAIN/PE',to:'LOAD:LD1/PE',role:'PE',status:'UNKNOWN',
  code:'WIRE_SCHEMA_INVALID_OR_UNVERIFIED_STATE',path:[]}]},
 {lineId:'L2',connections:[]}]});
test('visual trace shows L/N/PE roles, endpoints and declared terminal path',()=>{
 const h=svg(fixture(),'L1');assert.match(h,/t1 → t2 → t3/);
 assert.match(h,/BUS:N_MAIN\/N/);assert.match(h,/BUS:PE_MAIN\/PE/);
 assert.match(h,/Путь заявлен/);assert.match(h,/Нет подтверждённого пути/);
});
test('visual trace draws incomplete links dashed, not continuous',()=>{
 const h=svg(fixture(),'L1');assert.match(h,/stroke-dasharray="7 7"/);
});
test('visual trace does not claim physical wiring',()=>{
 assert.match(svg(fixture(),'L1'),/не подтверждает физический монтаж/);
});
test('visual trace selected circuit only',()=>{
 const h=svg(fixture(),'L2');assert.match(h,/Связи этой цепи не объявлены/);
 assert.doesNotMatch(h,/BRANCH:BR1/);
});
test('missing selected circuit is not fabricated',()=>{
 assert.match(svg(fixture(),'MISSING'),/Выберите цепь/);
});
test('invalid trace fails closed',()=>assert.match(svg(null,'L1'),/недоступна/));
test('visual trace escapes HTML injection',()=>{
 const p=fixture();p.rows[0].connections[0].from='<script>alert(1)</script>';
 p.rows[0].lineId='"><img src=x>';
 const h=svg(p,p.rows[0].lineId);assert.doesNotMatch(h,/<script>|<img/);
 assert.match(h,/&lt;script&gt;/);
});
test('visual trace does not mutate report',()=>{
 const p=fixture(),before=JSON.stringify(p);svg(p,'L1');assert.equal(JSON.stringify(p),before);
});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {epProjectDeviceIdentityHtmlV1:render}=require('../project-device-identity-ui-v1');
const report=()=>({status:'REVIEW_REQUIRED',rows:[{id:'R1',kind:'shared',owner:'R1',sku:'RCD-1',modules:2,
 board:{deviceId:'R1'},schematic:{id:'RCD:R1'},bom:{id:'R1'},status:'LINKED_DRAFT'}],issues:[]});
test('renders shared apparatus',()=>assert.match(render(report()),/Групповой/));
test('renders article',()=>assert.match(render(report()),/RCD-1/));
test('renders device id',()=>assert.match(render(report()),/R1/));
test('renders width',()=>assert.match(render(report()),/>2</));
test('renders linked status',()=>assert.match(render(report()),/LINKED_DRAFT/));
test('renders warning',()=>assert.match(render(report()),/не подтверждает характеристики/));
test('renders review status',()=>assert.match(render(report()),/REVIEW_REQUIRED/));
test('renders three views',()=>assert.match(render(report()),/DIN/));
test('renders schematic',()=>assert.match(render(report()),/Схема/));
test('renders BOM',()=>assert.match(render(report()),/Ведомость/));
test('renders empty report',()=>assert.match(render(null),/UNKNOWN/));
test('renders empty rows',()=>assert.match(render({rows:[],issues:[]}),/<tbody><\/tbody>/));
test('escapes script',()=>{const r=report();r.rows[0].sku='<script>alert(1)</script>';assert.ok(!render(r).includes('<script>'))});
test('escapes issue count',()=>assert.match(render(report()),/Замечания: 0/));
test('handles missing board',()=>{const r=report();r.rows[0].board=null;assert.match(render(r),/>Нет</)});
test('handles missing BOM',()=>{const r=report();r.rows[0].bom=null;assert.match(render(r),/>Нет</)});
test('handles missing schematic',()=>{const r=report();r.rows[0].schematic=null;assert.match(render(r),/>Нет</)});
test('renders branch kind',()=>{const r=report();r.rows[0].kind='branch';assert.match(render(r),/Линейный/)});
test('does not mutate report',()=>{const r=report(),before=JSON.stringify(r);render(r);assert.equal(JSON.stringify(r),before)});
test('deterministic',()=>{const r=report();assert.equal(render(r),render(r))});
test('browser loads identity before app',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 assert.ok(html.indexOf('project-device-identity-ui-v1.js')<html.indexOf('app.js'));
});
test('app displays identity table',()=>{
 const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
 assert.match(app,/epProjectDeviceIdentityHtmlV1\(epProjectDeviceIdentityV1\(state,catalogDevice\)\)/);
});

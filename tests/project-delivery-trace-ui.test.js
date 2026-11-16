'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const {epProjectDeliveryTraceHtmlV1,epProjectDeliveryTraceCsvV1}=require('../project-delivery-trace-ui-v1');
const report=()=>({status:'REVIEW_REQUIRED',rows:[{lineId:'L1',name:'Lighting',consumerCount:2,articleSku:'SKU1',
 workflow:{lineId:'L1'},schematic:{id:'CIRCUIT:L1'},board:{railIndex:0,startModule:2},bom:{sku:'SKU1'},crossViewStatus:'LINKED_DRAFT'}],issues:[]});
test('HTML contains project trace heading',()=>assert.match(epProjectDeliveryTraceHtmlV1(report()),/Сквозная трассировка проекта/));
test('HTML contains circuit ID',()=>assert.match(epProjectDeliveryTraceHtmlV1(report()),/L1/));
test('HTML contains circuit title',()=>assert.match(epProjectDeliveryTraceHtmlV1(report()),/Lighting/));
test('HTML contains article',()=>assert.match(epProjectDeliveryTraceHtmlV1(report()),/SKU1/));
test('HTML contains consumers',()=>assert.match(epProjectDeliveryTraceHtmlV1(report()),/>2</));
test('HTML contains rail position',()=>assert.match(epProjectDeliveryTraceHtmlV1(report()),/Ряд 1, модуль 3/));
test('HTML contains workflow',()=>assert.match(epProjectDeliveryTraceHtmlV1(report()),/Расчёт/));
test('HTML contains schematic',()=>assert.match(epProjectDeliveryTraceHtmlV1(report()),/Схема/));
test('HTML contains DIN',()=>assert.match(epProjectDeliveryTraceHtmlV1(report()),/DIN/));
test('HTML contains BOM',()=>assert.match(epProjectDeliveryTraceHtmlV1(report()),/Спецификация/));
test('HTML contains draft status',()=>assert.match(epProjectDeliveryTraceHtmlV1(report()),/LINKED_DRAFT/));
test('HTML never claims installation approval',()=>assert.match(epProjectDeliveryTraceHtmlV1(report()),/Не является разрешением к монтажу/));
test('HTML contains CSV button',()=>assert.match(epProjectDeliveryTraceHtmlV1(report()),/projectDeliveryTraceCsvBtn/));
test('HTML escapes script in line name',()=>{
 const r=report();r.rows[0].name='<script>alert(1)</script>';
 const html=epProjectDeliveryTraceHtmlV1(r);assert.ok(!html.includes('<script>'));assert.match(html,/&lt;script&gt;/);
});
test('HTML escapes quotes in line name',()=>{
 const r=report();r.rows[0].name='" onclick="alert(1)';
 assert.ok(!epProjectDeliveryTraceHtmlV1(r).includes('onclick="alert(1)'));
});
test('HTML safely handles empty report',()=>assert.match(epProjectDeliveryTraceHtmlV1(null),/Нет данных/));
test('HTML safely handles zero rows',()=>assert.match(epProjectDeliveryTraceHtmlV1({rows:[],issues:[]}),/<tbody><\/tbody>/));
test('HTML safely handles issues',()=>{
 const r=report();r.issues=[{code:'MISSING_ARTICLE',lineId:'L1'}];
 assert.match(epProjectDeliveryTraceHtmlV1(r),/MISSING_ARTICLE/);
});
test('HTML escapes issue content',()=>{
 const r=report();r.issues=[{code:'<img src=x onerror=alert(1)>'}];
 assert.ok(!epProjectDeliveryTraceHtmlV1(r).includes('<img'));
});
test('CSV contains line ID',()=>assert.match(epProjectDeliveryTraceCsvV1(report()).csv,/L1/));
test('CSV contains article',()=>assert.match(epProjectDeliveryTraceCsvV1(report()).csv,/SKU1/));
test('CSV contains consumer count',()=>assert.match(epProjectDeliveryTraceCsvV1(report()).csv,/"2"/));
test('CSV contains source rail index',()=>assert.match(epProjectDeliveryTraceCsvV1(report()).csv,/"0"/));
test('CSV contains source module index',()=>assert.match(epProjectDeliveryTraceCsvV1(report()).csv,/"2"/));
test('CSV contains BOM flag',()=>assert.match(epProjectDeliveryTraceCsvV1(report()).csv,/"true"/));
test('CSV contains column header',()=>assert.match(epProjectDeliveryTraceCsvV1(report()).csv,/line_id/));
test('CSV uses semicolon delimiter',()=>assert.match(epProjectDeliveryTraceCsvV1(report()).csv,/";"/));
test('CSV does not approve engineering',()=>assert.equal(epProjectDeliveryTraceCsvV1(report()).engineeringApproved,false));
test('CSV does not approve installation',()=>assert.equal(epProjectDeliveryTraceCsvV1(report()).ready_for_installation,false));
test('CSV empty report has header',()=>assert.match(epProjectDeliveryTraceCsvV1(null).csv,/line_id/));
test('CSV formula injection neutralized',()=>{
 const r=report();r.rows[0].name='=HYPERLINK(1)';
 assert.match(epProjectDeliveryTraceCsvV1(r).csv,/"'=HYPERLINK\(1\)"/);
});
test('CSV quotes embedded quote',()=>{
 const r=report();r.rows[0].name='Lighting "Main"';
 assert.match(epProjectDeliveryTraceCsvV1(r).csv,/Lighting ""Main""/);
});
test('CSV deterministic',()=>{const r=report();assert.equal(epProjectDeliveryTraceCsvV1(r).csv,epProjectDeliveryTraceCsvV1(r).csv)});
test('HTML deterministic',()=>{const r=report();assert.equal(epProjectDeliveryTraceHtmlV1(r),epProjectDeliveryTraceHtmlV1(r))});
test('HTML does not mutate input',()=>{const r=report(),before=JSON.stringify(r);epProjectDeliveryTraceHtmlV1(r);assert.equal(JSON.stringify(r),before)});
test('CSV does not mutate input',()=>{const r=report(),before=JSON.stringify(r);epProjectDeliveryTraceCsvV1(r);assert.equal(JSON.stringify(r),before)});
test('HTML limits displayed rows',()=>{
 const r=report();r.rows=Array.from({length:410},(_,i)=>({...r.rows[0],lineId:'L'+i}));
 assert.ok(!epProjectDeliveryTraceHtmlV1(r).includes('L409'));
});
test('HTML limits displayed issues',()=>{
 const r=report();r.issues=Array.from({length:35},(_,i)=>({code:'ISSUE_'+i}));
 assert.ok(!epProjectDeliveryTraceHtmlV1(r).includes('ISSUE_34'));
});
test('HTML handles absent placement',()=>{
 const r=report();r.rows[0].board=null;assert.match(epProjectDeliveryTraceHtmlV1(r),/Нет/);
});
test('HTML handles absent BOM',()=>{
 const r=report();r.rows[0].bom=null;assert.match(epProjectDeliveryTraceHtmlV1(r),/Нет/);
});
test('HTML handles absent schematic',()=>{
 const r=report();r.rows[0].schematic=null;assert.match(epProjectDeliveryTraceHtmlV1(r),/Нет/);
});
test('HTML handles absent workflow',()=>{
 const r=report();r.rows[0].workflow=null;assert.match(epProjectDeliveryTraceHtmlV1(r),/Нет/);
});
test('HTML handles missing SKU',()=>{
 const r=report();r.rows[0].articleSku=null;assert.match(epProjectDeliveryTraceHtmlV1(r),/Не выбран/);
});
test('index loads trace engine before UI',()=>{
 const html=root('index.html');assert.ok(html.indexOf('project-delivery-trace-v1.js')<html.indexOf('project-delivery-trace-ui-v1.js'));
});
test('index loads trace UI before app',()=>{
 const html=root('index.html');assert.ok(html.indexOf('project-delivery-trace-ui-v1.js')<html.indexOf('app.js'));
});
test('app renders trace in project workflow',()=>assert.match(root('app.js'),/epProjectDeliveryTraceHtmlV1\(trace\)/));
test('app exports trace CSV',()=>assert.match(root('app.js'),/project-delivery-trace\.csv/));
test('bundle includes trace section',()=>assert.match(root('engineering-bundle-v1.js'),/PROJECT_DELIVERY_TRACE/));
test('trace never fabricates source values',()=>assert.match(root('project-delivery-trace-v1.js'),/Never fills missing design inputs/));

'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
test('convergence script is after evidence and review queue but before app',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const i=html.indexOf('src="cabinet-delivery-convergence-v1.js"');
 assert.ok(i>html.indexOf('src="front-evidence-ledger-v1.js"'));
 assert.ok(i>html.indexOf('src="front-review-queue-v1.js"'));
 assert.ok(i<html.indexOf('src="app.js"'));
});
test('convergence script appears once',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.equal(html.split('src="cabinet-delivery-convergence-v1.js"').length-1,1);
});
test('gallery computes report from current project and article lookup',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/epCabinetDeliveryConvergenceV1\(state,catalogDevice,epManufacturerFrontResolveV1\)/);
});
test('gallery shows DIN occupancy and evidence problems',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/Сверка щита: DIN · спецификация · фасады/);
 assert.match(app,/DIN-модулей/);
 assert.match(app,/конфликтов габаритов/);
});
test('gallery exports current report as CSV',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/Скачать сквозную сверку щита CSV/);
 assert.match(app,/epCabinetDeliveryConvergenceCsvV1\(buildReport\(\)\)/);
 assert.match(app,/_cabinet_convergence.csv/);
});
test('gallery distinguishes blocked and review-required state',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/section.dataset.convergenceStatus=result.status/);
 assert.match(app,/есть блокирующие несоответствия/);
});
test('gallery explicitly avoids implying installation approval',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/Это не разрешение на монтаж/);
});
test('gallery uses textContent rather than injecting report HTML',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/summary.textContent='Размещено '/);
});

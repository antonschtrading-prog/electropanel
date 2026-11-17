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

test('cabinet capacity option is crosschecked against the same BOM and DIN engine',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const start=app.indexOf('function applyCabinetCapacityOptionV1(');
 const end=app.indexOf('function renderBoardConnectionAdvisoryV1(',start);
 const body=app.slice(start,end);
 assert.match(body,/epCabinetDeliveryConvergenceV1\(proposed/);
 assert.match(body,/CONVERGENCE_ARTICLE_MISMATCH/);
 assert.match(body,/CONVERGENCE_CAPACITY_SUM_MISMATCH/);
 assert.doesNotMatch(body,/CONVERGENCE_BOM_BLOCKED/);
 assert.match(body,/Компоновка не применена/);
});
test('cabinet capacity selection does not treat missing image as an automatic rejection',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const body=app.slice(app.indexOf('function applyCabinetCapacityOptionV1('),app.indexOf('function renderBoardConnectionAdvisoryV1('));
 assert.doesNotMatch(body,/CONVERGENCE_FRONT_EVIDENCE_BLOCKED/);
 assert.doesNotMatch(body,/CONVERGENCE_FRONT_REVIEW_BLOCKED/);
});
test('cabinet capacity crosscheck precedes checkpoint and project mutation',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const body=app.slice(app.indexOf('function applyCabinetCapacityOptionV1('),app.indexOf('function renderBoardConnectionAdvisoryV1('));
 assert.ok(body.indexOf('epCabinetDeliveryConvergenceV1(proposed')<body.indexOf('checkpoint();'));
});

test('preliminary enclosure selection is permitted without assigned catalogue articles',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const body=app.slice(app.indexOf('function applyCabinetCapacityOptionV1('),app.indexOf('function renderBoardConnectionAdvisoryV1('));
 assert.doesNotMatch(body,/CONVERGENCE_LEDGER_QUANTITY_MISMATCH/);
 assert.doesNotMatch(body,/CONVERGENCE_BOM_MISSING/);
});

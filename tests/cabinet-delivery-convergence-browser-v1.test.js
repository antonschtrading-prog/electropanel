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

test('cabinet comparison is loaded before application',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.ok(html.indexOf('src="cabinet-option-compare-v1.js"')<html.indexOf('src="app.js"'));
});
test('cabinet ranking is computed from eligible constrained options',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/epCabinetOptionCompareV1\(report,/);
 assert.match(app,/excludedIds:report.options.filter/);
});
test('cabinet sizing offers five user-controlled ranking priorities',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 for(const key of ['balanced','compact','wide','tall','connections'])
  assert.match(app,new RegExp("'"+key+"'"));
 assert.match(app,/data-cabinet-option-preference/);
});
test('cabinet sizing ranks eligible shapes and preserves capacity filter',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/good.filter\(o=>cabinetOptionShowAllCapacitiesV1\|\|o.capacityModules===cabinetCapacitySelectedTotalV1\)/);
 assert.match(app,/ranking.get\(a.id\)/);
});
test('cabinet ranking preference changes without editing project state',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/cabinetOptionPreferenceV1=e.target.value;renderCabinetCapacityOptionsV1\(\)/);
});
test('cabinet option highlights recommendation and does not autoapply it',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/comparison\?\.recommendedId===o.id/);
 assert.match(app,/data-apply-cabinet-option/);
});

test('cabinet option CSV is available in board interface',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(html,/id="exportCabinetCompareCsvBtn"/);
 assert.ok(html.indexOf('cabinet-option-compare-csv-v1.js')<html.indexOf('src="app.js"'));
});
test('cabinet comparison export uses constrained options',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/exportCabinetCompareCsvBtn/);
 assert.match(app,/epCabinetOptionCompareCsvV1\(comparison\)/);
 assert.match(app,/excludedIds:report.options.filter/);
});
test('all-capacities toggle preserves manual selection',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/cabinetOptionShowAllCapacitiesV1=e.target.checked/);
 assert.match(app,/cabinetOptionShowAllCapacitiesV1\|\|o.capacityModules===cabinetCapacitySelectedTotalV1/);
});

test('DIN option preview script is loaded before app',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.ok(html.indexOf('src="cabinet-option-preview-v1.js"')<html.indexOf('src="app.js"'));
});
test('option preview has an accessible live region',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.match(html,/id="cabinetOptionPreview" aria-live="polite"/);
});
test('option preview renders movement counts without applying',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/epCabinetOptionPreviewV1\(state,previewOption,catalogDevice\)/);
 assert.match(app,/изменят позицию/);
 assert.match(app,/перейдут на другую DIN-рейку/);
});
test('option preview has separate action from apply',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/data-preview-cabinet-option/);
 assert.match(app,/cabinetOptionPreviewIdV1=preview.dataset.previewCabinetOption/);
 assert.match(app,/data-apply-cabinet-option/);
});
test('option preview shows each changed apparatus via textContent',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/li.textContent=row.deviceId/);
});
test('option preview updates the existing DIN space diagram',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/shown.find\(o=>o.id===cabinetOptionPreviewIdV1\)/);
});

test('DIN SVG and CSV modules load before app',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 for(const name of ['cabinet-option-din-svg-v1.js','cabinet-option-preview-csv-v1.js'])
  assert.ok(html.indexOf('src="'+name+'"')<html.indexOf('src="app.js"'));
});
test('DIN preview renders SVG apparatus diagram',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/epCabinetOptionDinSvgV1\(preview\)/);
 assert.match(app,/ep-cabinet-din-visual/);
});
test('DIN preview export regenerates against current project',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/Скачать перемещения DIN CSV/);
 assert.match(app,/epCabinetOptionPreviewCsvV1\(epCabinetOptionPreviewV1\(state,latest,catalogDevice\)\)/);
 assert.match(app,/_din_positions_/);
});

test('apply option uses DIN preview gate when current layout is valid',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const body=app.slice(app.indexOf('function applyCabinetCapacityOptionV1('),app.indexOf('function renderBoardConnectionAdvisoryV1('));
 assert.match(body,/epCabinetOptionPreviewV1\(state,option,catalogDevice\)/);
 assert.match(body,/if\(current.status!=='BLOCKED'\)/);
 assert.ok(body.indexOf('epCabinetOptionPreviewV1(state,option')<body.indexOf('checkpoint();'));
});
test('overfilled existing cabinet may still be enlarged',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const body=app.slice(app.indexOf('function applyCabinetCapacityOptionV1('),app.indexOf('function renderBoardConnectionAdvisoryV1('));
 assert.match(body,/An overfilled current enclosure must still be allowed to grow/);
});

test('DIN SVG export regenerates from the current option and project',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/Скачать эскиз DIN SVG/);
 assert.match(app,/epCabinetOptionDinSvgV1\(currentPreview\)/);
 assert.match(app,/_din_preview_/);
 assert.match(app,/image\/svg\+xml;charset=utf-8/);
});

test('cabinet impact evaluator loads before application',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.ok(html.indexOf('src="cabinet-option-impact-v1.js"')<html.indexOf('src="app.js"'));
});
test('cabinet selection includes minimum-movement preference',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/\['stability','Минимум перестановок'\]/);
 assert.match(app,/epCabinetOptionImpactV1\(state,report,catalogDevice/);
});
test('cabinet selection displays actual movement count',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/impact\?\.rows.find\(r=>r.id===o.id\)\?\.moved/);
});
test('cabinet comparison export includes impact-aware ranking',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/impactRows:impact\?\.rows\|\|\[\]/);
});

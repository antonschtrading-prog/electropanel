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

test('cross rail optimizer loads before app and has explicit control',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.ok(html.indexOf('src="cabinet-cross-rail-optimize-v1.js"')<html.indexOf('src="app.js"'));
 assert.match(html,/id="cabinetCrossRailOptimizeBtn"/);
});
test('cross rail optimizer requires confirmation and history checkpoint',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const i=app.indexOf("$('cabinetCrossRailOptimizeBtn')?.addEventListener");
 assert.ok(i>0);
 const block=app.slice(i,app.indexOf("$('cabinetGroupReflowBtn')?.addEventListener",i));
 assert.match(block,/epCabinetCrossRailOptimizeV1\(state,catalogDevice,\{strategy:selected.strategy\}\)/);
 assert.match(block,/confirm\(/);
 assert.match(block,/checkpoint\(\)/);
 assert.match(block,/state.manualLayoutV1=fresh.project.manualLayoutV1/);
});
test('cross rail optimization does not change electrical links in UI',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const i=app.indexOf("$('cabinetCrossRailOptimizeBtn')?.addEventListener");
 const block=app.slice(i,app.indexOf("$('cabinetGroupReflowBtn')?.addEventListener",i));
 assert.doesNotMatch(block,/state.protectionLinks\s*=|state.deviceSupplyV1\s*=/);
});

test('cross rail preview adapter loads before app',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.ok(html.indexOf('src="cabinet-reflow-preview-v1.js"')<html.indexOf('src="app.js"'));
 assert.match(html,/id="cabinetCrossRailPreview" aria-live="polite"/);
});
test('cross rail preview uses existing nominal DIN renderer',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/epCabinetReflowPreviewV1\(state,proposal,catalogDevice\)/);
 assert.match(app,/epCabinetOptionDinSvgV1\(preview\)/);
 assert.match(app,/epCabinetOptionPreviewCsvV1\(preview\)/);
});
test('cross rail preview keeps apply separate from proposal generation',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const start=app.indexOf("$('cabinetCrossRailOptimizeBtn')?.addEventListener");
 const end=app.indexOf("$('cabinetGroupReflowBtn')?.addEventListener",start);
 const block=app.slice(start,end);
 assert.match(block,/Применить предложенную компоновку/);
 assert.match(block,/cabinetCrossRailFingerprintV1\(\)!==fingerprint/);
 assert.match(block,/const fresh=epCabinetCrossRailOptimizeV1\(state,catalogDevice,\{strategy:selected.strategy\}\)/);
 assert.match(block,/confirm\(/);
 assert.match(block,/checkpoint\(\)/);
 assert.ok(block.indexOf('checkpoint();')>block.indexOf("apply.addEventListener('click'"));
});
test('cross rail preview offers independent CSV and SVG downloads',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/Скачать перемещения CSV/);
 assert.match(app,/Скачать эскиз SVG/);
 assert.match(app,/_cross_rail_preview.csv/);
 assert.match(app,/_cross_rail_preview.svg/);
});
test('cross rail proposal clears after successful apply',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/panel.replaceChildren\(\);cabinetCrossRailPreviewSnapshotV1=null;/);
});

test('before and after SVG adapter loads before app',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.ok(html.indexOf('src="cabinet-before-after-svg-v1.js"')<html.indexOf('src="app.js"'));
});
test('cross rail preview renders current and proposed rails separately',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/epCabinetBeforeAfterSvgV1\(preview\)/);
 assert.match(app,/\['Сейчас',pair.before\]/);
 assert.match(app,/\['Предлагается',pair.after\]/);
 assert.match(app,/ep-cabinet-before-after/);
});
test('cross rail preview invalidates on any project mutation',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/const cabinetCrossRailFingerprintV1=\(\)=>JSON.stringify\(state\)/);
});

test('multi-alternative selector is populated from verified proposals',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.ok(html.indexOf('src="cabinet-reflow-alternatives-v1.js"')<html.indexOf('src="app.js"'));
 assert.match(app,/epCabinetReflowAlternativesV1\(state,catalogDevice\)/);
 assert.match(app,/select.setAttribute\('aria-label','Вариант компоновки DIN'\)/);
 assert.match(app,/select.addEventListener\('change',renderVariant\)/);
 assert.match(app,/strategy:selected.strategy/);
});

test('apparatus geometry audit scripts load before alternatives and app',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const geo=html.indexOf('src="cabinet-apparatus-geometry-v1.js"');
 const csv=html.indexOf('src="cabinet-apparatus-geometry-csv-v1.js"');
 const alternatives=html.indexOf('src="cabinet-reflow-alternatives-v1.js"');
 assert.ok(geo>=0&&csv>geo&&alternatives>csv&&html.indexOf('src="app.js"')>alternatives);
});
test('selected DIN proposal reports known and unknown apparatus dimensions',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/selected.geometry.summary.knownDimensions/);
 assert.match(app,/selected.geometry.summary.missingDimensions/);
 assert.match(app,/epCabinetApparatusGeometryCsvV1\(selected.geometry\)/);
 assert.match(app,/_apparatus_dimensions.csv/);
});
test('dimension export invalidates on project changes',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const start=app.indexOf("dimensionExport.addEventListener('click'");
 const end=app.indexOf("variantPanel.appendChild(dimensionExport)",start);
 const block=app.slice(start,end);
 assert.match(block,/cabinetCrossRailFingerprintV1\(\)!==fingerprint/);
 assert.match(block,/notify\('Проект изменён/);
});

test('DIN geometry schematic loads and renders within selected proposal',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.ok(html.indexOf('src="cabinet-apparatus-geometry-svg-v1.js"')<
  html.indexOf('src="app.js"'));
 assert.match(app,/epCabinetApparatusGeometrySvgV1\(selected.geometry\)/);
 assert.match(app,/diagram.innerHTML=svg/);
});

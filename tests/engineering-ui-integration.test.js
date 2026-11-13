'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const scripts=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(x=>x[1]);
test('all referenced local scripts exist',()=>{for(const s of scripts)assert.ok(fs.existsSync(path.join(root,s)),s);});
test('diagnostic dependencies load before app',()=>{
 const names=['endpoint-bridge-v1.js','terminal-path-v2.js','topology-batch-audit-v1.js',
 'engineering-gate-v1.js','engineering-diagnostics-ui-v1.js','app.js'];
 for(let i=1;i<names.length;i++)assert.ok(scripts.indexOf(names[i-1])<scripts.indexOf(names[i]),names[i]);
});
test('board has read-only diagnostics container',()=>{
 assert.match(html,/id="engineeringDiagnostics"/);
 assert.match(html,/id="exportEngineeringGateBtn"/);
});
test('app refreshes diagnostics in common render',()=>{
 assert.match(app,/function render\(\)[\s\S]*?renderEngineeringDiagnosticsV1\(\)/);
});
test('app exports diagnostics as DRAFT JSON',()=>{
 assert.match(app,/_engineering_diagnostics_DRAFT\.json/);
 assert.match(app,/\$\('exportEngineeringGateBtn'\)\.addEventListener\('click',exportEngineeringGateV1\)/);
});
test('diagnostic module never grants engineering approval',()=>{
 const gate=fs.readFileSync(path.join(root,'engineering-gate-v1.js'),'utf8');
 assert.match(gate,/engineeringApproved:false,ready_for_installation:false/);
});

test('draft DIN plan preview is loaded and refreshed',()=>{
 assert.ok(scripts.indexOf('draft-board-plan-v1.js')<scripts.indexOf('draft-board-preview-v1.js'));
 assert.ok(scripts.indexOf('draft-board-preview-v1.js')<scripts.indexOf('app.js'));
 assert.match(html,/id="draftBoardPreview"/);
 assert.match(app,/epDraftBoardPreviewV1\(state,catalogDevice,selectedLine\)/);
});

test('circuit dossier and CSV are integrated in live UI',()=>{
 assert.ok(scripts.indexOf('draft-board-plan-v1.js')<scripts.indexOf('circuit-dossier-v1.js'));
 assert.ok(scripts.indexOf('circuit-dossier-v1.js')<scripts.indexOf('app.js'));
 assert.match(html,/id="circuitDossier"/);
 assert.match(html,/id="exportCircuitDossierCsvBtn"/);
 assert.match(app,/epCircuitWorkspaceV1\(state,catalogDevice,/);
 assert.match(app,/_circuit_dossier_DRAFT\.csv/);
});

test('export handlers bind directly to visible panel buttons',()=>{
 assert.match(app,/\$\('exportCircuitDossierCsvBtn'\)\.addEventListener\('click'/);
 assert.doesNotMatch(app,/if\(e\.target\.id==='exportCircuitDossierCsvBtn'\)/);
});

test('dossier JSON export is visible and connected',()=>{
 assert.match(html,/id="exportCircuitDossierJsonBtn"/);
 assert.match(app,/\$\('exportCircuitDossierJsonBtn'\)\.addEventListener\('click'/);
 assert.match(app,/_circuit_dossier_DRAFT\.json/);
});

test('searchable circuit workspace is live and loaded after dossier',()=>{
 assert.ok(scripts.indexOf('circuit-dossier-v1.js')<scripts.indexOf('circuit-workspace-v1.js'));
 assert.ok(scripts.indexOf('circuit-workspace-v1.js')<scripts.indexOf('app.js'));
 for(const id of ['circuitWorkspaceQuery','circuitWorkspaceMode','circuitDossier'])assert.ok(html.includes('id="'+id+'"'));
 assert.match(app,/function renderCircuitWorkspaceV1\(\)/);
 assert.match(app,/\$\('circuitWorkspaceQuery'\)\.addEventListener\('input',renderCircuitWorkspaceV1\)/);
 assert.match(app,/\$\('circuitWorkspaceMode'\)\.addEventListener\('change',renderCircuitWorkspaceV1\)/);
});

test('selection connects circuit workspace, board and load editor',()=>{
 assert.match(html,/id="circuitFocusLabel"/);
 assert.match(app,/\$\('circuitDossier'\)\.addEventListener\('click'/);
 assert.match(app,/data-focus-circuit/);
 assert.match(app,/data-open-load-circuit/);
 assert.match(app,/selectedLine=id/);
 assert.match(app,/renderBoard\(\);renderCircuitGraph\(\);renderCircuitWorkspaceV1\(\)/);
 assert.match(app,/row\.scrollIntoView/);
});

test('DIN jump navigates to selected apparatus without changing project',()=>{
 assert.match(app,/data-open-board-circuit/);
 assert.match(app,/switchView\('board'\)/);
 assert.match(app,/device\.scrollIntoView/);
});

test('manufacturer BOM loads before app and refreshes in engineering panel',()=>{
 assert.ok(scripts.indexOf('draft-bom-v1.js')>scripts.indexOf('circuit-workspace-v1.js'));
 assert.ok(scripts.indexOf('draft-bom-v1.js')<scripts.indexOf('app.js'));
 assert.match(html,/id="draftBomPanel"/);
 assert.match(app,/epDraftBomHtmlV1\(epDraftBomV1\(state,catalogDevice\)\)/);
});
test('BOM exports are connected to their visible controls',()=>{
 for(const kind of ['Csv','Json'])assert.ok(html.includes('id="exportDraftBom'+kind+'Btn"'));
 assert.match(app,/\$\('exportDraftBomCsvBtn'\)\.addEventListener\('click'/);
 assert.match(app,/\$\('exportDraftBomJsonBtn'\)\.addEventListener\('click'/);
 assert.match(app,/_equipment_BOM_DRAFT\.csv/);
 assert.match(app,/_equipment_BOM_DRAFT\.json/);
});

test('consolidated engineering bundle loads after BOM and before app',()=>{
 assert.ok(scripts.indexOf('engineering-bundle-v1.js')>scripts.indexOf('draft-bom-v1.js'));
 assert.ok(scripts.indexOf('engineering-bundle-v1.js')<scripts.indexOf('app.js'));
 assert.match(html,/id="exportEngineeringBundleBtn"/);
 assert.match(app,/\$\('exportEngineeringBundleBtn'\)\.addEventListener\('click'/);
 assert.match(app,/_engineering_bundle_DRAFT\.json/);
});

test('protection workbench loads after shortlist and before app',()=>{
 assert.ok(scripts.indexOf('protection-workbench-v1.js')>scripts.indexOf('protective-device-shortlist-v1.js'));
 assert.ok(scripts.indexOf('protection-workbench-v1.js')<scripts.indexOf('app.js'));
 assert.match(html,/id="protectionWorkbench"/);
 assert.match(app,/epProtectionWorkbenchHtmlV1\(epProtectionWorkbenchV1\(state,catalogDevice,catalog,selectedLine\)\)/);
});
test('protection selection is validated, undoable and autosaved',()=>{
 assert.match(app,/\$\('protectionWorkbench'\)\.addEventListener\('click'/);
 assert.match(app,/data-protection-sku/);
 assert.match(app,/x\.status!=='REJECTED'/);
 assert.match(app,/applyCatalogueSku\(draft,id,sku\)/);
 assert.match(app,/checkpoint\(\);state=draft;selectedLine=id;changed\(\)/);
 assert.doesNotMatch(app,/transact\(\(\)=>/);
});
test('visual DIN module grid is present and not labelled as manufacturer verified',()=>{
 const source=fs.readFileSync(path.join(root,'draft-board-preview-v1.js'),'utf8');
 assert.match(source,/ep-din-module-grid/);
 assert.match(source,/grid-column:span/);
 assert.match(source,/монтаж не подтверждён/);
});

test('non-destructive DIN layout alternative is rendered and exported',()=>{
 assert.ok(scripts.indexOf('draft-layout-alternatives-v1.js')>scripts.indexOf('draft-board-preview-v1.js'));
 assert.ok(scripts.indexOf('draft-layout-alternatives-v1.js')<scripts.indexOf('app.js'));
 assert.match(html,/id="draftLayoutAlternatives"/);
 assert.match(app,/epDraftLayoutAlternativesHtmlV1\(epDraftLayoutAlternativesV1\(state,catalogDevice\)\)/);
 const bundle=fs.readFileSync(path.join(root,'engineering-bundle-v1.js'),'utf8');
 assert.match(bundle,/layoutAlternatives/);
 assert.match(bundle,/protection/);
});

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
 assert.match(app,/epDraftBoardPreviewV1\(state,catalogDevice\)/);
});

test('circuit dossier and CSV are integrated in live UI',()=>{
 assert.ok(scripts.indexOf('draft-board-plan-v1.js')<scripts.indexOf('circuit-dossier-v1.js'));
 assert.ok(scripts.indexOf('circuit-dossier-v1.js')<scripts.indexOf('app.js'));
 assert.match(html,/id="circuitDossier"/);
 assert.match(html,/id="exportCircuitDossierCsvBtn"/);
 assert.match(app,/epCircuitDossierPanelV1\(state,catalogDevice\)/);
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

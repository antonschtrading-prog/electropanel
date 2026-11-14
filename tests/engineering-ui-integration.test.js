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

test('manual Ib Iz Ik declarations use validation and history instead of silent calculation',()=>{
 assert.ok(scripts.indexOf('protection-inputs-v1.js')>scripts.indexOf('protection-workbench-v1.js'));
 assert.ok(scripts.indexOf('protection-inputs-v1.js')<scripts.indexOf('app.js'));
 assert.match(app,/\$\('protectionWorkbench'\)\.addEventListener\('submit'/);
 assert.match(app,/epProtectionInputsV1\(state,id,inputs\)/);
 assert.match(app,/checkpoint\(\);state=result.project;selectedLine=id;changed\(\)/);
});

test('protection CSV export uses current full project and is wired',()=>{
 assert.match(html,/id="exportProtectionCsvBtn"/);
 assert.match(app,/\$\('exportProtectionCsvBtn'\)\.addEventListener\('click'/);
 assert.match(app,/_protection_DRAFT\.csv/);
 assert.match(app,/epProtectionWorkbenchCsvV1\(report\)/);
});

test('cross-view audit is loaded before bundle and app',()=>{
 assert.ok(scripts.indexOf('cross-view-audit-v1.js')>=0);
 assert.ok(scripts.indexOf('cross-view-audit-ui-v1.js')>scripts.indexOf('cross-view-audit-v1.js'));
 assert.ok(scripts.indexOf('cross-view-audit-ui-v1.js')<scripts.indexOf('app.js'));
 assert.match(html,/id="crossViewAuditPanel"/);
 assert.match(app,/epCrossViewAuditHtmlV1\(bundle.sections.crossView,selectedLine\)/);
});
test('cross-view issue navigation and exports use current project',()=>{
 assert.match(app,/\$\('crossViewAuditPanel'\)\.addEventListener\('click'/);
 assert.match(app,/data-crossview-focus/);
 assert.match(app,/selectedLine=id;render\(\)/);
 for(const kind of ['Csv','Json'])assert.ok(html.includes('id="exportCrossView'+kind+'Btn"'));
 assert.match(app,/_crossview_DRAFT\.csv/);
 assert.match(app,/_crossview_DRAFT\.json/);
 const bundle=fs.readFileSync(path.join(root,'engineering-bundle-v1.js'),'utf8');
 assert.match(bundle,/epCrossViewAuditV1\(project,protection,board,bom\)/);
});

test('DIN apparatus buttons synchronize selected circuit',()=>{
 const source=fs.readFileSync(path.join(root,'draft-board-preview-v1.js'),'utf8');
 assert.match(source,/data-din-focus/);
 assert.match(app,/\$\('draftBoardPreview'\)\.addEventListener\('click'/);
 assert.match(app,/selectedLine=id;render\(\)/);
});

test('unified issue register loads before bundle and is accessible in board view',()=>{
 assert.ok(scripts.indexOf('engineering-issue-register-v1.js')>=0);
 assert.ok(scripts.indexOf('engineering-issue-register-v1.js')<scripts.indexOf('engineering-bundle-v1.js'));
 assert.match(html,/id="engineeringIssueRegister"/);
 assert.match(html,/id="exportIssueRegisterCsvBtn"/);
 assert.match(app,/epEngineeringIssueRegisterHtmlV1\(bundle.sections.issueRegister,selectedLine\)/);
 assert.match(app,/\$\('engineeringIssueRegister'\)\.addEventListener\('click'/);
 assert.match(app,/_issues_DRAFT\.csv/);
});
test('standalone printable HTML export is connected to full engineering bundle',()=>{
 assert.ok(scripts.indexOf('engineering-print-v1.js')>scripts.indexOf('engineering-bundle-v1.js'));
 assert.ok(scripts.indexOf('engineering-print-v1.js')<scripts.indexOf('app.js'));
 assert.match(html,/id="exportEngineeringPrintBtn"/);
 assert.match(app,/epEngineeringPrintV1\(report\)/);
 assert.match(app,/_engineering_DRAFT\.html/);
});
test('engineering bundle is computed once for the two read-only audit panels',()=>{
 const start=app.indexOf("const crossView=$('crossViewAuditPanel')");
 const end=app.indexOf("const protection=$('protectionWorkbench')",start);
 assert.ok(start>0&&end>start);
 const fragment=app.slice(start,end);
 assert.equal((fragment.match(/epEngineeringBundleV1\(state,catalogDevice\)/g)||[]).length,1);
});

test('Russian issue guidance is loaded before register and app',()=>{
 assert.ok(scripts.indexOf('engineering-issue-guidance-v1.js')>=0);
 assert.ok(scripts.indexOf('engineering-issue-guidance-v1.js')<scripts.indexOf('engineering-issue-register-v1.js'));
 const source=fs.readFileSync(path.join(root,'engineering-issue-register-v1.js'),'utf8');
 assert.match(source,/epIssueGuidanceV1\(x.code\)/);
});

test('per-circuit terminal trace loads before engineering bundle and app',()=>{
 assert.ok(scripts.indexOf('circuit-wiring-trace-v1.js')>scripts.indexOf('endpoint-bridge-v1.js'));
 assert.ok(scripts.indexOf('circuit-wiring-trace-ui-v1.js')>scripts.indexOf('circuit-wiring-trace-v1.js'));
 assert.ok(scripts.indexOf('circuit-wiring-trace-v1.js')<scripts.indexOf('engineering-bundle-v1.js'));
 assert.match(html,/id="circuitWiringTracePanel"/);
 assert.match(html,/id="exportWiringTraceCsvBtn"/);
 assert.match(app,/epCircuitWiringTraceHtmlV1\(epCircuitWiringTraceV1\(state\),selectedLine\)/);
 assert.match(app,/_wiring_trace_DRAFT\.csv/);
});
test('wiring trace is included in full engineering bundle and issue register',()=>{
 const bundle=fs.readFileSync(path.join(root,'engineering-bundle-v1.js'),'utf8');
 const issues=fs.readFileSync(path.join(root,'engineering-issue-register-v1.js'),'utf8');
 const printable=fs.readFileSync(path.join(root,'engineering-print-v1.js'),'utf8');
 assert.match(bundle,/wiringTrace/);assert.match(issues,/wiringTrace/);
 assert.match(printable,/sections.wiringTrace/);
});

test('neutral segregation panel is wired to current project and selected circuit',()=>{
 assert.ok(scripts.indexOf('neutral-segregation-v1.js')>=0);
 assert.ok(scripts.indexOf('neutral-segregation-ui-v1.js')>scripts.indexOf('neutral-segregation-v1.js'));
 assert.ok(scripts.indexOf('neutral-segregation-v1.js')<scripts.indexOf('engineering-bundle-v1.js'));
 assert.match(html,/id="neutralSegregationPanel"/);
 assert.match(app,/epNeutralSegregationHtmlV1\(epNeutralSegregationV1\(state\),selectedLine\)/);
 assert.match(app,/\$\('neutralSegregationPanel'\)\.addEventListener\('click'/);
 const bundle=fs.readFileSync(path.join(root,'engineering-bundle-v1.js'),'utf8');
 const print=fs.readFileSync(path.join(root,'engineering-print-v1.js'),'utf8');
 assert.match(bundle,/neutralSegregation/);assert.match(print,/sections.neutralSegregation/);
});

test('single-line draft SVG is interactive, exportable and included in gate',()=>{
 assert.ok(scripts.indexOf('single-line-draft-v1.js')>=0);
 assert.ok(scripts.indexOf('single-line-svg-v1.js')>scripts.indexOf('single-line-draft-v1.js'));
 assert.ok(scripts.indexOf('single-line-draft-v1.js')<scripts.indexOf('engineering-bundle-v1.js'));
 assert.match(html,/id="singleLineDraftPanel"/);assert.match(html,/id="exportSingleLineSvgBtn"/);
 assert.match(app,/epSingleLineSvgV1\(epSingleLineDraftV1\(state,catalogDevice\),selectedLine\)/);
 assert.match(app,/_single_line_DRAFT\.svg/);
 const gate=fs.readFileSync(path.join(root,'engineering-gate-v1.js'),'utf8');
 assert.match(gate,/single_line/);
});

test('selected circuit conductor SVG is wired to terminal trace and export',()=>{
 assert.ok(scripts.indexOf('conductor-trace-svg-v1.js')>=0);
 assert.ok(scripts.indexOf('conductor-trace-svg-v1.js')<scripts.indexOf('app.js'));
 assert.match(html,/id="conductorTraceSvgPanel"/);
 assert.match(html,/id="exportCircuitTraceSvgBtn"/);
 assert.match(app,/epConductorTraceSvgV1\(epCircuitWiringTraceV1\(state\),selectedLine\)/);
 assert.match(app,/_conductors_DRAFT\.svg/);
});

test('new engineering panels and SVG export controls have unique static IDs',()=>{
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 const expected=['singleLineDraftPanel','conductorTraceSvgPanel','circuitWiringTracePanel',
  'neutralSegregationPanel','exportSingleLineSvgBtn','exportCircuitTraceSvgBtn'];
 for(const id of expected)assert.equal(ids.filter(x=>x===id).length,1,id);
 assert.equal(ids.filter(x=>x==='exportConductorSvgBtn').length,0);
});

test('downstream N bus isolation is visible in board and engineering bundle',()=>{
 assert.ok(scripts.indexOf('neutral-wire-isolation-v1.js')>scripts.indexOf('terminal-path-v2.js'));
 assert.ok(scripts.indexOf('neutral-wire-isolation-ui-v1.js')>scripts.indexOf('neutral-wire-isolation-v1.js'));
 assert.ok(scripts.indexOf('neutral-wire-isolation-v1.js')<scripts.indexOf('engineering-bundle-v1.js'));
 assert.match(html,/id="neutralWireIsolationPanel"/);
 assert.match(app,/epNeutralWireIsolationHtmlV1\(epNeutralWireIsolationV1\(state\)\)/);
 const bundle=fs.readFileSync(path.join(root,'engineering-bundle-v1.js'),'utf8');
 const gate=fs.readFileSync(path.join(root,'engineering-gate-v1.js'),'utf8');
 assert.match(bundle,/neutralWireIsolation/);assert.match(gate,/neutral_wire_isolation/);
});

test('design evidence and change impact are wired into current engineering editor',()=>{
 assert.ok(scripts.indexOf('design-change-impact-v1.js')>=0);
 assert.ok(scripts.indexOf('design-evidence-gates-v1.js')>scripts.indexOf('design-change-impact-v1.js'));
 assert.ok(scripts.indexOf('design-evidence-ui-v1.js')>scripts.indexOf('design-evidence-gates-v1.js'));
 assert.ok(scripts.indexOf('design-evidence-gates-v1.js')<scripts.indexOf('engineering-bundle-v1.js'));
 for(const id of ['designEvidencePanel','designChangeImpactPanel'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(app,/epDesignChangeImpactV1\(lastDesignSnapshot,state\)/);
 assert.match(app,/epInvalidateDesignEvidenceV1\(state,lastDesignImpact\)/);
 assert.match(app,/epDesignEvidenceHtmlV1\(assessDesignEvidence\(state\)\)/);
 const gate=fs.readFileSync(path.join(root,'engineering-gate-v1.js'),'utf8');
 const bundle=fs.readFileSync(path.join(root,'engineering-bundle-v1.js'),'utf8');
 const print=fs.readFileSync(path.join(root,'engineering-print-v1.js'),'utf8');
 assert.match(gate,/design_evidence/);assert.match(bundle,/designEvidence/);
 assert.match(print,/Доказательная база проектных решений/);
});

test('design evidence editor saves source and method with undo and autosave',()=>{
 assert.match(app,/\$\('designEvidencePanel'\)\.addEventListener\('click'/);
 assert.match(app,/data-save-evidence/);
 assert.match(app,/status==='verified'&&\(!source\|\|!method\)/);
 assert.match(app,/state\.evidence\[area\]=\{status,source,method,stale:false\}/);
 assert.match(app,/checkpoint\(\);[\s\S]*?state\.evidence\[area\]/);
});

test('load-current calculation wizard integrates with protection and dossier',()=>{
 assert.ok(scripts.indexOf('load-current-v1.js')<scripts.indexOf('app.js'));
 assert.ok(scripts.indexOf('load-current-ui-v1.js')<scripts.indexOf('app.js'));
 assert.match(html,/id="loadCurrentPanel"/);
 assert.match(app,/epLoadCurrentHtmlV1\(state,selectedLine\)/);
 assert.match(app,/epApplyLoadCurrentV1\(state,lineId/);
 assert.match(app,/\$\('loadCurrentPanel'\)\.addEventListener\('submit'/);
 assert.match(fs.readFileSync(path.join(root,'engineering-bundle-v1.js'),'utf8'),/loadCurrent/);
 assert.match(fs.readFileSync(path.join(root,'engineering-print-v1.js'),'utf8'),/Расчёт тока нагрузки/);
});

test('cable reference editor and issue register are connected',()=>{
 assert.ok(scripts.indexOf('cable-reference-v1.js')<scripts.indexOf('app.js'));
 assert.ok(scripts.indexOf('cable-reference-ui-v1.js')<scripts.indexOf('app.js'));
 assert.match(html,/id="cableReferencePanel"/);
 assert.match(app,/epCableReferenceHtmlV1\(state,selectedLine,catalogDevice\)/);
 assert.match(app,/epApplyCableReferenceInputV1\(state,lineId/);
 assert.match(fs.readFileSync(path.join(root,'engineering-gate-v1.js'),'utf8'),/cable_reference/);
 assert.match(fs.readFileSync(path.join(root,'engineering-bundle-v1.js'),'utf8'),/cableReference/);
 assert.match(fs.readFileSync(path.join(root,'engineering-print-v1.js'),'utf8'),/Справочные сечения проводников/);
});

test('integrated design review, voltage drop and export are wired to editor and reports',()=>{
 assert.ok(scripts.indexOf('voltage-drop-design-v1.js')<scripts.indexOf('circuit-design-review-v1.js'));
 assert.ok(scripts.indexOf('circuit-design-review-v1.js')<scripts.indexOf('app.js'));
 assert.ok(scripts.indexOf('circuit-design-review-ui-v1.js')<scripts.indexOf('app.js'));
 assert.match(html,/id="circuitDesignReviewPanel"/);
 assert.match(app,/epCircuitDesignReviewHtmlV1\(state,catalogDevice,selectedLine\)/);
 assert.match(app,/epApplyVoltageDropInputV1\(state,/);
 assert.match(app,/epCircuitDesignReviewCsvV1\(report\)/);
 assert.match(fs.readFileSync(path.join(root,'engineering-bundle-v1.js'),'utf8'),/designReview/);
 assert.match(fs.readFileSync(path.join(root,'engineering-print-v1.js'),'utf8'),/Матрица проектных расчётов/);
});

test('prioritized work queue is integrated with circuit selection and printable dossier',()=>{
 assert.ok(scripts.indexOf('design-work-queue-v1.js')<scripts.indexOf('app.js'));
 assert.match(html,/id="designWorkQueuePanel"/);
 assert.match(app,/epDesignWorkQueueV1\(state,catalogDevice\)/);
 assert.match(app,/\$\('designWorkQueuePanel'\)\.addEventListener\('click'/);
 assert.match(fs.readFileSync(path.join(root,'engineering-bundle-v1.js'),'utf8'),/designWorkQueue/);
 assert.match(fs.readFileSync(path.join(root,'engineering-print-v1.js'),'utf8'),/Очередь инженерных задач/);
});

test('manual cable section and current-provenance invalidation are connected',()=>{
 assert.match(app,/epApplyCableSectionV1\(state,lineId,section\)/);
 assert.match(app,/IB_DIFFERS_FROM_CALCULATED_CURRENT/);
 assert.match(fs.readFileSync(path.join(root,'cable-reference-ui-v1.js'),'utf8'),/data-cable-section-form/);
});

test('project catalogue, engineering evidence and vector facade are loaded in application',()=>{
 for(const name of ['project-catalog-workbench-v1.js','catalog-front-svg-v1.js','integrated-evidence-review-v1.js','integrated-evidence-ui-v1.js'])
  assert.ok(scripts.includes(name),name);
 assert.ok(scripts.indexOf('project-catalog-workbench-v1.js')<scripts.indexOf('app.js'));
 assert.ok(scripts.indexOf('catalog-front-svg-v1.js')<scripts.indexOf('draft-board-preview-v1.js'));
 for(const id of ['projectCatalogWorkbench','integratedEvidencePanel'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(app,/renderProjectCatalogWorkbenchV1\(\)/);
 assert.match(app,/epIntegratedEvidenceReview\(state\)/);
});
test('catalogue imports use shared engineering validation and remain undoable',()=>{
 assert.match(app,/epImportProjectArticlesV2\(state,records/);
 assert.match(app,/if\(!result\.project\)throw Error\('Импорт отклонён:/);
 assert.match(app,/checkpoint\(\);state=result\.project;changed\(\)/);
});

test('catalogue audit uses the supplied project and preserves review dependencies',()=>{
 assert.match(app,/const dev=projectCatalogEntries\(project\)\.find/);
 const catalog=fs.readFileSync(path.join(root,'project-catalog-workbench-v1.js'),'utf8');
 assert.match(catalog,/const pending=new Set\(/);
 assert.match(catalog,/for\(const field of reviewFields\)if\(line\[field\]\)pending\.add\(field\)/);
 assert.match(catalog,/line\.calculationReview=\{required:true,reason:'PROJECT_ARTICLE_UPDATED',pending:/);
});

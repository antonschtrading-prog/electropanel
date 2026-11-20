'use strict';
// Release 1.0 export surface matrix. Each entry point must guard linked
// deliverables while diagnostic exports remain available for investigating errors.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const direct=[
 ['single line SVG',"$('exportSingleLineSvgBtn').addEventListener", '_single_line_DRAFT.svg'],
 ['BOM CSV',"$('exportDraftBomCsvBtn').addEventListener",'_equipment_BOM_DRAFT.csv'],
 ['BOM JSON',"$('exportDraftBomJsonBtn').addEventListener",'_equipment_BOM_DRAFT.json'],
 ['wiring trace SVG',"$('exportCircuitTraceSvgBtn').addEventListener",'_conductors_DRAFT.svg'],
 ['wiring trace CSV',"$('exportWiringTraceCsvBtn').addEventListener",'_wiring_trace_DRAFT.csv'],
 ['circuit dossier JSON',"$('exportCircuitDossierJsonBtn').addEventListener",'_circuit_dossier_DRAFT.json'],
 ['circuit dossier CSV',"$('exportCircuitDossierCsvBtn').addEventListener",'_circuit_dossier_DRAFT.csv'],
 ['protection CSV',"$('exportProtectionCsvBtn').addEventListener",'_protection_DRAFT.csv']
];
function body(marker){
 const start=app.indexOf(marker);
 assert.ok(start>=0,'missing handler '+marker);
 const end=app.indexOf('\n});',start);
 assert.ok(end>start,'missing handler end '+marker);
 return app.slice(start,end+4);
}
for(const [name,marker,filename] of direct){
 test('export surface: '+name+' requires shared guard',()=>{
  const code=body(marker);
  assert.ok(code.includes('if(!epRequireDraftDocumentExport())return;'),name);
  assert.ok(code.includes(filename),name);
 });
 test('export surface: '+name+' checks guard before download',()=>{
  const code=body(marker);
  assert.ok(code.indexOf('if(!epRequireDraftDocumentExport())return;')<code.indexOf('download('),name);
 });
 test('export surface: '+name+' has only one shared gate call',()=>{
  const code=body(marker);
  assert.equal(code.split('epRequireDraftDocumentExport()').length-1,1,name);
 });
 test('export surface: '+name+' does not silently mark approved',()=>{
  const code=body(marker);
  assert.ok(!code.includes('engineeringApproved:true'),name);
  assert.ok(!code.includes('ready_for_installation:true'),name);
 });
 test('export surface: '+name+' uses actual state and current project',()=>{
  const code=body(marker);
  assert.ok(code.includes('state'),name);
 });
}
for(const [name,needle,filename] of [
 ['cabinet drawing',"if(e.target.id==='cabinetExportSvgBtn'){",'-cabinet-plan-DRAFT.svg'],
 ['design review',"if(e.target.closest('#exportDesignReviewCsvBtn')){",'_design_review.csv'],
 ['workflow preview',"if(exportCsv){",'_workflow_DRAFT.csv']
]){
 test('delegated export: '+name+' checks guard',()=>{
  const start=app.indexOf(needle);assert.ok(start>=0,name);
  const code=app.slice(start,start+800);
  assert.ok(code.includes('if(!epRequireDraftDocumentExport())return;'),name);
  assert.ok(code.includes(filename),name);
 });
 test('delegated export: '+name+' checks before download',()=>{
  const start=app.indexOf(needle);const code=app.slice(start,start+800);
  assert.ok(code.indexOf('epRequireDraftDocumentExport()')<code.indexOf('download('),name);
 });
 test('delegated export: '+name+' does not claim approval',()=>{
  const start=app.indexOf(needle);const code=app.slice(start,start+800);
  assert.ok(!code.includes('engineeringApproved:true'),name);
 });
}
for(const [name,marker,filename] of [
 ['engineering bundle',"$('exportEngineeringBundleBtn').addEventListener",'_engineering_bundle_DRAFT.json'],
 ['cross-view CSV',"$('exportCrossViewCsvBtn').addEventListener",'_crossview_DRAFT.csv'],
 ['cross-view JSON',"$('exportCrossViewJsonBtn').addEventListener",'_crossview_DRAFT.json'],
 ['issue register',"$('exportIssueRegisterCsvBtn').addEventListener",'_issues_DRAFT.csv']
]){
 test('diagnostics remain available: '+name,()=>{
  const code=body(marker);
  assert.ok(code.includes(filename),name);
  assert.ok(!code.includes('if(!epRequireDraftDocumentExport())return;'),name);
 });
}
test('gate fails closed when cross-view section is absent',()=>{
 const start=app.indexOf('function epDraftDocumentExportGate(){');
 const end=app.indexOf('\nfunction epRequireDraftDocumentExport()',start);
 assert.ok(start>=0&&end>start);
 const code=app.slice(start,end);
 assert.ok(code.includes('!cross||cross.status'));
});
test('gate preserves draft UNKNOWN state without claiming approval',()=>{
 const start=app.indexOf('function epDraftDocumentExportGate(){');
 const end=app.indexOf('\nfunction epRequireDraftDocumentExport()',start);
 const code=app.slice(start,end);
 assert.ok(!code.includes("cross.status!=='UNKNOWN'"));
 assert.ok(code.includes('return {allowed:true,bundle}'));
});
test('gate uses engineering bundle cross-view rather than duplicating SKU logic',()=>{
 const start=app.indexOf('function epDraftDocumentExportGate(){');
 const end=app.indexOf('\nfunction epRequireDraftDocumentExport()',start);
 const code=app.slice(start,end);
 assert.ok(code.includes('epEngineeringBundleV1(state,catalogDevice)'));
 assert.ok(code.includes('bundle?.sections?.crossView'));
});

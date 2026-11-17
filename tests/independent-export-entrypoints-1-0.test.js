'use strict';
// Independent source contract for the shipped browser download entry points.
// Characterization tests record current bypasses, not desired behavior.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const app=fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8');
const findHandler=(id,marker)=>{const start=app.indexOf(marker);assert.ok(start>=0,'handler exists: '+id);const end=app.indexOf("\n});",start);assert.ok(end>start,'handler terminator: '+id);return app.slice(start,end+4)};
const handlers=[
 ['single-line SVG',"$('exportSingleLineSvgBtn').addEventListener", '_single_line_DRAFT.svg'],
 ['BOM CSV',"$('exportDraftBomCsvBtn').addEventListener",'_equipment_BOM_DRAFT.csv'],
 ['BOM JSON',"$('exportDraftBomJsonBtn').addEventListener",'_equipment_BOM_DRAFT.json']
];
for(const [name,marker,filename] of handlers)test('source characterization: '+name+' requires shared cross-view gate before draft export',()=>{
 const body=findHandler(name,marker);
 assert.ok(body.includes('download('));
 assert.ok(body.includes(filename));
 assert.ok(body.includes('if(!epRequireDraftDocumentExport())return;'));
});
test('source contract: workflow CSV export requires shared gate',()=>{
 const start=app.indexOf("const exportCsv=e.target.closest('#workflowExportCsvBtn')");
 assert.ok(start>=0);
 const section=app.slice(start,start+1000);
 assert.ok(section.includes('epWorkflowPreviewV1('));
 assert.ok(section.includes('epWorkflowCsvV1(report)'));
 assert.ok(section.includes('if(!epRequireDraftDocumentExport())return;'));
});
test('source control: DIN placement CSV independently checks BLOCKED',()=>{
 const section=findHandler('DIN',"$('boardChecks').addEventListener('click',e=>{\n if(!e.target.closest('#boardPlacementCsvBtn'))return;");
 assert.ok(section.includes("result.status==='BLOCKED'"));
 assert.ok(section.includes('return;'));
 assert.ok(section.includes("download("));
});
test('source control: engineering bundle export includes full bundle rather than bypassing it',()=>{
 const section=findHandler('bundle',"$('exportEngineeringBundleBtn').addEventListener");
 assert.ok(section.includes('epEngineeringBundleV1(state,catalogDevice)'));
 assert.ok(section.includes('_engineering_bundle_DRAFT.json'));
});
test('source contract: no export filename is represented as an approved installation drawing',()=>{
 for(const [name,marker,filename] of handlers){
  const body=findHandler(name,marker);
  assert.ok(filename.includes('DRAFT'),name);
  assert.ok(body.includes(filename));
 }
});
test('source contract: schematic export checks shared cross-view gate',()=>{
 const body=findHandler('schematic',"$('exportSingleLineSvgBtn').addEventListener");
 assert.ok(body.includes('const report=epSingleLineDraftV1('));
 assert.ok(body.includes('if(!epRequireDraftDocumentExport())return;'));
});
test('source contract: BOM CSV export checks shared cross-view gate',()=>{
 const body=findHandler('BOM',"$('exportDraftBomCsvBtn').addEventListener");
 assert.ok(body.includes('epDraftBomV1(state,catalogDevice)'));
 assert.ok(body.includes('if(!epRequireDraftDocumentExport())return;'));
});
test('source contract: BOM JSON export checks shared cross-view gate',()=>{
 const body=findHandler('BOM',"$('exportDraftBomJsonBtn').addEventListener");
 assert.ok(body.includes('epDraftBomV1(state,catalogDevice)'));
 assert.ok(body.includes('if(!epRequireDraftDocumentExport())return;'));
});

test('shared export gate rejects blocked cross-view and missing audit',()=>{
 const start=app.indexOf('function epDraftDocumentExportGate(){');
 assert.ok(start>=0);
 const section=app.slice(start,app.indexOf('\nfunction epRequireDraftDocumentExport()',start));
 assert.ok(section.includes('epEngineeringBundleV1(state,catalogDevice)'));
 assert.ok(section.includes('bundle?.sections?.crossView'));
 assert.ok(section.includes("cross.status==='BLOCKED'"));
 assert.ok(section.includes("!cross||"));
});

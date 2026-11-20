'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../project-delivery-trace-v1.js'),'utf8');
const print=require('../engineering-print-v1.js').epEngineeringPrintV1;
const p=()=>({title:'Shop',railCount:1,railCapacity:12,
 lines:[{id:'C1',name:'Lighting',phase:'L1',modules:1,catalogSku:'CAT1'}],
 loads:[{id:'LD1',circuitId:'C1',powerKw:1}],branchDevices:[{id:'BR1',circuitId:'C1',modules:1}],sharedDevices:[]});
const mk=(changes=()=>{})=>{
 const context={EP_CATALOG:{CAT1:{sku:'MCB-1',maker:'Manufacturer',modules:1}},
 epProjectCatalogV1:(project,seed)=>({articles:seed,status:'UNKNOWN',issues:[]}),
 epDraftBoardPlanV1:()=>({status:'UNKNOWN',issues:[],placements:[{deviceId:'BR1',modules:1,article:'CAT1',railIndex:0,startModule:0}]}),
 epDraftBomV1:()=>({status:'UNKNOWN',issues:[],devices:[{kind:'branch',owner:'C1',sku:'CAT1'}]}),
 epSingleLineDraftV1:()=>({status:'UNKNOWN',issues:[],nodes:[{id:'CIRCUIT:C1',sku:'CAT1',phase:'L1'}]}),
 epWorkflowPreviewV1:(_project,_lookup,catalogue)=>({status:'DRAFT',issues:[],catalogueSeen:catalogue.map(x=>x.id),rows:[{lineId:'C1',phase:'L1',ibA:6}]}),
 };
 changes(context);vm.createContext(context);vm.runInContext(source,context);
 return project=>context.epProjectDeliveryTraceV1(project,()=>({sku:'MCB-1'}));
};
test('delivery trace forwards curated catalogue records into workflow preview',()=>{
 const report=mk()(p());
 assert.equal(report.sections.WORKFLOW.data.catalogueSeen.length,1);
 assert.equal(report.sections.WORKFLOW.data.catalogueSeen[0],'CAT1');
 assert.equal(report.rows[0].crossViewStatus,'LINKED_DRAFT');
 assert.equal(report.engineeringApproved,false);
});
test('trace merges custom project catalogue entries using existing helper',()=>{
 const out=mk(ctx=>{ctx.epProjectCatalogV1=(project,seed)=>({
  articles:{...seed,...Object.fromEntries(project.catalogArticles.map(x=>[x.id,x]))},
  status:'UNKNOWN'});});
 const project=p();project.catalogArticles=[{id:'CUSTOM2',sku:'NEW'}];
 const report=out(project);
 assert.equal(report.sections.WORKFLOW.data.catalogueSeen.length,2);
 assert.ok(report.sections.WORKFLOW.data.catalogueSeen.includes('CUSTOM2'));
});
test('catalogue provenance is never inferred from a generic fallback',()=>{
 const report=mk(ctx=>{delete ctx.epProjectCatalogV1;})(p());
 assert.equal(report.sections.WORKFLOW.data.catalogueSeen.length,0);
 assert.equal(report.engineeringApproved,false);
});
test('blocked project catalogue is not silently treated as valid',()=>{
 const report=mk(ctx=>{ctx.epProjectCatalogV1=(project,seed)=>({
  articles:seed,status:'BLOCKED'});})(p());
 assert.equal(report.status,'BLOCKED');
 assert.ok(report.issues.some(x=>x.code==='DELIVERY_PROJECT_CATALOGUE_INVALID'));
});
test('malformed catalogue result is blocked instead of inventing articles',()=>{
 const report=mk(ctx=>{ctx.epProjectCatalogV1=()=>({articles:null,status:'UNKNOWN'});})(p());
 assert.equal(report.status,'BLOCKED');
 assert.ok(report.issues.some(x=>x.code==='DELIVERY_PROJECT_CATALOGUE_FAILED'));
});
test('catalogue helper exceptions are caught by the trace',()=>{
 const report=mk(ctx=>{ctx.epProjectCatalogV1=()=>{throw Error('bad')};})(p());
 assert.equal(report.status,'BLOCKED');
 assert.ok(report.issues.some(x=>x.code==='DELIVERY_PROJECT_CATALOGUE_FAILED'));
});
test('project catalogue resolution cannot modify engineer source model',()=>{
 const project=p(),before=JSON.stringify(project);mk()(project);
 assert.equal(JSON.stringify(project),before);
});
test('no seeded catalogue still produces valid draft with no invented articles',()=>{
 const report=mk(ctx=>{ctx.EP_CATALOG={};})(p());
 assert.equal(report.sections.WORKFLOW.data.catalogueSeen.length,0);
 assert.notEqual(report.engineeringApproved,true);
});
const printedBundle=()=>({projectTitle:'Shop',overallStatus:'UNKNOWN',statuses:{},sections:{
 deliveryTrace:{status:'REVIEW_REQUIRED',rows:[{
  lineId:'C1',consumerCount:1,articleSku:'CAT1',workflow:{ibA:6.1},
  schematic:{id:'CIRCUIT:C1'},board:{railIndex:0,startModule:1},
  bom:{sku:'CAT1'},crossViewStatus:'LINKED_DRAFT',reviewIssueCount:0
 }],issues:[]}}});
test('printed dossier shows connected scheme/DIN/BOM trace',()=>{
 const h=print(printedBundle());
 assert.match(h,/Сквозная согласованность нагрузок, схемы, DIN и спецификации/);
 assert.match(h,/CIRCUIT:C1/);
 assert.match(h,/CAT1/);
 assert.match(h,/6.1/);
 assert.match(h,/LINKED_DRAFT/);
 assert.match(h,/НЕ ДЛЯ МОНТАЖА/);
});
test('print includes issue identifiers and review counts without claiming approval',()=>{
 const b=printedBundle();b.sections.deliveryTrace.rows[0].reviewIssueCount=2;
 b.sections.deliveryTrace.rows[0].crossViewStatus='REVIEW_REQUIRED';
 b.sections.deliveryTrace.issues=[{level:'BLOCKED',code:'DELIVERY_BOARD_SKU_MISMATCH',lineId:'C1'}];
 const h=print(b);
 assert.match(h,/DELIVERY_BOARD_SKU_MISMATCH/);
 assert.match(h,/REVIEW_REQUIRED/);
 assert.match(h,/НЕ ДЛЯ МОНТАЖА/);
});
test('printed dossier escapes hostile source values in trace',()=>{
 const b=printedBundle();b.sections.deliveryTrace.rows[0].lineId='<script>alert(1)</script>';
 b.sections.deliveryTrace.issues=[{level:'BLOCKED',code:'<img src=x>'}];
 const h=print(b);assert.doesNotMatch(h,/<script>|<img src=/);
 assert.match(h,/&lt;script&gt;/);
});
test('print does not mutate joined engineering bundle',()=>{
 const b=printedBundle(),before=JSON.stringify(b);print(b);assert.equal(JSON.stringify(b),before);
});
test('legacy bundle lacking delivery trace prints stable no-approval document',()=>{
 const b=printedBundle();delete b.sections.deliveryTrace;
 const h=print(b);assert.match(h,/НЕ ДЛЯ МОНТАЖА/);
 assert.match(h,/Сквозная согласованность/);
});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../project-delivery-trace-v1.js'),'utf8');
const ui=require('../project-delivery-trace-ui-v1.js');
const p=()=>({title:'Commercial',railCount:1,railCapacity:12,
 lines:[{id:'C1',name:'Shop',phase:'L1',modules:1,catalogSku:'SKU1',overloadInput:{ibA:8.6}}],
 loads:[{id:'LD1',circuitId:'C1',powerKw:2}],
 branchDevices:[{id:'BR1',circuitId:'C1',modules:1}],sharedDevices:[]});
const mk=(mutate=()=>{})=>{
 const ctx={
 epDraftBoardPlanV1:()=>({status:'UNKNOWN',issues:[],placements:[{deviceId:'BR1',article:'SKU1',modules:1,railIndex:0,startModule:0}]}),
 epDraftBomV1:()=>({status:'UNKNOWN',issues:[],devices:[{kind:'branch',owner:'C1',sku:'SKU1',modules:1}]}),
 epSingleLineDraftV1:()=>({status:'UNKNOWN',issues:[],nodes:[{id:'CIRCUIT:C1',type:'circuit',sku:'SKU1',phase:'L1',design:{ibA:8.6}}]}),
 epWorkflowPreviewV1:()=>({status:'DRAFT',issues:[],rows:[{lineId:'C1',phase:'L1',ibA:8.6,calculationStatus:'CALCULATED',ibSource:'EXISTING'}]})
 };
 mutate(ctx);vm.createContext(ctx);vm.runInContext(source,ctx);
 return project=>ctx.epProjectDeliveryTraceV1(project);
};
const check=(code,mutate,project=p())=>{
 const report=mk(mutate)(project);
 assert.ok(report.issues.some(x=>x.code===code),code+' / '+JSON.stringify(report.issues));
 assert.equal(report.status,code==='DELIVERY_LINKED_IB_RECALCULATION_REQUIRED'?'REVIEW_REQUIRED':'BLOCKED');
 assert.equal(report.rows[0].crossViewStatus,'REVIEW_REQUIRED');
 assert.equal(report.engineeringApproved,false);
};
test('fully connected exact projections remain draft, never approved',()=>{
 const report=mk()(p());assert.equal(report.rows[0].crossViewStatus,'LINKED_DRAFT');
 assert.equal(report.rows[0].reviewIssueCount,0);
 assert.equal(report.status,'REVIEW_REQUIRED');
 assert.equal(report.ready_for_installation,false);
});
test('detect SKU changed in board but not project',()=>check('DELIVERY_BOARD_SKU_MISMATCH',
 c=>c.epDraftBoardPlanV1=()=>({status:'UNKNOWN',issues:[],placements:[{deviceId:'BR1',article:'WRONG',modules:1}]})));
test('detect BOM to board SKU divergence even when line already differs',()=>check('DELIVERY_BOARD_BOM_SKU_MISMATCH',
 c=>c.epDraftBoardPlanV1=()=>({status:'UNKNOWN',issues:[],placements:[{deviceId:'BR1',article:'WRONG',modules:1}]})));
test('detect differing BOM apparatus width and DIN placement',()=>check('DELIVERY_BOARD_BOM_WIDTH_MISMATCH',
 c=>c.epDraftBomV1=()=>({status:'UNKNOWN',issues:[],devices:[{kind:'branch',owner:'C1',sku:'SKU1',modules:2}]})));
test('detect diagram phase mismatch',()=>check('DELIVERY_SCHEMATIC_PHASE_MISMATCH',
 c=>c.epSingleLineDraftV1=()=>({status:'UNKNOWN',issues:[],nodes:[{id:'CIRCUIT:C1',phase:'L2',sku:'SKU1',design:{ibA:8.6}}]})));
test('detect calculation preview phase mismatch',()=>check('DELIVERY_WORKFLOW_PHASE_MISMATCH',
 c=>c.epWorkflowPreviewV1=()=>({status:'DRAFT',issues:[],rows:[{lineId:'C1',phase:'L3',ibA:8.6}]})));
test('detect stale Ib in diagram',()=>check('DELIVERY_SCHEMATIC_IB_MISMATCH',
 c=>c.epSingleLineDraftV1=()=>({status:'UNKNOWN',issues:[],nodes:[{id:'CIRCUIT:C1',sku:'SKU1',phase:'L1',design:{ibA:5.1}}]})));
test('detect stale Ib in workflow',()=>check('DELIVERY_WORKFLOW_IB_MISMATCH',
 c=>c.epWorkflowPreviewV1=()=>({status:'DRAFT',issues:[],rows:[{lineId:'C1',phase:'L1',ibA:5.1}]})));
test('numeric string comma compares equivalently with number Ib',()=>{
 const report=mk(c=>c.epWorkflowPreviewV1=()=>({status:'DRAFT',issues:[],rows:[{lineId:'C1',phase:'L1',ibA:'8,600'}]}))(p());
 assert.equal(report.rows[0].reviewIssueCount,0);
});
test('rounding tolerance avoids false mismatch at 0.001 A',()=>{
 const report=mk(c=>c.epWorkflowPreviewV1=()=>({status:'DRAFT',issues:[],rows:[{lineId:'C1',phase:'L1',ibA:8.6004}]}))(p());
 assert.equal(report.rows[0].reviewIssueCount,0);
});
test('missing optional projection values do not become invented mismatches',()=>{
 const report=mk(c=>c.epWorkflowPreviewV1=()=>({status:'DRAFT',issues:[],rows:[{lineId:'C1'}]}))(p());
 assert.equal(report.rows[0].reviewIssueCount,0);
});
test('linked stale current is review issue without hiding original power',()=>check('DELIVERY_LINKED_IB_RECALCULATION_REQUIRED',
 c=>c.epWorkflowPreviewV1=()=>({status:'DRAFT',issues:[],rows:[{lineId:'C1',phase:'L1',ibA:8.6,ibSource:'STALE_LINKED_CURRENT',calculationStatus:'STALE_REVIEW'}]})));
test('stale status can be detected independently from source',()=>check('DELIVERY_LINKED_IB_RECALCULATION_REQUIRED',
 c=>c.epWorkflowPreviewV1=()=>({status:'DRAFT',issues:[],rows:[{lineId:'C1',phase:'L1',ibA:8.6,calculationStatus:'STALE_REVIEW'}]})));
test('repeated load IDs block trace rather than silently double counting',()=>{
 const project=p();project.loads.push({...project.loads[0]});
 const report=mk()(project);
 assert.ok(report.issues.some(x=>x.code==='DELIVERY_CONSUMER_ID_INVALID_OR_DUPLICATE'));
 assert.equal(report.status,'BLOCKED');
});
test('missing load IDs in existing legacy projects are not invented',()=>{
 const project=p();delete project.loads[0].id;
 const report=mk()(project);assert.equal(report.status,'REVIEW_REQUIRED');
 assert.equal(report.rows[0].consumerCount,1);
});
test('invalid supplied consumer ID is blocked without mutating source',()=>{
 const project=p();project.loads[0].id='';
 const before=JSON.stringify(project),report=mk()(project);
 assert.equal(report.status,'BLOCKED');
 assert.equal(JSON.stringify(project),before);
});
test('sharedDevices nonarray cannot throw during orphan DIN check',()=>{
 const project=p();project.sharedDevices={bad:true};
 const report=mk(c=>c.epDraftBoardPlanV1=()=>({status:'UNKNOWN',issues:[],placements:[{deviceId:'EXTRA',article:null,modules:1}]}))(project);
 assert.equal(report.status,'BLOCKED');
 assert.ok(report.issues.some(x=>x.code==='DELIVERY_ORPHAN_PLACEMENT'));
});
test('unknown placement cannot silently imply it corresponds to circuit',()=>{
 const report=mk(c=>c.epDraftBoardPlanV1=()=>({status:'UNKNOWN',issues:[],placements:[]}))(p());
 assert.ok(report.issues.some(x=>x.code==='DELIVERY_PLACEMENT_MISSING'));
});
test('review count visible in HTML and CSV',()=>{
 const report=mk(c=>c.epSingleLineDraftV1=()=>({status:'UNKNOWN',issues:[],nodes:[{id:'CIRCUIT:C1',phase:'L3',sku:'SKU1',design:{ibA:3}}]}))(p());
 assert.equal(report.rows[0].reviewIssueCount,2);
 assert.match(ui.epProjectDeliveryTraceHtmlV1(report),/замечаний 2/);
 assert.match(ui.epProjectDeliveryTraceCsvV1(report).csv,/review_issue_count/);
 assert.match(ui.epProjectDeliveryTraceCsvV1(report).csv,/"2"/);
});
test('HTML escapes hostile identifiers in new review badges',()=>{
 const report=mk()(p());report.rows[0].name='<img src=x onerror=alert(1)>';
 assert.doesNotMatch(ui.epProjectDeliveryTraceHtmlV1(report),/<img/);
});
test('CSV neutralizes formula and preserves new review count',()=>{
 const report=mk()(p());report.rows[0].name='=SUM(1,2)';
 assert.match(ui.epProjectDeliveryTraceCsvV1(report).csv,/"'=SUM\(1,2\)"/);
});
test('all reviewed projections are read-only and deterministic',()=>{
 const project=p(),before=JSON.stringify(project),run=mk();
 assert.deepEqual(JSON.parse(JSON.stringify(run(project))),JSON.parse(JSON.stringify(run(project))));
 assert.equal(JSON.stringify(project),before);
});

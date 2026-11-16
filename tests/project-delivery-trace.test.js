'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','project-delivery-trace-v1.js'),'utf8');
const make=()=>{
 const ctx={};
 ctx.epDraftBoardPlanV1=p=>({status:'UNKNOWN',placements:p.lines.map((l,i)=>({deviceId:l.id,railIndex:0,startModule:i,modules:l.modules})),issues:[]});
 ctx.epDraftBomV1=p=>({status:'UNKNOWN',devices:p.lines.map(l=>({id:l.id,kind:'branch',owner:l.id,sku:l.catalogSku})),issues:[]});
 ctx.epSingleLineDraftV1=p=>({status:'UNKNOWN',nodes:p.lines.map(l=>({id:'CIRCUIT:'+l.id,type:'circuit',sku:l.catalogSku})),issues:[]});
 ctx.epWorkflowPreviewV1=p=>({status:'DRAFT',rows:p.lines.map(l=>({lineId:l.id,current:10})),issues:[]});
 vm.createContext(ctx);vm.runInContext(source,ctx);return ctx;
};
const project=()=>({lines:[{id:'L1',name:'Lighting',phase:'L1',modules:1,catalogSku:'SKU1'},
 {id:'L2',name:'HVAC',phase:'L2',modules:2,catalogSku:'SKU2'}],
 loads:[{id:'LOAD1',circuitId:'L1'},{id:'LOAD2',circuitId:'L2'}],sharedDevices:[],railCount:2,railCapacity:12});
const run=(p=project(),ctx=make())=>ctx.epProjectDeliveryTraceV1(p);
const has=(p,code,ctx)=>run(p,ctx).issues.some(x=>x.code===code);
test('two circuits traced',()=>assert.equal(run().rows.length,2));
test('all four projections recorded',()=>assert.equal(Object.keys(run().sections).length,4));
test('project is not approved',()=>assert.equal(run().engineeringApproved,false));
test('project not installation ready',()=>assert.equal(run().ready_for_installation,false));
test('complete links remain review draft',()=>assert.equal(run().status,'REVIEW_REQUIRED'));
test('first circuit id preserved',()=>assert.equal(run().rows[0].lineId,'L1'));
test('second circuit id preserved',()=>assert.equal(run().rows[1].lineId,'L2'));
test('first device linked',()=>assert.equal(run().rows[0].deviceId,'L1'));
test('second device linked',()=>assert.equal(run().rows[1].deviceId,'L2'));
test('first BOM linked',()=>assert.equal(run().rows[0].bom.sku,'SKU1'));
test('second BOM linked',()=>assert.equal(run().rows[1].bom.sku,'SKU2'));
test('first placement linked',()=>assert.equal(run().rows[0].board.startModule,0));
test('second placement linked',()=>assert.equal(run().rows[1].board.startModule,1));
test('first schematic linked',()=>assert.equal(run().rows[0].schematic.id,'CIRCUIT:L1'));
test('second schematic linked',()=>assert.equal(run().rows[1].schematic.id,'CIRCUIT:L2'));
test('first workflow linked',()=>assert.equal(run().rows[0].workflow.lineId,'L1'));
test('second workflow linked',()=>assert.equal(run().rows[1].workflow.lineId,'L2'));
test('consumer count first',()=>assert.equal(run().rows[0].consumerCount,1));
test('consumer count second',()=>assert.equal(run().rows[1].consumerCount,1));
test('fully linked draft status',()=>assert.equal(run().rows[0].crossViewStatus,'LINKED_DRAFT'));
test('project unchanged',()=>{const p=project(),before=JSON.stringify(p);run(p);assert.equal(JSON.stringify(p),before)});
test('deterministic trace',()=>{const p=project();assert.deepEqual(JSON.parse(JSON.stringify(run(p))),JSON.parse(JSON.stringify(run(p))))});
test('missing project blocked',()=>assert.equal(run(null).status,'BLOCKED'));
test('missing lines blocked',()=>assert.equal(run({loads:[]}).status,'BLOCKED'));
test('missing loads blocked',()=>assert.equal(run({lines:[]}).status,'BLOCKED'));
test('missing consumer flagged',()=>{const p=project();p.loads=[];assert.ok(has(p,'DELIVERY_CONSUMERS_NOT_LINKED'))});
test('orphan consumer blocked',()=>{const p=project();p.loads.push({id:'BAD',circuitId:'BAD'});assert.ok(has(p,'DELIVERY_ORPHAN_CONSUMER'))});
test('unassigned consumer flagged',()=>{const p=project();p.loads.push({id:'BAD'});assert.ok(has(p,'DELIVERY_LOAD_UNASSIGNED'))});
test('duplicate circuit blocked',()=>{const p=project();p.lines.push({...p.lines[0]});assert.ok(has(p,'DELIVERY_DUPLICATE_LINE_ID'))});
test('missing circuit id blocked',()=>{const p=project();p.lines[0].id='';assert.ok(has(p,'DELIVERY_LINE_ID_INVALID'))});
test('missing article flagged',()=>{const p=project();delete p.lines[0].catalogSku;assert.ok(has(p,'DELIVERY_SKU_NOT_SELECTED'))});
test('missing branch blocked when branch list explicit',()=>{const p=project();p.branchDevices=[];assert.ok(has(p,'DELIVERY_BRANCH_MISSING'))});
test('duplicate branch blocked',()=>{const p=project();p.branchDevices=[{id:'B1',circuitId:'L1'},{id:'B2',circuitId:'L1'}];assert.ok(has(p,'DELIVERY_BRANCH_DUPLICATED'))});
const cases=[
 ['DELIVERY_PLACEMENT_MISSING',c=>c.epDraftBoardPlanV1=p=>({placements:[],issues:[],status:'UNKNOWN'})],
 ['DELIVERY_PLACEMENT_DUPLICATED',c=>c.epDraftBoardPlanV1=p=>({placements:[{deviceId:'L1',modules:1},{deviceId:'L1',modules:1}],issues:[],status:'UNKNOWN'})],
 ['DELIVERY_BOM_DEVICE_MISSING',c=>c.epDraftBomV1=p=>({devices:[],issues:[],status:'UNKNOWN'})],
 ['DELIVERY_BOM_DEVICE_DUPLICATED',c=>c.epDraftBomV1=p=>({devices:[{kind:'branch',owner:'L1',sku:'SKU1'},{kind:'branch',owner:'L1',sku:'SKU1'}],issues:[],status:'UNKNOWN'})],
 ['DELIVERY_SCHEMATIC_CIRCUIT_MISSING',c=>c.epSingleLineDraftV1=p=>({nodes:[],issues:[],status:'UNKNOWN'})],
 ['DELIVERY_SCHEMATIC_CIRCUIT_DUPLICATED',c=>c.epSingleLineDraftV1=p=>({nodes:[{id:'CIRCUIT:L1',type:'circuit'},{id:'CIRCUIT:L1',type:'circuit'}],issues:[],status:'UNKNOWN'})],
 ['DELIVERY_WORKFLOW_ROW_MISSING',c=>c.epWorkflowPreviewV1=p=>({rows:[],issues:[],status:'DRAFT'})],
 ['DELIVERY_WORKFLOW_ROW_DUPLICATED',c=>c.epWorkflowPreviewV1=p=>({rows:[{lineId:'L1'},{lineId:'L1'}],issues:[],status:'DRAFT'})],
 ['DELIVERY_BOARD_WIDTH_MISMATCH',c=>c.epDraftBoardPlanV1=p=>({placements:[{deviceId:'L1',modules:3}],issues:[],status:'UNKNOWN'})],
 ['DELIVERY_BOM_SKU_MISMATCH',c=>c.epDraftBomV1=p=>({devices:[{kind:'branch',owner:'L1',sku:'WRONG'}],issues:[],status:'UNKNOWN'})],
 ['DELIVERY_SCHEMATIC_SKU_MISMATCH',c=>c.epSingleLineDraftV1=p=>({nodes:[{id:'CIRCUIT:L1',type:'circuit',sku:'WRONG'}],issues:[],status:'UNKNOWN'})],
 ['DELIVERY_ORPHAN_PLACEMENT',c=>c.epDraftBoardPlanV1=p=>({placements:[{deviceId:'UNKNOWN',modules:1}],issues:[],status:'UNKNOWN'})],
 ['DELIVERY_ORPHAN_BOM_DEVICE',c=>c.epDraftBomV1=p=>({devices:[{kind:'branch',owner:'UNKNOWN'}],issues:[],status:'UNKNOWN'})],
 ['DELIVERY_ORPHAN_SCHEMATIC_CIRCUIT',c=>c.epSingleLineDraftV1=p=>({nodes:[{id:'CIRCUIT:UNKNOWN',type:'circuit'}],issues:[],status:'UNKNOWN'})],
 ['DELIVERY_BOARD_BLOCKED',c=>c.epDraftBoardPlanV1=p=>({placements:[],issues:[],status:'BLOCKED'})],
 ['DELIVERY_BOM_BLOCKED',c=>c.epDraftBomV1=p=>({devices:[],issues:[],status:'BLOCKED'})],
 ['DELIVERY_SINGLE_LINE_BLOCKED',c=>c.epSingleLineDraftV1=p=>({nodes:[],issues:[],status:'BLOCKED'})],
 ['DELIVERY_WORKFLOW_BLOCKED',c=>c.epWorkflowPreviewV1=p=>({rows:[],issues:[],status:'BLOCKED'})],
 ['DELIVERY_BOARD_FAILED',c=>c.epDraftBoardPlanV1=()=>{throw Error('failed')}],
 ['DELIVERY_BOM_FAILED',c=>c.epDraftBomV1=()=>{throw Error('failed')}],
 ['DELIVERY_SINGLE_LINE_FAILED',c=>c.epSingleLineDraftV1=()=>{throw Error('failed')}],
 ['DELIVERY_WORKFLOW_FAILED',c=>c.epWorkflowPreviewV1=()=>{throw Error('failed')}],
 ['DELIVERY_BOARD_ENGINE_UNAVAILABLE',c=>c.epDraftBoardPlanV1=null],
 ['DELIVERY_BOM_ENGINE_UNAVAILABLE',c=>c.epDraftBomV1=null],
 ['DELIVERY_SINGLE_LINE_ENGINE_UNAVAILABLE',c=>c.epSingleLineDraftV1=null],
 ['DELIVERY_WORKFLOW_ENGINE_UNAVAILABLE',c=>c.epWorkflowPreviewV1=null]
];
for(const [code,mutate] of cases)test('detect '+code,()=>{const c=make();mutate(c);assert.ok(has(project(),code,c),code)});
test('trace does not change source article',()=>assert.equal(run().rows[0].articleSku,'SKU1'));
test('trace does not infer phase',()=>{const p=project();delete p.lines[0].phase;assert.equal(run(p).rows[0].phase,null)});
test('trace preserves line title',()=>assert.equal(run().rows[0].name,'Lighting'));
test('trace preserves source board status',()=>assert.equal(run().sections.BOARD.status,'UNKNOWN'));
test('trace preserves source workflow status',()=>assert.equal(run().sections.WORKFLOW.status,'DRAFT'));
test('trace preserves original rows',()=>assert.equal(run().sections.BOM.data.devices.length,2));
test('trace has no approval from source status',()=>assert.equal(run().engineeringApproved,false));
test('line limit blocks oversized input',()=>{const p=project();p.lines=Array.from({length:401},(_,i)=>({id:'L'+i}));assert.equal(run(p).status,'BLOCKED')});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','project-device-identity-v1.js'),'utf8');
function context(){
 const c={};
 c.epDraftBoardPlanV1=p=>({status:'UNKNOWN',placements:[
  ...p.lines.map((l,i)=>({deviceId:l.id,kind:'branch',modules:l.modules,article:l.catalogSku,railIndex:0,startModule:i})),
  ...p.sharedDevices.map((d,i)=>({deviceId:d.id,kind:'shared',modules:d.modules,article:d.catalogSku,railIndex:1,startModule:i}))]});
 c.epDraftBomV1=p=>({status:'UNKNOWN',devices:[
  ...p.lines.map(l=>({id:l.id,kind:'branch',owner:l.id,sku:l.catalogSku})),
  ...p.sharedDevices.map(d=>({id:d.id,kind:'shared',owner:d.id,sku:d.catalogSku}))]});
 c.epSingleLineDraftV1=p=>({status:'UNKNOWN',nodes:[
  ...p.lines.map(l=>({id:'CIRCUIT:'+l.id,type:'circuit',sku:l.catalogSku})),
  ...p.sharedDevices.map(d=>({id:'RCD:'+d.id,type:'rcd',sku:d.catalogSku}))]});
 vm.createContext(c);vm.runInContext(source,c);return c;
}
const project=()=>({lines:[{id:'L1',modules:1,catalogSku:'A1'},{id:'L2',modules:2,catalogSku:'A2'}],
 sharedDevices:[{id:'R1',modules:2,catalogSku:'RCD1'}]});
const run=(p=project(),c=context())=>c.epProjectDeviceIdentityV1(p);
const has=(code,p=project(),c=context())=>run(p,c).issues.some(x=>x.code===code);
test('three devices traced',()=>assert.equal(run().rows.length,3));
test('two branch devices traced',()=>assert.equal(run().rows.filter(x=>x.kind==='branch').length,2));
test('shared device traced',()=>assert.equal(run().rows.filter(x=>x.kind==='shared').length,1));
test('shared RCD has schematic',()=>assert.equal(run().rows[2].schematic.id,'RCD:R1'));
test('shared RCD has BOM',()=>assert.equal(run().rows[2].bom.sku,'RCD1'));
test('shared RCD has placement',()=>assert.equal(run().rows[2].board.deviceId,'R1'));
test('shared RCD owner',()=>assert.equal(run().rows[2].owner,'R1'));
test('branch first ID',()=>assert.equal(run().rows[0].id,'L1'));
test('branch second ID',()=>assert.equal(run().rows[1].id,'L2'));
test('linked draft status',()=>assert.equal(run().rows[0].status,'LINKED_DRAFT'));
test('all linked draft',()=>assert.ok(run().rows.every(x=>x.status==='LINKED_DRAFT')));
test('never engineering approved',()=>assert.equal(run().engineeringApproved,false));
test('never installation ready',()=>assert.equal(run().ready_for_installation,false));
test('overall status review',()=>assert.equal(run().status,'REVIEW_REQUIRED'));
test('invalid null project blocked',()=>assert.equal(run(null).status,'BLOCKED'));
test('invalid missing lines blocked',()=>assert.equal(run({sharedDevices:[]}).status,'BLOCKED'));
test('invalid missing shared devices blocked',()=>assert.equal(run({lines:[]}).status,'BLOCKED'));
test('source project not mutated',()=>{const p=project(),before=JSON.stringify(p);run(p);assert.equal(JSON.stringify(p),before)});
test('deterministic audit',()=>{const p=project();assert.deepEqual(JSON.parse(JSON.stringify(run(p))),JSON.parse(JSON.stringify(run(p))))});
test('shared article retained',()=>assert.equal(run().rows[2].sku,'RCD1'));
test('branch article retained',()=>assert.equal(run().rows[0].sku,'A1'));
test('shared width retained',()=>assert.equal(run().rows[2].modules,2));
test('branch width retained',()=>assert.equal(run().rows[0].modules,1));
test('shared missing article flagged',()=>{const p=project();delete p.sharedDevices[0].catalogSku;assert.ok(has('IDENTITY_SKU_UNASSIGNED',p))});
test('branch missing article flagged',()=>{const p=project();delete p.lines[0].catalogSku;assert.ok(has('IDENTITY_SKU_UNASSIGNED',p))});
test('duplicate IDs blocked',()=>{const p=project();p.sharedDevices[0].id='L1';assert.ok(has('IDENTITY_DEVICE_ID_COLLISION',p))});
test('missing shared ID blocked',()=>{const p=project();p.sharedDevices[0].id='';assert.ok(has('IDENTITY_SHARED_INVALID',p))});
test('missing line ID blocked',()=>{const p=project();p.lines[0].id='';assert.ok(has('IDENTITY_CIRCUIT_INVALID',p))});
test('missing branch assignment blocked',()=>{const p=project();p.branchDevices=[];assert.ok(has('IDENTITY_BRANCH_MISSING',p))});
test('duplicate branch assignment blocked',()=>{const p=project();p.branchDevices=[{id:'B1',circuitId:'L1'},{id:'B2',circuitId:'L1'}];assert.ok(has('IDENTITY_BRANCH_DUPLICATE',p))});
test('invalid width blocked',()=>{const p=project();p.lines[0].modules=0;assert.ok(has('IDENTITY_MODULES_INVALID',p))});
const scenarios=[
 ['IDENTITY_PLACEMENT_MISSING',c=>c.epDraftBoardPlanV1=()=>({status:'UNKNOWN',placements:[]})],
 ['IDENTITY_DUPLICATE_PLACEMENT',c=>c.epDraftBoardPlanV1=p=>({status:'UNKNOWN',placements:[{deviceId:'L1'},{deviceId:'L1'}]})],
 ['IDENTITY_BOM_MISSING',c=>c.epDraftBomV1=()=>({status:'UNKNOWN',devices:[]})],
 ['IDENTITY_DUPLICATE_BOM',c=>c.epDraftBomV1=p=>({status:'UNKNOWN',devices:[{id:'L1',kind:'branch'},{id:'L1',kind:'branch'}]})],
 ['IDENTITY_SCHEMATIC_MISSING',c=>c.epSingleLineDraftV1=()=>({status:'UNKNOWN',nodes:[]})],
 ['IDENTITY_DUPLICATE_SCHEMATIC',c=>c.epSingleLineDraftV1=()=>({status:'UNKNOWN',nodes:[{id:'CIRCUIT:L1',type:'circuit'},{id:'CIRCUIT:L1',type:'circuit'}]})],
 ['IDENTITY_PLACEMENT_KIND_MISMATCH',c=>c.epDraftBoardPlanV1=()=>({status:'UNKNOWN',placements:[{deviceId:'L1',kind:'shared',modules:1,article:'A1'}]})],
 ['IDENTITY_PLACEMENT_MODULE_MISMATCH',c=>c.epDraftBoardPlanV1=()=>({status:'UNKNOWN',placements:[{deviceId:'L1',kind:'branch',modules:5,article:'A1'}]})],
 ['IDENTITY_BOM_SKU_MISMATCH',c=>c.epDraftBomV1=()=>({status:'UNKNOWN',devices:[{id:'L1',kind:'branch',owner:'L1',sku:'WRONG'}]})],
 ['IDENTITY_SCHEMATIC_SKU_MISMATCH',c=>c.epSingleLineDraftV1=()=>({status:'UNKNOWN',nodes:[{id:'CIRCUIT:L1',type:'circuit',sku:'WRONG'}]})],
 ['IDENTITY_BOM_OWNER_MISMATCH',c=>c.epDraftBomV1=()=>({status:'UNKNOWN',devices:[{id:'L1',kind:'branch',owner:'WRONG',sku:'A1'}]})],
 ['IDENTITY_PLACEMENT_SKU_MISMATCH',c=>c.epDraftBoardPlanV1=()=>({status:'UNKNOWN',placements:[{deviceId:'L1',kind:'branch',modules:1,article:'WRONG'}]})],
 ['IDENTITY_ORPHAN_PLACEMENT',c=>c.epDraftBoardPlanV1=()=>({status:'UNKNOWN',placements:[{deviceId:'ORPHAN'}]})],
 ['IDENTITY_ORPHAN_BOM',c=>c.epDraftBomV1=()=>({status:'UNKNOWN',devices:[{id:'ORPHAN',kind:'branch'}]})],
 ['IDENTITY_ORPHAN_SCHEMATIC',c=>c.epSingleLineDraftV1=()=>({status:'UNKNOWN',nodes:[{id:'CIRCUIT:ORPHAN',type:'circuit'}]})],
 ['IDENTITY_BOARD_BLOCKED',c=>c.epDraftBoardPlanV1=()=>({status:'BLOCKED',placements:[]})],
 ['IDENTITY_BOM_BLOCKED',c=>c.epDraftBomV1=()=>({status:'BLOCKED',devices:[]})],
 ['IDENTITY_SINGLE_LINE_BLOCKED',c=>c.epSingleLineDraftV1=()=>({status:'BLOCKED',nodes:[]})],
 ['IDENTITY_BOARD_FAILED',c=>c.epDraftBoardPlanV1=()=>{throw Error('bad')}],
 ['IDENTITY_BOM_FAILED',c=>c.epDraftBomV1=()=>{throw Error('bad')}],
 ['IDENTITY_SINGLE_LINE_FAILED',c=>c.epSingleLineDraftV1=()=>{throw Error('bad')}],
 ['IDENTITY_BOARD_UNAVAILABLE',c=>c.epDraftBoardPlanV1=null],
 ['IDENTITY_BOM_UNAVAILABLE',c=>c.epDraftBomV1=null],
 ['IDENTITY_SINGLE_LINE_UNAVAILABLE',c=>c.epSingleLineDraftV1=null]
];
for(const [code,mutate] of scenarios)test('detect '+code,()=>{const c=context();mutate(c);assert.ok(has(code,project(),c),code)});
test('source script loaded before delivery trace',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 assert.ok(html.indexOf('project-device-identity-v1.js')<html.indexOf('project-delivery-trace-v1.js'));
});
test('engineering bundle contains device identity',()=>{
 const bundle=fs.readFileSync(path.join(__dirname,'..','engineering-bundle-v1.js'),'utf8');
 assert.match(bundle,/PROJECT_DEVICE_IDENTITY/);
});

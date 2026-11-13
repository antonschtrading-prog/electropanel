'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const source=['catalog.js','draft-board-plan-v1.js','draft-bom-v1.js',
 'circuit-dossier-v1.js','terminal-path-v2.js','endpoint-bridge-v1.js',
 'circuit-wiring-trace-v1.js','neutral-segregation-v1.js','neutral-wire-isolation-v1.js','single-line-draft-v1.js','single-line-svg-v1.js','cross-view-audit-v1.js',
 'engineering-issue-register-v1.js','engineering-gate-v1.js','engineering-bundle-v1.js']
 .map(x=>fs.readFileSync(path.join(root,x),'utf8')).join('\n');
const ctx=vm.createContext({});vm.runInContext(source,ctx);
const fixture=()=>({title:'ЩР · пример без монтажного допуска',railCount:1,railCapacity:12,
 lines:[{id:'L1',name:'Розетки',phase:'L1',catalogSku:'ABB-2CDS251001R0164',modules:1,
  device:'S201-C16',overloadInput:{ibA:12,izA:20},faultInput:{ikKa:5}}],
 branchDevices:[{id:'BR1',circuitId:'L1',modules:1,label:'S201-C16'}],
 sharedDevices:[],loads:[{id:'LOAD1',circuitId:'L1'}],
 conductorRoutes:[{circuitId:'L1',branchDeviceId:'BR1',phaseConductors:['L1'],
 neutralBus:'N_MAIN',protectiveBus:'PE_MAIN',origin:'manual'}],
 terminalLinks:[{id:'T1',circuitId:'L1',from:'BRANCH:BR1/L1',to:'LOAD:LOAD1/L1'}],
 feedLinks:[],groupInputLinks:[],
 endpointBindingsV1:[{symbolicRef:'BRANCH:BR1/L1',terminalId:'a'},
 {symbolicRef:'LOAD:LOAD1/L1',terminalId:'b'}],
 wiringModelV18:{terminals:[{id:'a',conductor:'L1'},{id:'b',conductor:'L1'}],
 wires:[{from:'a',to:'b',state:'closed'}]}});
test('one end-to-end project yields article, DIN, BOM, trace and neutral sections',()=>{
 const p=fixture(),before=JSON.stringify(p),r=ctx.epEngineeringBundleV1(p,ctx.epCatalogSku);
 assert.equal(r.sections.bom.items[0].quantity,1);
 assert.equal(r.sections.board.placements[0].deviceId,'BR1');
 assert.equal(r.sections.wiringTrace.rows[0].declaredPaths,1);
 assert.equal(r.sections.neutralSegregation.rows[0].expectedBus,'N_MAIN');
 assert.equal(r.sections.crossView.checkedCircuits,1);
 assert.ok(r.sections.issueRegister.entries.length>0);
 assert.equal(r.engineeringApproved,false);assert.equal(r.ready_for_installation,false);
 assert.equal(JSON.stringify(p),before);
});
test('neutral bus mismatch becomes blocking in full bundle and issue register',()=>{
 const p=fixture();p.conductorRoutes[0].neutralBus='N_RCD1';
 const r=ctx.epEngineeringBundleV1(p,ctx.epCatalogSku);
 assert.equal(r.sections.neutralSegregation.status,'BLOCKED');
 assert(r.sections.issueRegister.entries.some(i=>i.code==='RCD_NEUTRAL_BUS_MISMATCH'));
 assert.equal(r.overallStatus,'BLOCKED');
});
test('removing wire blocks trace and is visible in full issue register',()=>{
 const p=fixture();p.wiringModelV18.wires=[];
 const r=ctx.epEngineeringBundleV1(p,ctx.epCatalogSku);
 assert.equal(r.sections.wiringTrace.status,'BLOCKED');
 assert(r.sections.issueRegister.entries.some(i=>i.code==='DECLARED_WIRE_PATH_MISSING'));
});
test('declared path never changes draft-only status to approved',()=>{
 const r=ctx.epEngineeringBundleV1(fixture(),ctx.epCatalogSku);
 for(const [name,section] of Object.entries(r.sections))
  assert.notEqual(section.engineeringApproved,true,name);
 assert.notEqual(r.overallStatus,'APPROVED');
});

test('engineering gate propagates neutral segregation blocker',()=>{
 const p=fixture();p.conductorRoutes[0].neutralBus='N_RCD1';
 const r=ctx.epEngineeringGateV1(p,ctx.epCatalogSku);
 assert.equal(r.status,'BLOCKED');
 assert(r.issues.some(x=>x.origin==='neutral_segregation'&&x.code==='RCD_NEUTRAL_BUS_MISMATCH'));
});
test('engineering gate propagates missing declared conductor path',()=>{
 const p=fixture();p.wiringModelV18.wires=[];
 const r=ctx.epEngineeringGateV1(p,ctx.epCatalogSku);
 assert.equal(r.status,'BLOCKED');
 assert(r.issues.some(x=>x.origin==='circuit_wiring_trace'&&x.code==='DECLARED_WIRE_PATH_MISSING'));
});

test('full bundle includes one-line source, circuit and article traceability',()=>{
 const p=fixture(),r=ctx.epEngineeringBundleV1(p,ctx.epCatalogSku);
 assert.equal(r.sections.singleLine.nodes.filter(x=>x.type==='source').length,1);
 assert.equal(r.sections.singleLine.nodes.filter(x=>x.type==='circuit').length,1);
 assert.equal(r.sections.singleLine.nodes.find(x=>x.type==='circuit').article.maker,'ABB');
 assert.equal(r.sections.singleLine.engineeringApproved,false);
});
test('single-line structure reflects RCD grouping without inventing wiring',()=>{
 const p=fixture();p.sharedDevices=[{id:'RCD1',label:'УЗО',templateId:'RCD_2P',circuitIds:['L1']}];
 const r=ctx.epEngineeringBundleV1(p,ctx.epCatalogSku);
 assert.equal(r.sections.singleLine.edges.find(x=>x.to==='CIRCUIT:L1').from,'RCD:RCD1');
 assert.match(ctx.epSingleLineSvgV1(r.sections.singleLine),/НЕ электрический провод/);
});
test('invalid RCD ownership blocks engineering gate and issue register',()=>{
 const p=fixture();p.sharedDevices=[
 {id:'RCD1',circuitIds:['L1']},{id:'RCD2',circuitIds:['L1']}];
 const r=ctx.epEngineeringBundleV1(p,ctx.epCatalogSku);
 assert.equal(r.sections.singleLine.status,'BLOCKED');
 assert(r.sections.issueRegister.entries.some(x=>x.code==='SINGLE_LINE_MULTIPLE_RCD'));
 assert.equal(r.overallStatus,'BLOCKED');
});

test('full bundle reports explicit downstream N cross-bus connection as BLOCKED',()=>{
 const p=fixture();p.sharedDevices=[{id:'RCD1',circuitIds:['L1']}];
 p.endpointBindingsV1.push(
  {symbolicRef:'BUS:N_MAIN/N',terminalId:'nmain'},
  {symbolicRef:'BUS:N_RCD1/N',terminalId:'nrcd'});
 p.wiringModelV18.terminals.push({id:'nmain',conductor:'N'},{id:'nrcd',conductor:'N'});
 p.wiringModelV18.wires.push({from:'nmain',to:'nrcd',state:'closed'});
 const r=ctx.epEngineeringBundleV1(p,ctx.epCatalogSku);
 assert.equal(r.sections.neutralWireIsolation.status,'BLOCKED');
 assert(r.sections.issueRegister.entries.some(x=>x.code==='N_ISOLATION_CROSS_BUS_DECLARED_PATH'));
 assert(r.sections.engineering.issues.some(x=>x.origin==='neutral_wire_isolation'&&x.level==='BLOCKED'));
 assert.equal(r.overallStatus,'BLOCKED');
});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx=vm.createContext({module:{exports:{}}});
for(const f of ['fire-control-v1.js','fire-control-design-v1.js','fire-catalog-reconcile-v1.js','fire-din-reconcile-v1.js'])
 vm.runInContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),ctx);
const project=()=>({railCapacity:12,lines:[{id:'L1'}],loads:[{id:'AC',circuitId:'L1'}],fireControlV1:{
 signals:[{id:'S1',kind:'FIRE',zoneId:'Z1',contactType:'NC'}],
 actions:[{id:'A1',loadId:'AC',signalId:'S1',action:'DISCONNECT',actuator:'CONTACTOR',onSignalLoss:'DEENERGIZED'}],
 design:{assignments:[{actionId:'A1',deviceId:'K1',articleSku:'SKU1',controlVoltageV:24,controlSupplyId:'PS1',
 terminalIds:['T1'],dinRailId:'R1',dinStartModule:2,moduleWidth:2,wireReference:'W1',reviewed:true}]}}});
const article=()=>({sku:'SKU1',kind:'CONTACTOR',modules:2,maker:'Example',series:'X',source:'https://example.com',controlVoltageV:24,verificationStatus:'VERIFIED',mounting:'DIN'});
const audit=(patch={})=>ctx.epFireCatalogReconcileV1(project(),()=>({...article(),...patch}));
test('matching article retains exact declared manufacturer and SKU',()=>{const r=audit();assert.equal(r.rows[0].manufacturer,'Example');assert.equal(r.articles[0].quantity,1);});
test('unknown catalogue SKU blocks evidence',()=>assert.equal(ctx.epFireCatalogReconcileV1(project(),()=>null).status,'BLOCKED'));
const cases=[
 ['wrong device category',{kind:'MCB'},'FIRE_CATALOG_ACTUATOR_KIND_MISMATCH'],
 ['module mismatch',{modules:3},'FIRE_CATALOG_MODULE_WIDTH_MISMATCH'],
 ['coil mismatch',{controlVoltageV:230},'FIRE_CATALOG_COIL_VOLTAGE_MISMATCH'],
 ['non DIN device',{mounting:'PANEL'},'FIRE_CATALOG_DIN_MOUNTING_MISMATCH'],
 ['missing manufacturer source',{source:null},'FIRE_CATALOG_MANUFACTURER_EVIDENCE_MISSING'],
 ['unverified catalogue record',{verificationStatus:'UNVERIFIED'},'FIRE_CATALOG_ARTICLE_UNVERIFIED'],
 ['missing coil evidence',{controlVoltageV:undefined},'FIRE_CATALOG_COIL_VOLTAGE_UNVERIFIED'],
 ['missing module evidence',{modules:undefined},'FIRE_CATALOG_MODULES_UNDECLARED']
];
for(const [name,patch,code] of cases)test(name,()=>assert.ok(audit(patch).issues.some(x=>x.code===code)));
test('missing lookup is unresolved not a fabricated match',()=>assert.ok(ctx.epFireCatalogReconcileV1(project()).issues.some(x=>x.code==='FIRE_CATALOG_LOOKUP_UNAVAILABLE')));
test('DIN includes declared fire device',()=>assert.equal(ctx.epFireDinReconcileV1(project()).placements[0].id,'K1'));
test('DIN collision with other panel device is blocked',()=>{
 const p=project();p.dinPlacementsV1=[{deviceId:'Q1',railId:'R1',startModule:3,widthModules:2}];
 assert.ok(ctx.epFireDinReconcileV1(p).issues.some(x=>x.code==='FIRE_DIN_CROSS_DEVICE_COLLISION'));
});
test('DIN disjoint placement is accepted without collision',()=>{
 const p=project();p.dinPlacementsV1=[{deviceId:'Q1',railId:'R1',startModule:5,widthModules:2}];
 assert.ok(!ctx.epFireDinReconcileV1(p).issues.some(x=>x.code==='FIRE_DIN_CROSS_DEVICE_COLLISION'));
});
test('DIN rail capacity overflow blocks',()=>{
 const p=project();p.railCapacity=2;
 assert.ok(ctx.epFireDinReconcileV1(p).issues.some(x=>x.code==='FIRE_DIN_CAPACITY_EXCEEDED'));
});
test('DIN missing other panel placements requires review',()=>assert.ok(ctx.epFireDinReconcileV1(project()).issues.some(x=>x.code==='FIRE_DIN_FULL_PANEL_LAYOUT_UNVERIFIED')));
test('DIN malformed external placement requires review',()=>{
 const p=project();p.dinPlacementsV1=[{deviceId:'Q1'}];
 assert.ok(ctx.epFireDinReconcileV1(p).issues.some(x=>x.code==='FIRE_DIN_EXTERNAL_GEOMETRY_UNDECLARED'));
});
test('DIN invalid external list blocked',()=>{
 const p=project();p.dinPlacementsV1={};
 assert.equal(ctx.epFireDinReconcileV1(p).status,'BLOCKED');
});
test('unconfigured project returns not configured',()=>{
 assert.equal(ctx.epFireDinReconcileV1({}).status,'NOT_CONFIGURED');
 assert.equal(ctx.epFireCatalogReconcileV1({}).status,'NOT_CONFIGURED');
});
test('bundle includes both reconciliation sections',()=>{
 const src=fs.readFileSync(path.join(__dirname,'..','engineering-bundle-v1.js'),'utf8');
 assert.match(src,/fireCatalog/);assert.match(src,/fireDin/);
});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epDraftBomV1}=require('../draft-bom-v1.js');
const {epDraftBoardPlanV1}=require('../draft-board-plan-v1.js');
const {epCatalogOutputCrossViewV1}=require('../cross-view-audit-v1.js');
const BASE={
 lines:[{id:'L1',name:'Lighting',phase:'L1',device:'B16',modules:1,catalogSku:'MCB16'},
        {id:'L2',name:'Socket',phase:'L2',device:'B16',modules:1,catalogSku:'MCB16'}],
 sharedDevices:[{id:'R1',label:'RCD group',templateId:'RCD_2P',modules:2,catalogSku:'RCD40',circuitIds:['L1']}],
 branchDevices:[{id:'BD1',circuitId:'L1',modules:1,label:'B16'},
                {id:'BD2',circuitId:'L2',modules:1,label:'B16'}],
 railCount:2,railCapacity:12};
const ARTICLES={
 MCB16:{id:'MCB16',sku:'M-B16',maker:'Maker',series:'M',label:'B16',kind:'MCB',
   modules:1,widthMm:18,poles:1,inA:16,icnKa:6,source:'https://example.org/mcb'},
 RCD40:{id:'RCD40',sku:'R-40',maker:'Maker',series:'R',label:'RCD40',kind:'RCD',
   modules:2,widthMm:36,poles:2,inA:40,icnKa:6,source:'https://example.org/rcd'}};
function fixture(){
 const p=structuredClone(BASE),articles=structuredClone(ARTICLES),lookup=id=>articles[id]||null;
 const bom=epDraftBomV1(p,lookup),board=epDraftBoardPlanV1(p,lookup);
 return {p,articles,bom,board,lookup};
}
test('unmodified outputs reconcile with circuit catalogue and shared RCD',()=>{
 const {p,bom,board,lookup}=fixture();
 const report=epCatalogOutputCrossViewV1(p,board,bom,lookup);
 assert.deepEqual(report.issues,[]);
});
test('catalogue lookup absence fails closed',()=>{
 const {p,bom,board}=fixture();
 assert.ok(epCatalogOutputCrossViewV1(p,board,bom,null).issues.some(x=>x.code==='OUTPUT_CATALOG_LOOKUP_UNAVAILABLE'));
});
test('catalogue lookup exception fails closed',()=>{
 const {p,bom,board}=fixture();
 assert.ok(epCatalogOutputCrossViewV1(p,board,bom,()=>{throw Error('offline');}).issues.some(x=>x.code==='OUTPUT_CATALOG_LOOKUP_FAILED'));
});

test("rail count change requires board regeneration",()=>{
 const {p,bom,board,articles,lookup}=fixture();
 board.rails=3;
 const result=epCatalogOutputCrossViewV1(p,board,bom,lookup);
 assert.ok(result.issues.some(x=>x.code==="OUTPUT_BOARD_RAILS_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("rail capacity change requires board regeneration",()=>{
 const {p,bom,board,articles,lookup}=fixture();
 board.capacityPerRail=24;
 const result=epCatalogOutputCrossViewV1(p,board,bom,lookup);
 assert.ok(result.issues.some(x=>x.code==="OUTPUT_BOARD_CAPACITY_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("branch DIN width changed without board rebuild",()=>{
 const {p,bom,board,articles,lookup}=fixture();
 board.placements.find(x=>x.deviceId==='BD1').modules=3;
 const result=epCatalogOutputCrossViewV1(p,board,bom,lookup);
 assert.ok(result.issues.some(x=>x.code==="OUTPUT_BOARD_MODULES_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("board device category stale",()=>{
 const {p,bom,board,articles,lookup}=fixture();
 board.placements.find(x=>x.deviceId==='BD1').kind='shared';
 const result=epCatalogOutputCrossViewV1(p,board,bom,lookup);
 assert.ok(result.issues.some(x=>x.code==="OUTPUT_BOARD_DEVICE_KIND_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("board device SKU stale",()=>{
 const {p,bom,board,articles,lookup}=fixture();
 board.placements.find(x=>x.deviceId==='BD1').article='RCD40';
 const result=epCatalogOutputCrossViewV1(p,board,bom,lookup);
 assert.ok(result.issues.some(x=>x.code==="OUTPUT_BOARD_SKU_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("manual placement diverges from board output",()=>{
 const {p,bom,board,articles,lookup}=fixture();
 p.manualLayoutV1=[{deviceId:'BD1',railIndex:1,startModule:5}];
 const result=epCatalogOutputCrossViewV1(p,board,bom,lookup);
 assert.ok(result.issues.some(x=>x.code==="OUTPUT_MANUAL_PLACEMENT_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("orphan branch entity is detected",()=>{
 const {p,bom,board,articles,lookup}=fixture();
 p.branchDevices.push({id:'BAD',circuitId:'XX',modules:1,label:'X'});
 const result=epCatalogOutputCrossViewV1(p,board,bom,lookup);
 assert.ok(result.issues.some(x=>x.code==="OUTPUT_BRANCH_ORPHAN"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("duplicate branch assignment is detected",()=>{
 const {p,bom,board,articles,lookup}=fixture();
 p.branchDevices.push({id:'BD3',circuitId:'L1',modules:1,label:'B16'});
 const result=epCatalogOutputCrossViewV1(p,board,bom,lookup);
 assert.ok(result.issues.some(x=>x.code==="OUTPUT_BRANCH_DUPLICATE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("missing branch entity is detected",()=>{
 const {p,bom,board,articles,lookup}=fixture();
 p.branchDevices=p.branchDevices.filter(x=>x.circuitId!=='L1');
 const result=epCatalogOutputCrossViewV1(p,board,bom,lookup);
 assert.ok(result.issues.some(x=>x.code==="OUTPUT_BRANCH_MISSING"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("branch DIN modules differ from line",()=>{
 const {p,bom,board,articles,lookup}=fixture();
 p.branchDevices[0].modules=3;
 const result=epCatalogOutputCrossViewV1(p,board,bom,lookup);
 assert.ok(result.issues.some(x=>x.code==="OUTPUT_BRANCH_MODULES_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("branch label differs from circuit",()=>{
 const {p,bom,board,articles,lookup}=fixture();
 p.branchDevices[0].label='Outdated';
 const result=epCatalogOutputCrossViewV1(p,board,bom,lookup);
 assert.ok(result.issues.some(x=>x.code==="OUTPUT_BRANCH_LABEL_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("branch template differs from circuit",()=>{
 const {p,bom,board,articles,lookup}=fixture();
 p.branchDevices[0].templateId='UNKNOWN';
 const result=epCatalogOutputCrossViewV1(p,board,bom,lookup);
 assert.ok(result.issues.some(x=>x.code==="OUTPUT_BRANCH_TEMPLATE_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("missing BOM projection devices is detected",()=>{
 const {p,bom,board,articles,lookup}=fixture();
 delete bom.devices;
 const result=epCatalogOutputCrossViewV1(p,board,bom,lookup);
 assert.ok(result.issues.some(x=>x.code==="OUTPUT_BOM_DEVICE_MAP_UNAVAILABLE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("malformed BOM mapping row is detected",()=>{
 const {p,bom,board,articles,lookup}=fixture();
 bom.devices.push({id:null});
 const result=epCatalogOutputCrossViewV1(p,board,bom,lookup);
 assert.ok(result.issues.some(x=>x.code==="OUTPUT_BOM_DEVICE_INVALID"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("duplicate BOM device identity is detected",()=>{
 const {p,bom,board,articles,lookup}=fixture();
 bom.devices.push({...bom.devices[0]});
 const result=epCatalogOutputCrossViewV1(p,board,bom,lookup);
 assert.ok(result.issues.some(x=>x.code==="OUTPUT_BOM_DEVICE_DUPLICATE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("orphan BOM device is detected",()=>{
 const {p,bom,board,articles,lookup}=fixture();
 bom.devices.push({id:'UNKNOWN',kind:'branch',owner:'L1',sku:'MCB16'});
 const result=epCatalogOutputCrossViewV1(p,board,bom,lookup);
 assert.ok(result.issues.some(x=>x.code==="OUTPUT_BOM_DEVICE_ORPHAN"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("BOM owner does not match actual device",()=>{
 const {p,bom,board,articles,lookup}=fixture();
 bom.devices.find(x=>x.id==='BD1').owner='L2';
 const result=epCatalogOutputCrossViewV1(p,board,bom,lookup);
 assert.ok(result.issues.some(x=>x.code==="OUTPUT_BOM_OWNER_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("BOM device type does not match actual device",()=>{
 const {p,bom,board,articles,lookup}=fixture();
 bom.devices.find(x=>x.id==='BD1').kind='shared';
 const result=epCatalogOutputCrossViewV1(p,board,bom,lookup);
 assert.ok(result.issues.some(x=>x.code==="OUTPUT_BOM_KIND_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("BOM device selection does not match circuit",()=>{
 const {p,bom,board,articles,lookup}=fixture();
 bom.devices.find(x=>x.id==='BD1').sku='RCD40';
 const result=epCatalogOutputCrossViewV1(p,board,bom,lookup);
 assert.ok(result.issues.some(x=>x.code==="OUTPUT_BOM_SKU_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("missing BOM device record is detected",()=>{
 const {p,bom,board,articles,lookup}=fixture();
 bom.devices=bom.devices.filter(x=>x.id!=='BD1');
 const result=epCatalogOutputCrossViewV1(p,board,bom,lookup);
 assert.ok(result.issues.some(x=>x.code==="OUTPUT_BOM_DEVICE_MISSING"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("BOM expected apparatus count is stale",()=>{
 const {p,bom,board,articles,lookup}=fixture();
 bom.expectedDevices=99;
 const result=epCatalogOutputCrossViewV1(p,board,bom,lookup);
 assert.ok(result.issues.some(x=>x.code==="OUTPUT_BOM_EXPECTED_COUNT_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("BOM grouped total count is stale",()=>{
 const {p,bom,board,articles,lookup}=fixture();
 bom.totalCataloguedDevices=99;
 const result=epCatalogOutputCrossViewV1(p,board,bom,lookup);
 assert.ok(result.issues.some(x=>x.code==="OUTPUT_BOM_TOTAL_COUNT_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("BOM distinct SKU count is stale",()=>{
 const {p,bom,board,articles,lookup}=fixture();
 bom.distinctArticles=99;
 const result=epCatalogOutputCrossViewV1(p,board,bom,lookup);
 assert.ok(result.issues.some(x=>x.code==="OUTPUT_BOM_DISTINCT_COUNT_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("BOM article deleted from catalogue",()=>{
 const {p,bom,board,articles,lookup}=fixture();
 delete articles.MCB16;
 const result=epCatalogOutputCrossViewV1(p,board,bom,lookup);
 assert.ok(result.issues.some(x=>x.code==="OUTPUT_BOM_ARTICLE_UNRESOLVED"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("BOM manufacturer SKU is stale",()=>{
 const {p,bom,board,articles,lookup}=fixture();
 articles.MCB16.sku='NEW-16';
 const result=epCatalogOutputCrossViewV1(p,board,bom,lookup);
 assert.ok(result.issues.some(x=>x.code==="OUTPUT_BOM_MANUFACTURER_SKU_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("BOM maker stale",()=>{
 const {p,bom,board,articles,lookup}=fixture();
 articles.MCB16.maker='New maker';
 const result=epCatalogOutputCrossViewV1(p,board,bom,lookup);
 assert.ok(result.issues.some(x=>x.code==="OUTPUT_BOM_MAKER_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("BOM series stale",()=>{
 const {p,bom,board,articles,lookup}=fixture();
 articles.MCB16.series='New series';
 const result=epCatalogOutputCrossViewV1(p,board,bom,lookup);
 assert.ok(result.issues.some(x=>x.code==="OUTPUT_BOM_SERIES_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("BOM article label stale",()=>{
 const {p,bom,board,articles,lookup}=fixture();
 articles.MCB16.label='Updated';
 const result=epCatalogOutputCrossViewV1(p,board,bom,lookup);
 assert.ok(result.issues.some(x=>x.code==="OUTPUT_BOM_LABEL_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("BOM kind stale",()=>{
 const {p,bom,board,articles,lookup}=fixture();
 articles.MCB16.kind='RCBO';
 const result=epCatalogOutputCrossViewV1(p,board,bom,lookup);
 assert.ok(result.issues.some(x=>x.code==="OUTPUT_BOM_KIND_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("BOM DIN modules stale",()=>{
 const {p,bom,board,articles,lookup}=fixture();
 articles.MCB16.modules=2;
 const result=epCatalogOutputCrossViewV1(p,board,bom,lookup);
 assert.ok(result.issues.some(x=>x.code==="OUTPUT_BOM_MODULES_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("BOM article width stale",()=>{
 const {p,bom,board,articles,lookup}=fixture();
 articles.MCB16.widthMm=17;
 const result=epCatalogOutputCrossViewV1(p,board,bom,lookup);
 assert.ok(result.issues.some(x=>x.code==="OUTPUT_BOM_WIDTH_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("BOM datasheet source stale",()=>{
 const {p,bom,board,articles,lookup}=fixture();
 articles.MCB16.source='https://example.org/new';
 const result=epCatalogOutputCrossViewV1(p,board,bom,lookup);
 assert.ok(result.issues.some(x=>x.code==="OUTPUT_BOM_SOURCE_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});

'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {epDraftBoardPlanV1}=require('../draft-board-plan-v1');
const project=()=>({
 lines:[{id:'L1',modules:1,catalogSku:'A'},{id:'L2',modules:1,catalogSku:'B'}],
 branchDevices:[{id:'Q1',circuitId:'L1',modules:1,catalogSku:'A'},{id:'Q2',circuitId:'L2',modules:1,catalogSku:'B'}],
 sharedDevices:[],railCount:1,railCapacity:5,
 manualLayoutV1:[{deviceId:'Q1',railIndex:0,startModule:0}]
});
test('manual layout reserves catalogue width before placing other devices',()=>{
 const p=project();
 const report=epDraftBoardPlanV1(p,sku=>({modules:sku==='A'?3:1}));
 const q2=report.placements.find(x=>x.deviceId==='Q2');
 assert.ok(q2,'second device must remain placeable');
 assert.equal(q2.startModule,3,'must not overlap fixed three-module catalogue device');
 assert.ok(report.issues.some(x=>x.code==='CATALOG_WIDTH_CONFLICT'));
});
test('manual layout unchanged when catalogue width matches declaration',()=>{
 const p=project();p.lines[0].modules=3;p.branchDevices[0].modules=3;
 const report=epDraftBoardPlanV1(p,sku=>({modules:sku==='A'?3:1}));
 assert.equal(report.placements.find(x=>x.deviceId==='Q1').startModule,0);
 assert.equal(report.placements.find(x=>x.deviceId==='Q2').startModule,3);
 assert.ok(!report.issues.some(x=>x.code==='MANUAL_LAYOUT_OVERLAP'));
});
test('catalogue width expansion beyond rail is blocked',()=>{
 const p=project();
 const report=epDraftBoardPlanV1(p,sku=>({modules:sku==='A'?6:1}));
 assert.equal(report.status,'BLOCKED');
 assert.ok(report.issues.some(x=>x.code==='MANUAL_LAYOUT_OUT_OF_BOUNDS'));
});

test('manual and automatic apparatus share a single catalogue snapshot',()=>{
 const p=project();let calls=0;
 const report=epDraftBoardPlanV1(p,sku=>{
  if(sku==='A'){calls++;return {modules:calls===1?2:4};}
  return {modules:1};
 });
 assert.equal(calls,1);
 assert.equal(report.placements.find(x=>x.deviceId==='Q1').modules,2);
 assert.equal(report.placements.find(x=>x.deviceId==='Q2').startModule,2);
});
test('identical article shared by multiple devices is fetched only once',()=>{
 const p=project();p.lines[1].catalogSku='A';p.branchDevices[1].catalogSku='A';
 let calls=0;
 const report=epDraftBoardPlanV1(p,sku=>{calls++;return {modules:1};});
 assert.equal(calls,1);
 assert.equal(report.placements.length,2);
});
test('catalogue exception for a manually placed device is reported without repeated lookup',()=>{
 const p=project();let calls=0;
 const report=epDraftBoardPlanV1(p,sku=>{
  if(sku==='A'){calls++;throw Error('offline');}
  return {modules:1};
 });
 assert.equal(calls,1);
 assert.equal(report.status,'BLOCKED');
 assert.ok(report.issues.some(x=>x.code==='ARTICLE_LOOKUP_FAILED'));
});
test('catalogue records are read-only during board draft',()=>{
 const p=project();const before=JSON.stringify(p);
 const article=Object.freeze({modules:1,sku:'A'});
 epDraftBoardPlanV1(p,()=>article);
 assert.equal(JSON.stringify(p),before);
});

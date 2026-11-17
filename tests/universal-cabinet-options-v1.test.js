'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {epUniversalCabinetOptionsV1:plan}=require('../universal-cabinet-options-v1.js');
const base=()=>({lines:[{id:'L1',modules:8},{id:'L2',modules:8},{id:'L3',modules:4}]});
test('market capacity options use identical engineering device input',()=>{
 const p=base(),original=JSON.stringify(p),r=plan(p);
 assert.equal(r.status,'REVIEW_REQUIRED');assert.ok(r.options.length>=3);assert.equal(r.options[0].capacityModules,24);assert.ok(r.options.some(o=>o.id==='2x12'));
 for(const o of r.options){assert.equal(o.usedModules,20);assert.equal(o.unplaced.length,0);
  assert.ok(o.reserveModules>=4);assert.equal(o.engineeringApproved,false);}
 assert.equal(JSON.stringify(p),original);
});
test('never splits an individual multi-module appliance',()=>{
 const r=plan(base());
 for(const o of r.options)for(const rail of o.rails)for(const d of rail.devices){
  assert.ok(d.startModule+d.modules<=o.modulesPerRail);
  assert.equal(o.rails.flatMap(x=>x.devices).filter(x=>x.deviceId===d.deviceId).length,1);
 }
});
test('wide device blocks only alternatives that cannot contain it',()=>{
 const r=plan({lines:[{id:'L',modules:19}]});
 assert.ok(r.options.filter(o=>o.modulesPerRail<19).every(o=>o.status==='BLOCKED'));assert.ok(r.options.some(o=>o.status==='REVIEW_REQUIRED'));
});
test('source article dimension conflict blocks all recommendations',()=>{
 const r=plan({lines:[{id:'L',modules:1,catalogSku:'A'}]},()=>({article:'A',modules:2}));
 assert.equal(r.status,'BLOCKED');assert.deepEqual(r.options,[]);
});
test('manufacturer article depth missing remains explicitly unknown',()=>{
 const r=plan({lines:[{id:'L',modules:1,catalogSku:'A'}]},()=>({article:'A',modules:1}));
 assert.equal(r.options[0].envelope.preliminaryUsableDepthMm,null);
 assert.ok(r.options[0].issues.some(i=>i.code==='CABINET_DEPTH_UNKNOWN'));
});
test('confirmed depth gives preliminary usable interior depth only',()=>{
 const r=plan({lines:[{id:'L',modules:1,catalogSku:'A'}]},()=>({article:'A',modules:1,geometry:{depthMm:80}}));
 assert.equal(r.options[0].envelope.preliminaryUsableDepthMm,140);
 assert.equal(r.confirmedCabinetFit,false);
});
test('rejects invalid reserve and clearance settings',()=>{
 assert.equal(plan(base(),null,{reserveFraction:-1}).status,'BLOCKED');
 assert.equal(plan(base(),null,{sideAllowanceMm:NaN}).status,'BLOCKED');
 assert.equal(plan(base(),null,{fakeSetting:100}).status,'BLOCKED');
});
test('reject duplicate device identifiers and inconsistent branches',()=>{
 const p=base();p.sharedDevices=[{id:'L1',modules:1}];
 assert.equal(plan(p).status,'BLOCKED');
 const q=base();q.branchDevices=[{id:'B',circuitId:'L1',modules:8}];
 assert.equal(plan(q).status,'BLOCKED');
});
test('reserve uses allocated modules and never falsely promises minimum width of external enclosure',()=>{
 const r=plan(base());for(const o of r.options){
  assert.equal(o.reserveModules,o.allocatedModules-o.usedModules);
  assert.equal(o.envelope.basis,'ASSUMED_PLANNING_ALLOWANCES_NOT_MANUFACTURER_DIMENSIONS');
  assert.ok(o.envelope.preliminaryUsableWidthMm>=o.envelope.nominalDinSpanMm);
 }
});

test('five appliances select a six-place compact enclosure pattern',()=>{
 const r=plan({lines:Array.from({length:5},(_,i)=>({id:'L'+i,modules:1}))},{});
 assert.equal(r.status,'REVIEW_REQUIRED');assert.equal(r.options[0].capacityModules,6);
 assert.equal(r.options[0].reserveModules,1);
});
test('32 modules plus 10 percent reserve offers both 2x18 and 3x12',()=>{
 const r=plan({lines:Array.from({length:8},(_,i)=>({id:'L'+i,modules:4}))},null,{reserveFraction:.1});
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.options.some(o=>o.id==='2x18'));
 assert.ok(r.options.some(o=>o.id==='3x12'));
});
test('fragmentation never counts as a viable option',()=>{
 const r=plan({lines:Array.from({length:5},(_,i)=>({id:'L'+i,modules:7}))},null,{reserveFraction:0});
 const someBlocked=r.options.filter(o=>o.unplaced.length>0);
 assert.ok(someBlocked.length>0);assert.ok(someBlocked.every(o=>o.status==='BLOCKED'));
});

test('bound branch SKU takes precedence over line fallback',()=>{
 const p={lines:[{id:'L1',modules:2,catalogSku:'OLD'}],
  branchDevices:[{id:'B1',circuitId:'L1',modules:2,catalogSku:'ACTUAL'}]};
 const r=plan(p,id=>({article:id,modules:2,geometry:{depthMm:65}}));
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.options[0].rails[0].devices.some(d=>d.deviceId==='B1'&&d.article==='ACTUAL'));
});

test('exact search recovers an arrangement greedy-first-fit falsely rejects',()=>{
 const {epCabinetPackDevicesV1}=require('../universal-cabinet-options-v1.js');
 const widths=[2,2,2,3,5,6,9];
 const devices=widths.map((modules,i)=>({deviceId:'P'+i,modules,article:null}));
 const result=epCabinetPackDevicesV1(devices,3,10);
 assert.equal(result.status,'PACKED_EXACT');
 assert.deepEqual(result.unplaced,[]);
 assert.equal(result.rails.reduce((n,r)=>n+r.usedModules,0),29);
 assert.ok(result.rails.every(r=>r.usedModules<=10));
 for(const id of devices.map(x=>x.deviceId))
  assert.equal(result.rails.flatMap(r=>r.devices).filter(d=>d.deviceId===id).length,1);
});
test('bounded search never asserts impossibility after budget exhaustion',()=>{
 const {epCabinetPackDevicesV1}=require('../universal-cabinet-options-v1.js');
 const devices=[2,2,2,3,5,6,9].map((modules,i)=>({deviceId:'P'+i,modules}));
 const report=epCabinetPackDevicesV1(devices,3,10,1);
 assert.equal(report.status,'UNPROVEN');
});
test('exact packing is deterministic on repeated evaluation and does not mutate input',()=>{
 const {epCabinetPackDevicesV1}=require('../universal-cabinet-options-v1.js');
 const d=[2,2,2,3,5,6,9].map((modules,i)=>({deviceId:'P'+i,modules}));
 const before=JSON.stringify(d),one=epCabinetPackDevicesV1(d,3,10),two=epCabinetPackDevicesV1(d,3,10);
 assert.deepEqual(one,two);assert.equal(JSON.stringify(d),before);
});

test('real 36-module pattern is rescued when descending greedy packing fails',()=>{
 const widths=[2,2,2,3,7,8,11];
 const r=plan({lines:widths.map((modules,i)=>({id:'L'+i,modules}))},
  null,{reserveFraction:0});
 const shape=r.options.find(o=>o.id==='3x12');
 assert.ok(shape,'three rows of twelve are available');
 assert.equal(shape.status,'REVIEW_REQUIRED');
 assert.equal(shape.packingMethod,'PACKED_EXACT');
 assert.equal(shape.unplaced.length,0);
 assert.equal(shape.rails.flatMap(x=>x.devices).length,7);
});

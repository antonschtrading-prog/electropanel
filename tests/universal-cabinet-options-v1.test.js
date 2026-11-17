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

test('equal-capacity patterns have meaningful tall/wide orientation labels',()=>{
 const r=plan({lines:Array.from({length:8},(_,i)=>({id:'L'+i,modules:4}))},
  null,{reserveFraction:.1});
 const group=r.options.filter(x=>x.capacityModules===36);
 assert.equal(group.find(x=>x.id==='2x18').orientation,'WIDE');
 assert.equal(group.find(x=>x.id==='3x12').orientation,'TALL');
 assert.ok(r.options.every(x=>['ONLY','WIDE','TALL','BALANCED'].includes(x.orientation)));
});

test('per-row wiring corridor and terminal reservation are distinct transparent assumptions',()=>{
 const r=plan({lines:[{id:'A',modules:2}]},null,
  {wiringCorridorMm:50,terminalReserveMm:80,sideWiringCorridorMm:30});
 const a=r.options.find(o=>o.id==='1x4');
 assert.equal(a.envelope.preliminaryUsableHeightMm,430);
 assert.equal(a.envelope.spacePlan.apparatusBandHeightMm,100);
 assert.equal(a.envelope.spacePlan.rowZones[0].wiringCorridor.heightMm,50);
 assert.equal(a.envelope.spacePlan.rowZones[0].apparatusBand.yMm,150);
 assert.equal(a.envelope.spacePlan.sideWiringCorridorMm,30);
 assert.equal(a.envelope.spacePlan.source,'ASSUMED_NOT_MANUFACTURER_CAD');
 assert.ok(a.issues.some(i=>i.code==='TERMINAL_AND_CABLE_CORRIDORS_ASSUMED'));
});
test('reject wiring corridor wider than row pitch or side margin',()=>{
 assert.equal(plan(base(),null,{wiringCorridorMm:125}).status,'BLOCKED');
 assert.equal(plan(base(),null,{sideWiringCorridorMm:80}).status,'BLOCKED');
});

test('known body height exceeding preliminary mounting band blocks narrow-height assumption',()=>{
 const r=plan({lines:[{id:'L1',modules:1,catalogSku:'A'}]},
  ()=>({article:'A',modules:1,geometry:{heightMm:115,depthMm:80}}),
  {wiringCorridorMm:45});
 assert.equal(r.options[0].status,'BLOCKED');
 assert.ok(r.options[0].issues.some(x=>x.code==='CABINET_ASSUMED_MOUNTING_BAND_TOO_LOW'));
 assert.equal(r.options[0].envelope.spacePlan.tallestKnownBodyHeightMm,115);
 assert.equal(r.options[0].envelope.spacePlan.apparatusBandHeightMm,105);
});
test('unknown body heights stay UNKNOWN, not automatically approved or rejected',()=>{
 const r=plan({lines:[{id:'L1',modules:1}]});
 assert.equal(r.options[0].status,'REVIEW_REQUIRED');
 assert.equal(r.options[0].envelope.spacePlan.allBodyHeightsKnown,false);
 assert.ok(r.options[0].issues.some(x=>x.code==='CABINET_APPLIANCE_HEIGHT_PARTLY_UNKNOWN'));
});

test('candidate compaction reports only declared grouping-proximity counts',()=>{
 global.epCabinetConnectionProximityV1=require('../cabinet-connection-proximity-v1.js').epCabinetConnectionProximityV1;
 try {
  const project={lines:[{id:'L1',modules:1},{id:'L2',modules:1}],
   sharedDevices:[{id:'G1',modules:1,circuitIds:['L1','L2']}]};
  const r=plan(project);
  const o=r.options.find(x=>x.id==='1x4');
  assert.ok(o.connectionProximity);
  assert.equal(o.connectionProximity.sameRail,2);
  assert.equal(o.connectionProximity.crossRail,0);
  assert.equal(o.connectionProximity.unresolved,0);
 }finally{delete global.epCabinetConnectionProximityV1;}
});

test('all three routing and terminal allowances reject nonfinite and negative input',()=>{
 for(const field of ['wiringCorridorMm','terminalReserveMm','sideWiringCorridorMm']){
  for(const value of [NaN,Infinity,-Infinity,-1,'40',null]){
   assert.equal(plan(base(),null,{[field]:value}).status,'BLOCKED',field+':'+value);
  }
 }
});
test('non-array branch device input is rejected rather than silently ignored',()=>{
 assert.equal(plan({...base(),branchDevices:{} }).status,'BLOCKED');
 assert.equal(plan({...base(),branchDevices:'bad'}).status,'BLOCKED');
});
test('bounded packer rejects invalid rail dimensions and malformed device widths',()=>{
 const {epCabinetPackDevicesV1:pack}=require('../universal-cabinet-options-v1.js');
 const devices=[{deviceId:'L',modules:1}];
 for(const [rows,capacity] of [[0,12],[1,0],[-1,12],[1,201],[1,NaN],[1,1.5]])
  assert.equal(pack(devices,rows,capacity).status,'INVALID');
 for(const entries of [null,{},[{deviceId:'L',modules:NaN}],
  [{deviceId:'L',modules:-1}],[{deviceId:'',modules:1}]])
  assert.equal(pack(entries,1,12).status,'INVALID');
 for(const limit of [-1,NaN,Infinity,1.5])
  assert.equal(pack(devices,1,12,limit).status,'INVALID');
});
test('packing search exhaustion remains unproven, never falsely impossible',()=>{
 const {epCabinetPackDevicesV1:pack}=require('../universal-cabinet-options-v1.js');
 const devices=[2,2,2,3,5,6,9].map((modules,i)=>({deviceId:'D'+i,modules}));
 const r=pack(devices,3,10,0);
 assert.equal(r.status,'UNPROVEN');
 assert.ok(r.unplaced.length>0);
});
test('zero routing and terminal allowances are valid declared assumptions',()=>{
 const r=plan(base(),null,{wiringCorridorMm:0,terminalReserveMm:0,
  sideWiringCorridorMm:0});
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.equal(r.options[0].envelope.spacePlan.wiringCorridorPerRailMm,0);
 assert.equal(r.options[0].envelope.spacePlan.terminalReserveMm,0);
});

test('direct DIN packing rejects duplicate device IDs before assigning rails',()=>{
 const {epCabinetPackDevicesV1:pack}=require('../universal-cabinet-options-v1.js');
 const r=pack([{deviceId:'D1',modules:1},{deviceId:'D1',modules:2}],2,12);
 assert.equal(r.status,'INVALID');
 assert.deepEqual(r.rails,[]);
 assert.ok(r.issues.some(x=>x.code==='PACKING_INPUT_INVALID'));
});

test('selected body width larger than declared DIN slots blocks enclosure selection',()=>{
 const p={lines:[{id:'L',modules:1,catalogSku:'A'}]};
 const r=plan(p,()=>({article:'A',modules:1,widthMm:19,heightMm:85,depthMm:70}));
 assert.equal(r.status,'BLOCKED');
 assert.deepEqual(r.options,[]);
 assert.ok(r.issues.some(x=>x.code==='ARTICLE_BODY_EXCEEDS_NOMINAL_DIN_SLOT'));
});
test('body envelope dimensions must be positive finite numbers when supplied',()=>{
 const p={lines:[{id:'L',modules:1,catalogSku:'A'}]};
 for(const key of ['widthMm','heightMm','depthMm']){
  for(const value of [NaN,Infinity,-1,0,'85']){
   const r=plan(p,()=>({article:'A',modules:1,[key]:value}));
   assert.equal(r.status,'BLOCKED',key+':'+value);
   assert.equal(r.options.length,0);
  }
 }
});
test('body width exactly equal to nominal DIN slots remains a preliminary option',()=>{
 const r=plan({lines:[{id:'L',modules:2,catalogSku:'A'}]},
  ()=>({article:'A',modules:2,widthMm:36,heightMm:85,depthMm:70}));
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.ok(r.options.some(o=>o.status==='REVIEW_REQUIRED'));
 assert.equal(r.confirmedCabinetFit,false);
});
test('orphan branch devices and duplicate branch identifiers block candidate generation',()=>{
 const p={lines:[{id:'L1',modules:1}],branchDevices:[
  {id:'B1',circuitId:'L1',modules:1},{id:'B2',circuitId:'OTHER',modules:1}]};
 const a=plan(p);
 assert.equal(a.status,'BLOCKED');
 assert.ok(a.issues.some(x=>x.code==='BRANCH_ORPHAN_OR_INVALID'));
 const b=plan({lines:[{id:'L1',modules:1},{id:'L2',modules:1}],
  branchDevices:[{id:'B',circuitId:'L1',modules:1},{id:'B',circuitId:'L2',modules:1}]});
 assert.equal(b.status,'BLOCKED');
 assert.ok(b.issues.some(x=>x.code==='BRANCH_ID_INVALID_OR_DUPLICATE'));
});
test('invalid branch collection sizes are rejected at input boundary',()=>{
 const p={lines:[{id:'L1',modules:1}],branchDevices:Array(501).fill(null)};
 assert.equal(plan(p).status,'BLOCKED');
});

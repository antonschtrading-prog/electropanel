'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
global.epGroupSplitRulesV1=require('../consumer-group-split-v1.js').epGroupSplitRulesV1;
global.epGroupSplitAllowedV1=require('../consumer-group-split-v1.js').epGroupSplitAllowedV1;
const {epGroupMergeRulesV1:rules,epGroupMergePlanV1:plan,
 epGroupMergeApplyV1:apply,epGroupMergeHtmlV1:html}=require('../consumer-group-merge-v1.js');
const project=()=>({schema:'electropanel.web.preview.2',title:'Commercial office',
 railCount:2,railCapacity:12,
 lines:[{id:'L1',name:'Desk A',phase:'L1',power:2,device:'',modules:1},
 {id:'L2',name:'Desk B',phase:'L1',power:3,device:'',modules:1},
 {id:'L3',name:'Lighting',phase:'L2',power:1,device:'',modules:1}],
 loads:[{id:'LD1',circuitId:'L1',name:'Desk A',powerKw:2},
 {id:'LD2',circuitId:'L2',name:'Desk B',powerKw:3},
 {id:'LD3',circuitId:'L3',name:'Light',powerKw:1}],
 branchDevices:[{id:'B1',circuitId:'L1',modules:1},
 {id:'B2',circuitId:'L2',modules:1},{id:'B3',circuitId:'L3',modules:1}],
 sharedDevices:[]});
const options=()=>({maxGroupPowerKw:6,categories:[{circuitId:'L1',category:'Sockets'},
 {circuitId:'L2',category:'Sockets'}]});
test('explicit same-category same-phase whole-circuit merge preview does not modify project',()=>{
 const p=project(),before=JSON.stringify(p),r=plan(p,options());
 assert.equal(r.status,'DRAFT');assert.equal(r.proposals.length,1);
 assert.equal(r.proposals[0].targetCircuitId,'L1');
 assert.deepEqual(r.proposals[0].sourceCircuitIds,['L2']);
 assert.deepEqual(r.proposals[0].consumerIds,['LD1','LD2']);
 assert.equal(r.proposals[0].totalKw,5);
 assert.equal(JSON.stringify(p),before);
 assert.equal(r.engineeringApproved,false);
});
test('apply preserves all consumers and original target, removes only source draft circuit',()=>{
 const p=project(),preview=plan(p,options()),before=JSON.stringify(p);
 const r=apply(p,preview);
 assert.equal(r.status,'APPLIED');assert.equal(r.merged,1);
 assert.deepEqual(r.removedCircuits,['L2']);
 assert.deepEqual(r.project.lines.map(x=>x.id),['L1','L3']);
 assert.deepEqual(r.project.loads.map(x=>x.id),['LD1','LD2','LD3']);
 assert.equal(r.project.loads[1].circuitId,'L1');
 assert.equal(r.project.lines[0].power,5);
 assert.deepEqual(r.project.branchDevices.map(x=>x.circuitId),['L1','L3']);
 assert.equal(r.project.consumerGroupMergeRulesV1.categories.length,1);
 assert.equal(JSON.stringify(p),before);
});
test('similar labels never trigger grouping absent explicitly declared categories',()=>{
 const p=project();p.lines[1].name=p.lines[0].name;
 const r=plan(p,{maxGroupPowerKw:6,categories:[]});
 assert.equal(r.proposals.length,0);
});
test('same category mixed phases cannot be combined or silently phase corrected',()=>{
 const p=project();p.lines[1].phase='L2';
 const r=plan(p,options());
 assert.equal(r.proposals.length,0);
 assert.ok(r.issues.some(x=>x.code==='GROUP_MERGE_CATEGORY_MIXED_PHASE'));
});
test('power and consumer-count caps are independently enforced',()=>{
 const p=project();
 assert.equal(plan(p,{...options(),maxGroupPowerKw:4}).proposals.length,0);
 assert.equal(plan(p,{...options(),maxConsumersPerCircuit:1}).proposals.length,0);
 assert.equal(plan(p,{...options(),maxConsumersPerCircuit:2}).proposals.length,1);
});
test('manual protective selection and declared current bar merging',()=>{
 for(const change of [p=>p.lines[1].catalogSku='ABC',
  p=>p.lines[1].overloadInput={ibA:14},
  p=>p.lines[1].loadCurrentCalculation={roundedIbA:10},
  p=>p.lines[1].device='C16',
  p=>p.lines[1].faultInput={ikKa:4},
  p=>p.lines[1].route44Input={route_length_m:20},
  p=>p.lines[1].calculationReview={required:true}]){
  const p=project();change(p);
  const r=plan(p,options());
  assert.equal(r.proposals.length,0);
  assert.ok(r.issues.some(x=>x.code.startsWith('GROUP_MERGE_GROUP_SPLIT_')));
 }
});
test('shared RCD, conductor and terminal models must never be silently rewritten',()=>{
 for(const change of [p=>p.sharedDevices=[{id:'R1',circuitIds:['L1']}],
  p=>p.feedLinks=[{circuitId:'L2'}],
  p=>p.conductorRoutes=[{circuitId:'L1'}],
  p=>p.terminalLinks=[{circuitId:'L2'}],
  p=>p.boardBindingsV1=[{boardDeviceId:'B2',modelDeviceId:'D1'}],
  p=>p.deviceSupplyV1={links:[{from:'SOURCE:MAIN',to:'BRANCH:B1'}]},
  p=>p.protectionLinks=[{upstreamLineId:'L1',downstreamLineId:'L3'}]]){
  const p=project();change(p);
  const r=plan(p,options());
  assert.equal(r.proposals.length,0);
 }
});
test('corrected power or reassigned consumer invalidates proposed merger',()=>{
 for(const change of [p=>p.loads[0].powerKw=1,
  p=>p.loads[1].circuitId='L3',
  p=>p.lines[0].overloadInput={ibA:8}]){
  const p=project(),snapshot=plan(p,options());change(p);
  assert.throws(()=>apply(p,snapshot),/GROUP_MERGE_PLAN_STALE/);
 }
});
test('forged extra proposal, new target and forged approval flag are never accepted',()=>{
 const p=project(),base=plan(p,options());
 for(const change of [
  q=>q.proposals[0].targetCircuitId='L3',
  q=>q.proposals[0].totalKw=2,
  q=>q.proposals[0].applied=true]){
  const q=structuredClone(base);change(q);
  assert.throws(()=>apply(p,q),/GROUP_MERGE_PLAN_STALE/);
 }
});
test('conflict between summed consumer kW and stated line power blocks merge',()=>{
 const p=project();p.lines[0].power=5;
 const r=plan(p,options());
 assert.equal(r.status,'BLOCKED');
 assert.ok(r.issues.some(x=>x.code==='GROUP_MERGE_CIRCUIT_POWER_CONFLICT'));
});
test('unknown category line is rejected and no source mutation occurs',()=>{
 const p=project(),before=JSON.stringify(p),opts=options();
 opts.categories.push({circuitId:'NOT_FOUND',category:'Sockets'});
 const r=plan(p,opts);
 assert.equal(r.status,'BLOCKED');
 assert.equal(r.proposals.length,1);
 assert.throws(()=>apply(p,r),/GROUP_MERGE_PLAN_STALE/);
 assert.equal(JSON.stringify(p),before);
});
test('empty and duplicate category declarations, tags and extra fields rejected',()=>{
 for(const bad of [{...options(),categories:[{circuitId:'L1',category:'A'},{circuitId:'L1',category:'A'}]},
  {...options(),categories:[{circuitId:'L1',category:''}]},
  {...options(),categories:[{circuitId:'L1',category:'A',approved:true}]},
  {...options(),categories:[{circuitId:'L1',category:'<script>'}]},
  {...options(),engineeringApproved:true},
  {...options(),maxGroupPowerKw:0}]){
  assert.throws(()=>rules(bad),/GROUP_MERGE_|GROUP_SPLIT_/);
 }
});
test('HTML always escapes submitted category, line and consumer text',()=>{
 const r=plan(project(),options());
 r.proposals[0].category='<img src=x onerror=1>';
 const h=html(r);
 assert.ok(h.includes('&lt;img'));
 assert.ok(!h.includes('<img src=x onerror=1>'));
 assert.match(h,/groupMergePreviewBtn/);
 assert.match(h,/groupMergeApplyBtn/);
});
test('no available merge disables mutation control',()=>{
 const r=plan(project(),{maxGroupPowerKw:2,categories:options().categories});
 assert.equal(r.proposals.length,0);
 assert.match(html(r),/id="groupMergeApplyBtn" disabled/);
});

test('engineer-declared dedicated circuit never merges with another eligible category peer',()=>{
 const p=project();
 const protectedRules={...options(),separateCircuitIds:['L2']};
 const r=plan(p,protectedRules);
 assert.equal(r.proposals.length,0);
 assert.ok(r.issues.some(x=>x.code==='GROUP_MERGE_DEDICATED_LINE_EXCLUDED'));
 assert.equal(rules(protectedRules).separateCircuitIds[0],'L2');
 const htmlText=html(r);
 assert.ok(htmlText.includes('groupMergeSeparateIds'));
});
test('orphan dedicated ID blocks and cannot be applied silently',()=>{
 const p=project();
 const r=plan(p,{...options(),separateCircuitIds:['UNKNOWN']});
 assert.equal(r.status,'BLOCKED');
 assert.ok(r.issues.some(x=>x.code==='GROUP_MERGE_SEPARATE_CIRCUIT_ORPHAN'));
 assert.throws(()=>apply(p,r),/GROUP_MERGE_PLAN_STALE/);
});
test('duplicate or forged exclusion IDs are invalid',()=>{
 for(const data of [
  {...options(),separateCircuitIds:['L2','L2']},
  {...options(),separateCircuitIds:['L2',5]},
  {...options(),separateCircuitIds:'L2'},
  {...options(),separateCircuitIds:Array(401).fill('L2')}
 ]){
  assert.throws(()=>rules(data),/GROUP_MERGE_SEPARATE_IDS_INVALID/);
 }
});
test('exclusion added after preview rejects stale merger even with same grouping category',()=>{
 const p=project(),preview=plan(p,options());
 preview.rules={...preview.rules,separateCircuitIds:['L2']};
 assert.throws(()=>apply(p,preview),/GROUP_MERGE_PLAN_STALE/);
});

test('independent DIN article placement prevents deleting an already placed apparatus',()=>{
 for(const id of ['B1','B2']){
  const p=project();p.dinPlacementsV1=[{deviceId:id,article:'ABCD',modules:1}];
  const r=plan(p,options());
  assert.equal(r.proposals.length,0);
  assert.ok(r.issues.some(x=>x.code==='GROUP_MERGE_DIN_ARTICLE_PLACEMENT_LINKED'));
 }
});
test('large 400-line project preserves one-to-one consumer ownership in immutable preview',()=>{
 const p=project();p.lines=p.lines.slice(0,2);p.loads=p.loads.slice(0,2);
 p.branchDevices=p.branchDevices.slice(0,2);
 for(let i=4;i<=401;i++){
  const id='L'+i;
  p.lines.push({id,phase:'L3',power:1,modules:1,device:''});
  p.loads.push({id:'LD'+i,circuitId:id,powerKw:1});
  p.branchDevices.push({id:'B'+i,circuitId:id,modules:1});
 }
 const before=JSON.stringify(p),r=plan(p,options());
 assert.equal(p.lines.length,400);
 assert.equal(r.proposals.length,1);
 assert.equal(JSON.stringify(p),before);
 assert.equal(r.engineeringApproved,false);
});

test('corrupt optional placement or branch data blocks grouping without throwing',()=>{
 for(const mutation of [
  p=>p.branchDevices={bad:1},
  p=>p.dinPlacementsV1={bad:1},
  p=>p.manualLayoutV1={bad:1},
  p=>p.feedLinks={bad:1},
  p=>p.conductorRoutes={bad:1}
 ]){
  const p=project();mutation(p);
  const report=plan(p,options());
  assert.equal(report.status,'BLOCKED');
  assert.ok(report.issues.some(x=>x.code==='GROUP_MERGE_PROJECT_INVALID'));
  assert.equal(report.proposals.length,0);
 }
});

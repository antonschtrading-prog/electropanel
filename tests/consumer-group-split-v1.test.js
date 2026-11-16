'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {epGroupSplitPlanV1:plan,epGroupSplitApplyV1:apply,epGroupSplitRulesV1:rules,
 epGroupSplitHtmlV1:html}=require('../consumer-group-split-v1.js');
const project=()=>({lines:[{id:'L1',name:'Sockets',phase:'L1',power:8,
 modules:1,device:''}],loads:[
 {id:'LD1',circuitId:'L1',name:'Desk 1',powerKw:3},
 {id:'LD2',circuitId:'L1',name:'Desk 2',powerKw:3},
 {id:'LD3',circuitId:'L1',name:'Desk 3',powerKw:2}],
 sharedDevices:[],branchDevices:[{id:'BD1',circuitId:'L1',modules:1}]});
test('explicit power rule deterministically previews existing group split without mutation',()=>{
 const p=project(),old=JSON.stringify(p);
 const r=plan(p,{maxGroupPowerKw:5});
 assert.equal(r.proposals.length,1);assert.equal(r.proposals[0].groups.length,2);
 assert.deepEqual(r.proposals[0].groups.map(x=>x.connectedKw),[5,3]);
 assert.equal(JSON.stringify(p),old);assert.equal(r.engineeringApproved,false);
});
test('approved preview adds one group and preserves individual consumer identities and powers',()=>{
 const p=project(),old=JSON.stringify(p),proposal=plan(p,{maxGroupPowerKw:5});
 const r=apply(p,proposal);
 assert.equal(r.createdCircuits.length,1);assert.equal(r.applied,1);
 assert.equal(r.project.lines.length,2);
 assert.equal(r.project.loads.length,3);
 assert.deepEqual(r.project.lines.map(l=>l.power),[5,3]);
 assert.deepEqual(r.project.loads.map(l=>l.id),['LD1','LD2','LD3']);
 assert.equal(r.project.lines[1].catalogSku,undefined);
 assert.equal(r.project.lines[1].phase,'L1');
 assert.equal(r.project.lines[1].modules,1);
 assert.equal(JSON.stringify(p),old);
});
test('new IDs skip existing valid L numbers with no duplicate circuits',()=>{
 const p=project();p.lines.push({id:'L2',phase:'L2',power:null,modules:1});
 const r=apply(p,plan(p,{maxGroupPowerKw:5}));
 assert.ok(r.createdCircuits.includes('L3'));
 assert.equal(new Set(r.project.lines.map(x=>x.id)).size,3);
});
test('selected apparatus or any previous load current prevents automatic reassignment',()=>{
 for(const property of [
  ['catalogSku','SKU'],['overloadInput',{ibA:14}],['loadCurrentCalculation',{stale:false}],
  ['device','C16'],['faultInput',{ikKa:4}],['route44Input',{route_length_m:10}]]){
  const p=project();p.lines[0][property[0]]=property[1];
  const r=plan(p,{maxGroupPowerKw:5});
  assert.equal(r.proposals.length,0);
  assert.ok(r.issues.some(x=>x.code.startsWith('GROUP_SPLIT_')));
 }
});
test('shared RCD membership never silently changes on group split',()=>{
 const p=project();p.sharedDevices.push({id:'R1',circuitIds:['L1']});
 const r=plan(p,{maxGroupPowerKw:5});
 assert.equal(r.proposals.length,0);
 assert.ok(r.issues.some(x=>x.code==='GROUP_SPLIT_SHARED_DEVICE_REVIEW_REQUIRED'));
});
test('declared supply, feed or terminal routing makes group ineligible',()=>{
 for(const mutation of [
  p=>p.feedLinks=[{circuitId:'L1'}],
  p=>p.conductorRoutes=[{circuitId:'L1'}],
  p=>p.terminalLinks=[{circuitId:'L1'}],
  p=>p.deviceSupplyV1={links:[{from:'SOURCE:MAIN',to:'BRANCH:BD1'}]}
 ]){
  const p=project();mutation(p);
  const r=plan(p,{maxGroupPowerKw:5});assert.equal(r.proposals.length,0);
 }
});
test('a single consumer exceeding maximum stays intact and requires an engineering decision',()=>{
 const p=project(),r=plan(p,{maxGroupPowerKw:1});
 assert.equal(r.proposals.length,0);
 assert.ok(r.issues.some(x=>x.code==='GROUP_SPLIT_INDIVIDUAL_CONSUMER_OVER_LIMIT'));
});
test('changed consumer power or membership invalidates preview instead of moving wrong consumer',()=>{
 const p=project(),r=plan(p,{maxGroupPowerKw:5});
 p.loads[0].powerKw=4;
 assert.throws(()=>apply(p,r),/GROUP_SPLIT_PLAN_STALE/);
});
test('rules are explicit finite positive kw and never infer missing data',()=>{
 for(const x of [null,{},[],{maxGroupPowerKw:0},{maxGroupPowerKw:-2},
  {maxGroupPowerKw:'NaN'},{maxGroupPowerKw:5,verified:true}]){
  assert.throws(()=>rules(x),/GROUP_SPLIT_/);
 }
 assert.equal(rules({maxGroupPowerKw:'5,5'}).maxGroupPowerKw,5.5);
});
test('preview HTML is escaped and apply action is disabled when no eligible group exists',()=>{
 const p=project(),r=plan(p,{maxGroupPowerKw:5});
 r.proposals[0].circuitId='<img src=x onerror=alert(1)>';
 const h=html(r);assert.ok(h.includes('&lt;img'));
 assert.ok(!h.includes('<img src=x onerror=alert(1)>'));
 const idle=html(plan(project(),{maxGroupPowerKw:10}));
 assert.match(idle,/id="groupSplitApplyBtn" disabled/);
});
test('more than 400 circuit cap blocks applying proposal with no source mutation',()=>{
 const p=project();
 for(let i=2;i<=400;i++)p.lines.push({id:'L'+i,phase:'L2',modules:1,power:null});
 const r=plan(p,{maxGroupPowerKw:5});
 assert.throws(()=>apply(p,r),/GROUP_SPLIT_CIRCUIT_LIMIT/);
});
test('unassigned consumer and duplicate IDs fail closed before producing any split',()=>{
 const p=project();p.loads.push({id:'LD1',circuitId:'L1',powerKw:1});
 assert.equal(plan(p,{maxGroupPowerKw:5}).status,'BLOCKED');
});

test('apparatus-model binding and fault-current evidences prevent unsafe regrouping',()=>{
 for(const mutate of [
  p=>p.boardBindingsV1=[{boardDeviceId:'BD1',modelDeviceId:'MODEL1'}],
  p=>p.deviceFaultScenariosV1=[{deviceNodeId:'BRANCH:BD1'}],
  p=>p.calculatedDeviceFaultBindingsV1=[{deviceNodeId:'BRANCH:BD1'}],
  p=>p.deviceCoordinationEvidenceV1=[{from:'BRANCH:BD1',to:'BRANCH:B2'}]
 ]){
  const p=project();mutate(p);
  const r=plan(p,{maxGroupPowerKw:5});
  assert.equal(r.proposals.length,0);
  assert.ok(r.issues.some(x=>x.code==='GROUP_SPLIT_DESIGN_EVIDENCE_LINKED'));
 }
});
test('changing only unsplit line assignments after preview invalidates plan when its membership changes',()=>{
 const p=project(),preview=plan(p,{maxGroupPowerKw:5});
 p.loads[2].circuitId='L9';
 assert.throws(()=>apply(p,preview),/GROUP_SPLIT_PLAN_STALE/);
});

test('generated branch IDs never collide with consumer IDs or common apparatus IDs',()=>{
 const p=project();p.loads[1].id='L2';p.sharedDevices.push({id:'L3',circuitIds:[]});
 const r=apply(p,plan(p,{maxGroupPowerKw:5}));
 assert.equal(r.createdCircuits.length,1);
 assert.equal(r.createdCircuits[0],'L4');
 const ids=[...r.project.lines.map(x=>x.id),...r.project.loads.map(x=>x.id),
  ...r.project.sharedDevices.map(x=>x.id)];
 assert.equal(new Set(ids).size,ids.length);
});

test('optional count limit can split groups even when connected kW stays below limit',()=>{
 const p=project(),r=plan(p,{maxGroupPowerKw:20,maxConsumersPerCircuit:2});
 assert.equal(r.proposals.length,1);
 assert.equal(r.proposals[0].groups.length,2);
 assert.ok(r.proposals[0].groups.every(x=>x.consumerIds.length<=2));
 const accepted=apply(p,r);
 assert.equal(accepted.project.lines.length,2);
});
test('strict count rules reject fractional and oversized entries',()=>{
 for(const count of [-1,0,2.4,'2.5',1001,'bad',false]){
  assert.throws(()=>rules({maxGroupPowerKw:10,maxConsumersPerCircuit:count}),/GROUP_SPLIT_MAX_CONSUMERS_INVALID/);
 }
 assert.equal(rules({maxGroupPowerKw:10,maxConsumersPerCircuit:'3'}).maxConsumersPerCircuit,3);
 assert.deepEqual(rules({maxGroupPowerKw:10,maxConsumersPerCircuit:''}),{maxGroupPowerKw:10});
});
test('changing consumer limit between preview and apply invalidates proposal',()=>{
 const p=project(),r=plan(p,{maxGroupPowerKw:10,maxConsumersPerCircuit:1});
 r.rules={maxGroupPowerKw:10,maxConsumersPerCircuit:2};
 assert.throws(()=>apply(p,r),/GROUP_SPLIT_PLAN_STALE/);
});

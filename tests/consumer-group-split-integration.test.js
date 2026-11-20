'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const group=require('../consumer-group-split-v1.js');
global.epGroupSplitRulesV1=group.epGroupSplitRulesV1;
global.epGroupSplitPlanV1=group.epGroupSplitPlanV1;
global.epEngineeringIssueRegisterV1=require('../engineering-issue-register-v1.js').epEngineeringIssueRegisterV1;
const {epRestoreProjectExtensionsV2:restore}=require('../project-state-v2.js');
const {epEngineeringBundleV1:bundle}=require('../engineering-bundle-v1.js');
const {epEngineeringPrintV1:print}=require('../engineering-print-v1.js');
const project=()=>({schema:'electropanel.web.preview.2',title:'Office design',
 railCapacity:12,railCount:2,lines:[{id:'L1',name:'Sockets',phase:'L1',
 power:8,modules:1,device:''}],loads:[
 {id:'LD1',name:'Desk 1',circuitId:'L1',powerKw:3},
 {id:'LD2',name:'Desk 2',circuitId:'L1',powerKw:3},
 {id:'LD3',name:'Desk 3',circuitId:'L1',powerKw:2}],
 branchDevices:[{id:'BD1',circuitId:'L1',modules:1}],sharedDevices:[]});
test('grouping is optional in existing project without engineer rules',()=>{
 const p=project(),b=bundle(p,()=>null);
 assert.equal(b.sections.consumerGrouping.status,'NOT_REQUIRED');
 assert.equal(b.sections.consumerGrouping.proposals.length,0);
 assert.equal(b.sections.consumerGrouping.engineeringApproved,false);
 assert.equal(b.ready_for_installation,false);
});
test('explicit saved grouping rule is restored and its suggestions are included in engineering print',()=>{
 const p=project(),proposal=group.epGroupSplitPlanV1(p,{maxGroupPowerKw:5});
 const applied=group.epGroupSplitApplyV1(p,proposal),raw=applied.project;
 raw.consumerGroupSplitRulesV1={maxGroupPowerKw:5};
 const loaded=JSON.parse(JSON.stringify(raw));
 delete loaded.consumerGroupSplitRulesV1;
 restore(raw,loaded);
 assert.deepEqual(loaded.consumerGroupSplitRulesV1,{maxGroupPowerKw:5});
 assert.equal(loaded.lines.length,2);
 assert.equal(loaded.loads.length,3);
 const b=bundle(loaded,()=>null);
 assert.equal(b.sections.consumerGrouping.status,'DRAFT');
 assert.equal(b.sections.consumerGrouping.proposals.length,0);
 assert.match(print(b),/Предварительное разбиение потребителей по введённому пределу/);
 assert.equal(b.sections.consumerGrouping.engineeringApproved,false);
});
test('rule entered into a project is only a plan, never a hidden project edit',()=>{
 const p=project();p.consumerGroupSplitRulesV1={maxGroupPowerKw:5};
 const before=JSON.stringify(p),b=bundle(p,()=>null);
 assert.equal(b.sections.consumerGrouping.proposals.length,1);
 assert.equal(b.sections.consumerGrouping.proposals[0].groups.length,2);
 assert.equal(JSON.stringify(p),before);
});
test('corrupted grouping rules cannot be imported or silently broaden scope',()=>{
 for(const data of [
  {maxGroupPowerKw:0},
  {maxGroupPowerKw:'bad'},
  {maxGroupPowerKw:5,engineeringApproved:true},
  {maxGroupPowerKw:5,sourceVerified:true},
  []]){
  const p=project();
  assert.throws(()=>restore({...p,consumerGroupSplitRulesV1:data},project()),/GROUP_SPLIT_/);
 }
});

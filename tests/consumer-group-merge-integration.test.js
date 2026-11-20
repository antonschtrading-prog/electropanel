'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const split=require('../consumer-group-split-v1.js');
const merge=require('../consumer-group-merge-v1.js');
global.epGroupSplitRulesV1=split.epGroupSplitRulesV1;
global.epGroupSplitAllowedV1=split.epGroupSplitAllowedV1;
global.epGroupMergeRulesV1=merge.epGroupMergeRulesV1;
global.epGroupMergePlanV1=merge.epGroupMergePlanV1;
global.epEngineeringIssueRegisterV1=require('../engineering-issue-register-v1.js').epEngineeringIssueRegisterV1;
const {epRestoreProjectExtensionsV2:restore}=require('../project-state-v2.js');
const {epEngineeringBundleV1:bundle}=require('../engineering-bundle-v1.js');
const {epEngineeringPrintV1:print}=require('../engineering-print-v1.js');
const project=()=>({schema:'electropanel.web.preview.2',title:'Office grouping',earthing:'TN-S',
 railCount:1,railCapacity:12,lines:[
  {id:'L1',name:'Desk A',phase:'L1',power:2,modules:1,device:''},
  {id:'L2',name:'Desk B',phase:'L1',power:3,modules:1,device:''}],
 loads:[{id:'LD1',name:'Desk 1',powerKw:2,circuitId:'L1'},
 {id:'LD2',name:'Desk 2',powerKw:3,circuitId:'L2'}],
 branchDevices:[{id:'B1',circuitId:'L1',modules:1},
 {id:'B2',circuitId:'L2',modules:1}],sharedDevices:[]});
const rules=()=>({maxGroupPowerKw:6,categories:[
 {circuitId:'L1',category:'Office sockets'},
 {circuitId:'L2',category:'Office sockets'}]});
test('legacy projects do not demand category grouping and generate no phantom category data',()=>{
 const p=project(),b=bundle(p,()=>null);
 assert.equal(b.sections.consumerMerge.status,'NOT_REQUIRED');
 assert.equal(b.sections.consumerMerge.proposals.length,0);
 assert.equal(b.sections.consumerMerge.engineeringApproved,false);
 assert.equal(p.consumerGroupMergeRulesV1,undefined);
});
test('saved explicit grouping rules survive import and flow through common dossier/print',()=>{
 const raw=project();raw.consumerGroupMergeRulesV1=rules();
 const target=project(),before=JSON.stringify(raw);
 restore(raw,target);
 assert.deepEqual(target.consumerGroupMergeRulesV1,rules());
 const dossier=bundle(target,()=>null);
 assert.equal(dossier.sections.consumerMerge.proposals.length,1);
 assert.equal(dossier.sections.consumerMerge.proposals[0].targetCircuitId,'L1');
 assert.match(print(dossier),/Предложение объединения черновых цепей по категориям инженера/);
 assert.equal(dossier.ready_for_installation,false);
 assert.equal(JSON.stringify(raw),before);
});
test('accepted merge rekeys load grouping and saves only currently existing category mappings',()=>{
 const raw=project(),accepted=merge.epGroupMergeApplyV1(raw,merge.epGroupMergePlanV1(raw,rules()));
 const loaded=project();
 loaded.lines=JSON.parse(JSON.stringify(accepted.project.lines));
 loaded.loads=JSON.parse(JSON.stringify(accepted.project.loads));
 loaded.branchDevices=JSON.parse(JSON.stringify(accepted.project.branchDevices));
 restore(accepted.project,loaded);
 assert.deepEqual(loaded.consumerGroupMergeRulesV1.categories,[{circuitId:'L1',category:'Office sockets'}]);
 assert.equal(loaded.loads[1].circuitId,'L1');
 assert.equal(bundle(loaded,()=>null).sections.consumerMerge.proposals.length,0);
 assert.equal(loaded.lines.length,1);
});
test('foreign approval metadata, forged categories or impossible limit are rejected on import',()=>{
 for(const field of [
  {...rules(),engineeringApproved:true},
  {...rules(),categories:[{circuitId:'L1',category:'A',verified:true}]},
  {...rules(),categories:[{circuitId:'L1',category:'A'},{circuitId:'L1',category:'B'}]},
  {...rules(),maxGroupPowerKw:-5}
 ]){
  assert.throws(()=>restore({...project(),consumerGroupMergeRulesV1:field},project()),/GROUP_MERGE_|GROUP_SPLIT_/);
 }
});
test('merge not mandatory when user has only grouping split options',()=>{
 const p=project();p.consumerGroupSplitRulesV1={maxGroupPowerKw:4};
 const result=bundle(p,()=>null);
 assert.equal(result.sections.consumerMerge.status,'NOT_REQUIRED');
});

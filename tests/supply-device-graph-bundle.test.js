'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
global.epSupplyDeviceGraphV1=require('../supply-device-graph-v1.js').epSupplyDeviceGraphV1;
global.epEngineeringIssueRegisterV1=require('../engineering-issue-register-v1.js').epEngineeringIssueRegisterV1;
const {epEngineeringBundleV1:bundle}=require('../engineering-bundle-v1.js');
const {epEngineeringPrintV1:print}=require('../engineering-print-v1.js');
const p=()=>({title:'Power structure',lines:[{id:'L1',phase:'L1'}],sharedDevices:[],
 branchModelVersion:1,branchDevices:[{id:'BD-L1',circuitId:'L1'}],
 feedLinks:[{id:'F:L1:L1',circuitId:'L1',kind:'L1',from:'SOURCE:MAIN/L1',to:'BRANCH:BD-L1/IN-L1',origin:'explicit-feed-declaration'},
 {id:'F:L1:N',circuitId:'L1',kind:'N',from:'SOURCE:MAIN/N',to:'BUS:N_MAIN/N',origin:'explicit-feed-declaration'}],
 groupInputLinks:[]});
test('all projections share symbolic feed graph and never certify continuity',()=>{
 const project=p(),original=JSON.stringify(project),b=bundle(project,()=>null),g=b.sections.supplyDeviceGraph;
 assert.equal(g.edges.length,2);assert.equal(g.physicalContinuity,'NOT_VERIFIED');
 assert.equal(b.statuses.supplyDeviceGraph,'UNKNOWN');
 const h=print(b);assert.match(h,/Декларативная модель источника/);
 assert.match(h,/BRANCH:BD-L1/);assert.match(h,/NOT_VERIFIED/);
 assert.equal(JSON.stringify(project),original);
});
test('feed discrepancy blocks graph section and surfaces in issue register',()=>{
 const project=p();project.feedLinks[0].to='BRANCH:WRONG/IN-L1';
 const b=bundle(project,()=>null);
 assert.equal(b.statuses.supplyDeviceGraph,'BLOCKED');
 assert.ok(b.sections.issueRegister.entries.some(x=>x.code==='SUPPLY_GRAPH_BRANCH_FEED_CONFLICT'&&x.level==='BLOCKED'));
 assert.equal(b.ready_for_installation,false);
});

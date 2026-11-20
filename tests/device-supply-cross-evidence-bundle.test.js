'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
global.epDeviceSupplyAuditV1=require('../device-supply-v1.js').epDeviceSupplyAuditV1;
global.epDeviceSupplyCrossEvidenceV1=require('../device-supply-cross-evidence-v1.js').epDeviceSupplyCrossEvidenceV1;
global.epIncomingTerminalBindingsAuditV1=require('../incoming-terminal-bindings-v1.js').epIncomingTerminalBindingsAuditV1;
global.epEngineeringIssueRegisterV1=require('../engineering-issue-register-v1.js').epEngineeringIssueRegisterV1;
const {epEngineeringBundleV1:bundle}=require('../engineering-bundle-v1.js');
const {epEngineeringPrintV1:print}=require('../engineering-print-v1.js');
function project(){return {title:'Supply review',lines:[{id:'L1',phase:'L1'}],
 branchDevices:[{id:'BR1',circuitId:'L1'}],sharedDevices:[],
 feedLinks:[{circuitId:'L1',kind:'L1',from:'SOURCE:MAIN/L1'}],
 conductorRoutes:[{circuitId:'L1',phaseConductors:['L1']}],
 groupInputLinks:[],boardBindingsV1:[],
 deviceSupplyV1:{version:1,incomingDevices:[],links:[
 {from:'SOURCE:MAIN',to:'BRANCH:BR1',conductors:['L1','N']}]}};}
test('engineering bundle carries independent crossfeed evidence and print',()=>{
 const p=project(),before=JSON.stringify(p),b=bundle(p,()=>null);
 assert.equal(b.sections.supplyCrossEvidence.rows.length,1);
 assert.equal(b.sections.supplyCrossEvidence.physicalContinuity,'NOT_VERIFIED');
 assert.ok(b.sections.issueRegister.entries.some(x=>x.code==='SUPPLY_CROSS_LEGACY_FEED_SYMBOLIC_ONLY'));
 const html=print(b);assert.match(html,/Сверка питания с прежними схемами/);
 assert.equal(b.ready_for_installation,false);
 assert.equal(JSON.stringify(p),before);
});
test('contradictory legacy feed propagates blocker to overall bundle',()=>{
 const p=project();p.feedLinks[0].from='GROUP:RCD42/OUT-L1';
 const b=bundle(p,()=>null);
 assert.equal(b.statuses.supplyCrossEvidence,'BLOCKED');
 assert.ok(b.blockedSections.includes('supplyCrossEvidence'));
 assert.ok(b.sections.issueRegister.entries.some(x=>x.code==='SUPPLY_CROSS_LEGACY_ORIGIN_STALE'));
});

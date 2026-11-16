'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const scope=require('../design-stage-scope-v1.js');
const coverage=require('../project-calculation-coverage-v1.js').epProjectCalculationCoverageV1;
const design=require('../design-evidence-gates-v1.js').assessDesignEvidence;
const {epRestoreProjectExtensionsV2:restore}=require('../project-state-v2.js');
function project(){return {lines:[{id:'C1',phase:'L1',catalogSku:'QF-16',
 overloadInput:{ibA:10}}],branchDevices:[{id:'B1',circuitId:'C1'}],
 sharedDevices:[],title:'Commercial panel'};}
const lookup=()=>({inA:16});
test('preliminary panel calculates without cable route, transformer records or provenance documents',()=>{
 const p=project(),before=JSON.stringify(p);
 const s=scope.epDesignStageScopeV1(p),c=coverage(p,lookup),d=design(p);
 assert.equal(s.stage,'PRELIMINARY');assert.equal(c.status,'AVAILABLE');
 assert.ok(s.notRequired.includes('CABLE_ROUTE_AND_LENGTH'));
 assert.ok(s.notRequired.includes('EXTERNAL_NETWORK_MODEL'));
 assert.equal(d.status,'not_required');
 assert.equal(JSON.stringify(p),before);
});
test('explicitly requested external network does not claim a completed network study',()=>{
 const p=project();p.designRequirementsV1={externalNetwork:true};
 assert.ok(scope.epDesignStageScopeV1(p).required.includes('EXTERNAL_NETWORK_MODEL'));
 assert.equal(coverage(p,lookup).status,'AVAILABLE');
});
test('circuit overload remains a blocker on every design stage',()=>{
 for(const stage of ['PRELIMINARY','BOARD_DESIGN','DETAILED']){
  const p=project();p.designStageV1=stage;p.lines[0].overloadInput.ibA=22;
  assert.equal(coverage(p,lookup).status,'BLOCKED');
  assert.ok(coverage(p,lookup).issues.some(x=>x.code==='IB_EXCEEDS_SELECTED_IN'));
 }
});
test('once ampacity is declared, an actual In > Iz remains blocked',()=>{
 const p=project();p.lines[0].overloadInput.izA=12;
 assert.ok(coverage(p,lookup).issues.some(x=>x.code==='SELECTED_IN_EXCEEDS_DECLARED_IZ'));
});
test('an explicitly failed design evidence is not erased by stage scope',()=>{
 const p=project();p.evidence={device:{status:'failed'}};
 assert.equal(design(p).status,'failed');
});
test('stage and explicit optional design requirements roundtrip through existing project restoration',()=>{
 const raw=project();raw.designStageV1='DETAILED';
 raw.designRequirementsV1={selectivity:true,externalNetwork:false};
 const target=project(),before=JSON.stringify(raw);
 restore(raw,target);assert.equal(target.designStageV1,'DETAILED');
 assert.deepEqual(target.designRequirementsV1,raw.designRequirementsV1);
 assert.equal(JSON.stringify(raw),before);
});
test('corrupt stage, requirement fields and injected approval flag are rejected on import',()=>{
 for(const replacement of [
  {designStageV1:'LABORATORY'},
  {designRequirementsV1:{externalNetwork:'yes'}},
  {designRequirementsV1:{selectivity:true,engineeringApproved:true}},
  {designRequirementsV1:['selectivity']}
 ]){
  assert.throws(()=>restore({...project(),...replacement},project()));
 }
});
test('stage UI preserves source opt-in and explicit selectivity in form state',()=>{
 const p=project();p.designRequirementsV1={selectivity:true,externalNetwork:true};
 const h=scope.epDesignStageScopeHtmlV1(scope.epDesignStageScopeV1(p));
 assert.ok(h.includes('designSelectivityRequested'));
 assert.ok(h.includes('designExternalNetworkRequested'));
 assert.ok(h.includes('designStageSave'));
});

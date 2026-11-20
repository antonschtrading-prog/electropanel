'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epProtectionTopologyV1:audit}=require('../protection-topology-v1.js');
const p=()=>({lines:[{id:'QF0'},{id:'QF1'},{id:'QF2'}]});
const l=(downstreamLineId,upstreamLineId)=>({downstreamLineId,upstreamLineId});
test('explicit radial chain is traceable but cannot certify selectivity',()=>{
 const project=p(),before=JSON.stringify(project);
 const r=audit(project,[l('QF1','QF0'),l('QF2','QF1')]);
 assert.equal(r.edges.length,2);assert.equal(r.status,'UNKNOWN');
 assert.equal(r.selectivityStatus,'NOT_ASSESSED');
 assert.equal(r.engineeringApproved,false);
 assert.equal(JSON.stringify(project),before);
});
test('missing or invalid link evidence remains non-approved',()=>{
 assert.equal(audit(p()).status,'UNKNOWN');
 assert.equal(audit(p(),[]).selectivityStatus,'NOT_ASSESSED');
 assert.equal(audit(p(),null).engineeringApproved,false);
});
test('unknown endpoints, self links and duplicate parents block topology',()=>{
 for(const links of [[l('QF1','X')],[l('QF1','QF1')],[l('QF1','QF0'),l('QF1','QF2')]]) {
  const r=audit(p(),links);assert.equal(r.status,'BLOCKED');
 }
});
test('two and three-node cycles are rejected without recursion runaway',()=>{
 for(const links of [[l('QF0','QF1'),l('QF1','QF0')],
 [l('QF0','QF1'),l('QF1','QF2'),l('QF2','QF0')]]) {
  assert.ok(audit(p(),links).issues.some(x=>x.code==='TOPOLOGY_CYCLE'));
 }
});
test('duplicate IDs and malformed project are blocked',()=>{
 assert.equal(audit({lines:[{id:'QF0'},{id:'QF0'}]},[]).status,'BLOCKED');
 assert.equal(audit({lines:null},[]).status,'BLOCKED');
});
test('nominal currents cannot imply selectivity',()=>{
 const project={lines:[{id:'QF0',inA:63},{id:'QF1',inA:16}]};
 const r=audit(project,[l('QF1','QF0')]);
 assert.equal(r.selectivityStatus,'NOT_ASSESSED');
 assert.ok(r.issues.some(x=>x.code==='TOPOLOGY_SELECTIVITY_EVIDENCE_REQUIRED'));
});

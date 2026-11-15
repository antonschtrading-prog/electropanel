'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
global.epProtectionTopologyV1=require('../protection-topology-v1.js').epProtectionTopologyV1;
global.epEngineeringIssueRegisterV1=require('../engineering-issue-register-v1.js').epEngineeringIssueRegisterV1;
const {epEngineeringBundleV1}=require('../engineering-bundle-v1.js');
const {epEngineeringPrintV1}=require('../engineering-print-v1.js');
const project=()=>({title:'Topology audit',lines:[{id:'MAIN'},{id:'L1'},{id:'L2'}],
 protectionLinks:[{downstreamLineId:'L1',upstreamLineId:'MAIN'},
 {downstreamLineId:'L2',upstreamLineId:'L1'}]});
test('bundle, register and HTML share explicit topology',()=>{
 const p=project(),before=JSON.stringify(p),b=epEngineeringBundleV1(p,()=>null);
 assert.equal(b.sections.protectionTopology.edges.length,2);
 assert.equal(b.sections.protectionTopology.selectivityStatus,'NOT_ASSESSED');
 assert.equal(b.statuses.protectionTopology,'UNKNOWN');
 assert.ok(b.sections.issueRegister.entries.some(x=>x.code==='TOPOLOGY_SELECTIVITY_EVIDENCE_REQUIRED'));
 const html=epEngineeringPrintV1(b);
 assert.match(html,/Связи защитных аппаратов/);
 assert.match(html,/NOT_ASSESSED/);
 assert.match(html,/MAIN/);
 assert.equal(JSON.stringify(p),before);
});
test('cycle errors reach the aggregate issue register and cannot pass',()=>{
 const p=project();p.protectionLinks.push({downstreamLineId:'MAIN',upstreamLineId:'L2'});
 const b=epEngineeringBundleV1(p,()=>null);
 assert.equal(b.statuses.protectionTopology,'BLOCKED');
 assert.ok(b.blockedSections.includes('protectionTopology'));
 assert.ok(b.sections.issueRegister.entries.some(x=>x.code==='TOPOLOGY_CYCLE'&&x.level==='BLOCKED'));
 assert.equal(b.engineeringApproved,false);
});
test('missing topology or module cannot create positive selectivity',()=>{
 const p=project();delete p.protectionLinks;
 const b=epEngineeringBundleV1(p,()=>null);
 assert.equal(b.statuses.protectionTopology,'UNKNOWN');
 assert.equal(b.sections.protectionTopology.selectivityStatus,'NOT_ASSESSED');
 assert.equal(b.ready_for_installation,false);
});
test('untrusted labels escape from print HTML',()=>{
 const p=project();p.lines[0].id='<img src=x onerror=alert(1)>';
 p.protectionLinks=[{downstreamLineId:'L1',upstreamLineId:p.lines[0].id}];
 const h=epEngineeringPrintV1(epEngineeringBundleV1(p,()=>null));
 assert.ok(h.includes('&lt;img src=x onerror=alert(1)&gt;'));
 assert.ok(!h.includes('<img src=x onerror=alert(1)>'));
});

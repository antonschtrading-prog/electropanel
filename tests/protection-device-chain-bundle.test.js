'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
global.epProtectionTopologyV1=require('../protection-topology-v1.js').epProtectionTopologyV1;
global.epProtectionDeviceChainV1=require('../protection-device-chain-v1.js').epProtectionDeviceChainV1;
global.epEngineeringIssueRegisterV1=require('../engineering-issue-register-v1.js').epEngineeringIssueRegisterV1;
const {epEngineeringBundleV1:bundle}=require('../engineering-bundle-v1.js');
const {epEngineeringPrintV1:print}=require('../engineering-print-v1.js');
function project(){return {title:'Audit',lines:[{id:'A',catalogSku:'SKU-A'},{id:'B',catalogSku:'SKU-B'}],
 branchModelVersion:1,branchDevices:[{id:'QA',circuitId:'A',label:'C32'},{id:'QB',circuitId:'B',label:'C16'}],
 protectionLinks:[{downstreamLineId:'B',upstreamLineId:'A'}]};}
const lookup=id=>({sku:id,kind:'MCB',inA:id==='SKU-A'?32:16,verificationStatus:'VERIFIED'});
test('bundle exports apparatus ID pair and shared issues without approval',()=>{
 const p=project(),before=JSON.stringify(p),b=bundle(p,lookup);
 const r=b.sections.protectionDeviceChain;
 assert.equal(r.pairs.length,1);assert.equal(r.pairs[0].upstreamDeviceId,'QA');
 assert.equal(r.pairs[0].downstreamDeviceId,'QB');
 assert.equal(r.selectivityStatus,'NOT_ASSESSED');
 assert.ok(b.sections.issueRegister.entries.some(x=>x.code==='CHAIN_PHYSICAL_PATH_NOT_PROVEN'));
 assert.equal(b.engineeringApproved,false);
 const h=print(b);assert.match(h,/Связь с идентификаторами аппаратов/);
 assert.match(h,/QA/);assert.match(h,/SKU-A/);
 assert.equal(JSON.stringify(p),before);
});
test('missing branch ID does not invent device and is declared incomplete',()=>{
 const p=project();p.branchDevices.pop();
 const b=bundle(p,lookup);
 assert.ok(b.sections.protectionDeviceChain.issues.some(x=>x.code==='CHAIN_PROTECTIVE_DEVICE_BINDING_MISSING'));
 assert.equal(b.sections.protectionDeviceChain.pairs[0].downstreamDeviceId,null);
});
test('corrupt duplicate device IDs block the engineering bundle',()=>{
 const p=project();p.branchDevices[1].id='QA';
 const b=bundle(p,lookup);
 assert.equal(b.statuses.protectionDeviceChain,'BLOCKED');
 assert.ok(b.blockedSections.includes('protectionDeviceChain'));
});
test('HTML device-chain output escapes untrusted identity',()=>{
 const {epProtectionDeviceChainHtmlV1:html}=require('../protection-device-chain-v1.js');
 const x=html({status:'UNKNOWN',pairs:[{
  downstreamLineId:'<img src=x onerror=alert(1)>',downstreamDeviceId:'X',downstream:{sku:'abc'},
  upstreamLineId:'A',upstreamDeviceId:'QA',upstream:{sku:'d'},selectivityStatus:'NOT_ASSESSED'
 }]});
 assert.ok(x.includes('&lt;img src=x onerror=alert(1)&gt;'));
 assert.ok(!x.includes('<img src=x onerror=alert(1)>'));
});

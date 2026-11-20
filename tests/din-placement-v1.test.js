'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {epDinPlacementFromArticleV1:project,epDinPlacementAuditV1:audit}=require('../din-placement-v1.js');
global.epDinCatalogValidateV1=require('../din-catalog-schema-v1.js').epDinCatalogValidateV1;
const product={category:'DIN_PSU',manufacturer:'Test',series:'Series',article:'A-1',
 verificationStatus:'VERIFIED',mounting:'DIN',geometry:{widthMm:35,heightMm:90,depthMm:60},
 evidence:{url:'https://example.com'},visual:{mode:'NEUTRAL_PLACEHOLDER',verified:false}};
test('width maps to conservative whole modules',()=>assert.equal(project(product,'D1').modules,2));
test('visual is never silently verified',()=>assert.equal(project(product,'D1').visual.verified,false));
test('missing geometry blocks',()=>assert.equal(project({...product,geometry:{widthMm:null,heightMm:90,depthMm:60}},'D1').status,'BLOCKED'));
test('non DIN mounting blocks',()=>assert.equal(project({...product,mounting:'PANEL'},'D1').status,'BLOCKED'));
test('fire module with no certification remains unapproved',()=>assert.equal(project({...product,category:'FIRE_SUPPRESSION'},'D1').engineeringApproved,false));
test('missing project placements is UNKNOWN',()=>assert.equal(audit({},()=>product).status,'UNKNOWN'));
test('unknown article blocks',()=>assert.equal(audit({dinPlacementsV1:[{deviceId:'D1',article:'x',modules:2}]},()=>null).status,'BLOCKED'));
test('stale modules are blocked',()=>{
 global.epBoardDevicesV1=()=>[{id:'D1',modules:2}];
 const result=audit({dinPlacementsV1:[{deviceId:'D1',article:'A-1',modules:1}]},()=>product);
 assert.ok(result.issues.some(x=>x.code==='DIN_MODULES_STALE'));
});
test('duplicate placement blocked',()=>{
 global.epBoardDevicesV1=()=>[{id:'D1',modules:2}];
 const result=audit({dinPlacementsV1:[{deviceId:'D1',article:'A-1',modules:2},{deviceId:'D1',article:'A-1',modules:2}]},()=>product);
 assert.ok(result.issues.some(x=>x.code==='DIN_DEVICE_DUPLICATE'));
});

test('article swap produces a reviewed, nonmutating geometry and facade proposal',()=>{
 const {epDinArticleReplacementV1:replace}=require('../din-placement-v1.js');
 const old={dinPlacementsV1:[{deviceId:'D1',article:'A-1',modules:2}]};
 const next={...product,article:'B-2',geometry:{widthMm:54,heightMm:90,depthMm:60},
 visual:{mode:'MANUFACTURER_FRONT',verified:true}};
 const r=replace(old,'D1','B-2',()=>next);
 assert.equal(r.status,'REVIEW_REQUIRED');assert.equal(r.proposal.modules,3);
 assert.equal(r.proposal.visual.mode,'MANUFACTURER_FRONT');
 assert.equal(old.dinPlacementsV1[0].article,'A-1');
 assert.equal(r.engineeringApproved,false);
});
test('article mismatch cannot be substituted',()=>{
 const {epDinArticleReplacementV1:replace}=require('../din-placement-v1.js');
 const r=replace({dinPlacementsV1:[{deviceId:'D1'}]},'D1','B-2',()=>product);
 assert.equal(r.status,'BLOCKED');
});

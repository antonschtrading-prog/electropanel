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

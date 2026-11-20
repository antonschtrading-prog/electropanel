'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
global.epDraftBoardPlanV1=require('../draft-board-plan-v1').epDraftBoardPlanV1;
global.epCabinetOptionPreviewV1=require('../cabinet-option-preview-v1').epCabinetOptionPreviewV1;
const {epCabinetOptionImpactV1:impact}=require('../cabinet-option-impact-v1');
const {epCabinetOptionCompareV1:compare}=require('../cabinet-option-compare-v1');
const project=()=>({railCount:1,railCapacity:6,lines:[{id:'A',modules:2},{id:'B',modules:1}],sharedDevices:[]});
const option=(id,swapped=false)=>({id,status:'REVIEW_REQUIRED',packingMethod:'PACKED',
 railCount:1,modulesPerRail:6,capacityModules:6,usedModules:3,reserveModules:3,
 envelope:{preliminaryUsableWidthMm:248,preliminaryUsableHeightMm:350},
 rails:[{railIndex:0,devices:swapped?
 [{deviceId:'B',startModule:0,modules:1},{deviceId:'A',startModule:1,modules:2}]:
 [{deviceId:'A',startModule:0,modules:2},{deviceId:'B',startModule:2,modules:1}]}]});
const report=()=>({options:[option('stable'),option('moved',true)]});
const run=()=>impact(project(),report(),()=>null);
test('impact schema',()=>assert.equal(run().schema,'electropanel.cabinet.option.impact.1'));
test('impact preliminary',()=>assert.equal(run().status,'REVIEW_REQUIRED'));
test('impact not approved',()=>assert.equal(run().engineeringApproved,false));
test('two eligible',()=>assert.equal(run().summary.eligible,2));
test('two previewable',()=>assert.equal(run().summary.previewable,2));
test('no unavailable',()=>assert.equal(run().summary.unavailable,0));
test('stable first',()=>assert.equal(run().rows[0].id,'stable'));
test('stable zero movements',()=>assert.equal(run().rows[0].moved,0));
test('swapped moves two',()=>assert.equal(run().rows[1].moved,2));
test('swapped stays on same rail',()=>assert.equal(run().rows[1].changedRails,0));
test('stable keeps two',()=>assert.equal(run().rows[0].unchanged,2));
test('capacity delta zero',()=>assert.equal(run().rows[0].capacityDelta,0));
test('rows not approved',()=>assert.ok(run().rows.every(x=>x.engineeringApproved===false)));
test('null project blocked',()=>assert.equal(impact(null,report(),()=>null).status,'BLOCKED'));
test('null report blocked',()=>assert.equal(impact(project(),null,()=>null).status,'BLOCKED'));
test('bad options blocked',()=>assert.equal(impact(project(),{options:{}},()=>null).status,'BLOCKED'));
test('bad settings blocked',()=>assert.equal(impact(project(),report(),()=>null,null).status,'BLOCKED'));
test('bad exclusions blocked',()=>assert.equal(impact(project(),report(),()=>null,{excludedIds:[1]}).status,'BLOCKED'));
test('excluded option omitted',()=>assert.equal(impact(project(),report(),()=>null,{excludedIds:['stable']}).rows.length,1));
test('blocked option omitted',()=>assert.equal(impact(project(),{options:[{...option('stable'),status:'BLOCKED'}]},()=>null).rows.length,0));
test('duplicate option ID blocked',()=>assert.equal(impact(project(),{options:[option('x'),option('x')]},()=>null).status,'BLOCKED'));
test('empty ID blocked',()=>assert.equal(impact(project(),{options:[option('')]},()=>null).status,'BLOCKED'));
test('invalid option becomes unavailable',()=>assert.equal(impact(project(),{options:[{...option('x'),rails:[]}]},()=>null).summary.unavailable,1));
test('unavailable status unknown',()=>assert.equal(impact(project(),{options:[{...option('x'),rails:[]}]},()=>null).status,'UNKNOWN'));
test('empty report unknown',()=>assert.equal(impact(project(),{options:[]},()=>null).status,'UNKNOWN'));
test('deterministic',()=>assert.deepEqual(run(),run()));
test('project unchanged',()=>{const p=project(),s=JSON.stringify(p);impact(p,report(),()=>null);assert.equal(JSON.stringify(p),s)});
test('report unchanged',()=>{const r=report(),s=JSON.stringify(r);impact(project(),r,()=>null);assert.equal(JSON.stringify(r),s)});
test('stability preference accepted',()=>assert.equal(compare(report(),{preference:'stability',impactRows:run().rows}).status,'REVIEW_REQUIRED'));
test('stability prefers zero moves',()=>assert.equal(compare(report(),{preference:'stability',impactRows:run().rows}).recommendedId,'stable'));
test('stability includes movement counts',()=>assert.equal(compare(report(),{preference:'stability',impactRows:run().rows}).rows.find(r=>r.id==='moved').movedDevices,2));
test('stability missing impact does not fabricate movements',()=>assert.equal(compare(report(),{preference:'stability'}).rows[0].movedDevices,null));
test('stability bad impact blocked',()=>assert.equal(compare(report(),{preference:'stability',impactRows:[{id:'x',previewable:true,moved:-1,changedRails:0}]}).status,'BLOCKED'));
test('stability duplicate impact blocked',()=>assert.equal(compare(report(),{preference:'stability',impactRows:[run().rows[0],run().rows[0]]}).status,'BLOCKED'));
test('stability preserves capacity',()=>assert.equal(compare(report(),{preference:'stability',impactRows:run().rows}).rows[0].capacityModules,6));
test('stability never approves',()=>assert.equal(compare(report(),{preference:'stability',impactRows:run().rows}).engineeringApproved,false));

test('missing movement evidence produces UNKNOWN ranking',()=>assert.equal(compare(report(),{preference:'stability'}).status,'UNKNOWN'));
test('missing movement evidence does not fabricate recommendation',()=>assert.equal(compare(report(),{preference:'stability'}).recommendedId,null));
test('missing movement evidence has explicit code',()=>assert.equal(compare(report(),{preference:'stability'}).code,'OPTION_COMPARE_MOVEMENT_UNAVAILABLE'));
test('known movement evidence restores recommendation',()=>assert.equal(compare(report(),{preference:'stability',impactRows:run().rows}).recommendedId,'stable'));

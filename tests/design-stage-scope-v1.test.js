'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {epDesignStageScopeV1:scope,epDesignStageScopeHtmlV1:html}=
 require('../design-stage-scope-v1.js');
const p=()=>({lines:[{id:'L1',phase:'L1',overloadInput:{ibA:10},catalogSku:'SKU'}],
 branchDevices:[{id:'B1',circuitId:'L1'}]});
test('preliminary design does not require cable length or upstream transformer',()=>{
 const x=p(),before=JSON.stringify(x),r=scope(x);
 assert.equal(r.stage,'PRELIMINARY');assert.equal(r.valid,true);
 assert.ok(r.notRequired.includes('CABLE_ROUTE_AND_LENGTH'));
 assert.ok(r.notRequired.includes('EXTERNAL_NETWORK_MODEL'));
 assert.ok(r.notRequired.includes('MANUFACTURER_SELECTIVITY'));
 assert.equal(r.engineeringApproved,false);assert.equal(JSON.stringify(x),before);
});
test('board design enables apparatus selection but not external network study',()=>{
 const x=p();x.designStageV1='BOARD_DESIGN';
 const r=scope(x);assert.ok(r.required.includes('BOARD_PROTECTION_SELECTION'));
 assert.ok(r.notRequired.includes('EXTERNAL_NETWORK_MODEL'));
});
test('detailed design with a declared route activates route review only when relevant',()=>{
 const x=p();x.designStageV1='DETAILED';
 assert.ok(scope(x).deferred.includes('CABLE_ROUTE_AND_LENGTH'));
 assert.ok(scope(x).deferred.includes('CABLING_AMPACITY'));
 x.lines[0].route44Input={segments:[]};
 assert.ok(scope(x).required.includes('CABLE_ROUTE_AND_LENGTH'));
});
test('selectivity is required only by explicit design requirement',()=>{
 const x=p();x.designRequirementsV1={selectivity:true};
 assert.ok(scope(x).required.includes('MANUFACTURER_SELECTIVITY'));
 x.designRequirementsV1={selectivity:false};
 assert.ok(scope(x).notRequired.includes('MANUFACTURER_SELECTIVITY'));
});
test('incoming transformer studies are not default requirements',()=>{
 const x=p();x.incomingMaximumStudiesV1=[{deviceNodeId:'INCOMING:Q0'}];
 assert.equal(scope(x).items.find(i=>i.code==='EXTERNAL_NETWORK_MODEL').status,'IN_PROGRESS');
});
test('physical installation tests never appear as design requirements',()=>{
 const x=p();x.designStageV1='DETAILED';
 x.designRequirementsV1={externalNetwork:true,selectivity:true};
 assert.ok(scope(x).notRequired.includes('PHYSICAL_INSTALLATION_TESTS'));
});
test('unknown stage fails closed to safe preliminary scope',()=>{
 const x=p();x.designStageV1='FAKE';
 const r=scope(x);assert.equal(r.valid,false);assert.equal(r.stage,'PRELIMINARY');
});
test('stage table is escaped and exposes actual form control',()=>{
 const x=p(),r=html(scope(x));assert.ok(r.includes('designStageSelect'));
 assert.ok(r.includes('designStageSave'));
});

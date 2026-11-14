'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epReconcileProjectV2}=require('../design-reconciliation-v1.js');
const base=()=>({lines:[{id:'L1',name:'Lighting',modules:1,phase:'L1',catalogSku:'A'}],branchDevices:[{id:'Q1',circuitId:'L1',modules:1}]});
const lookup=()=>({maker:'Vendor',series:'Series',sku:'A',widthMm:18});
function codes(project){return epReconcileProjectV2(project,lookup).issues.filter(x=>x.level==='BLOCKED').map(x=>x.code);}
test('native reconciliation blocks duplicate circuit identifiers',()=>{const p=base();p.lines.push({...p.lines[0]});assert.ok(codes(p).includes('LINE_ID_DUPLICATE'));});
test('native reconciliation blocks duplicate device identifiers',()=>{const p=base();p.branchDevices.push({...p.branchDevices[0],circuitId:'missing'});assert.ok(codes(p).includes('BRANCH_DEVICE_ID_DUPLICATE'));});
test('native reconciliation blocks orphan devices',()=>{const p=base();p.branchDevices[0].circuitId='missing';assert.ok(codes(p).includes('BRANCH_DEVICE_ORPHAN'));});
test('native reconciliation blocks missing device',()=>{const p=base();p.branchDevices=[];assert.ok(codes(p).includes('BRANCH_DEVICE_MISSING'));});
test('native reconciliation blocks multiple devices bound to same line',()=>{const p=base();p.branchDevices.push({id:'Q2',circuitId:'L1',modules:1});assert.ok(codes(p).includes('BRANCH_DEVICE_DUPLICATE_FOR_LINE'));});
test('native reconciliation blocks invalid and mismatched module counts',()=>{const p=base();p.lines[0].modules=0;p.branchDevices[0].modules=2;const c=codes(p);assert.ok(c.includes('LINE_MODULE_COUNT_INVALID'));assert.ok(c.includes('BRANCH_LINE_MODULE_MISMATCH'));assert.ok(c.includes('ARTICLE_ENVELOPE_CONFLICT'));});
test('native reconciliation blocks missing branch devices collection',()=>{const p=base();p.branchDevices={};assert.ok(codes(p).includes('BRANCH_DEVICES_INVALID'));});
test('native reconciliation never asserts engineering approval',()=>{const p=base(),r=epReconcileProjectV2(p,lookup);assert.equal(r.engineeringApproved,false);assert.equal(r.ready_for_installation,false);});

test('native reconciliation rejects mismatch between catalogue and line modules',()=>{const p=base();const r=epReconcileProjectV2(p,()=>({...lookup(),modules:2}));assert.ok(r.issues.some(i=>i.code==='CATALOG_LINE_MODULE_MISMATCH'&&i.level==='BLOCKED'));});
test('native reconciliation handles incomplete placement reports safely',()=>{const p=base();global.epDraftBoardPlanV1=()=>({issues:[],placements:[]});try{const r=epReconcileProjectV2(p,lookup);assert.ok(r.issues.some(i=>i.code==='BRANCH_DEVICE_NOT_PLACED'&&i.level==='BLOCKED'));}finally{delete global.epDraftBoardPlanV1;}});

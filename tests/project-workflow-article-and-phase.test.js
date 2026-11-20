'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
global.epLoadCurrentV1=require('../load-current-v1.js').epLoadCurrentV1;
global.epApplyLoadCurrentV1=require('../load-current-v1.js').epApplyLoadCurrentV1;
global.epProtectiveDeviceShortlistV1=require('../protective-device-shortlist-v1.js').epProtectiveDeviceShortlistV1;
const {epWorkflowArticleChoiceV1:choice,epWorkflowPhaseSuggestionsV1:phases,
 epWorkflowInputsV1:validate}=require('../project-automation-workflow-v1.js');
const catalog=[
 {id:'A-16',device:{sku:'A-16',kind:'MCB',inA:16,poles:1,modules:1,widthMm:18,
  icnKa:6,icnVoltageV:230,icnStandard:'IEC 60898-1',maker:'Maker'}},
 {id:'A-6',device:{sku:'A-6',kind:'MCB',inA:6,poles:1,modules:1,widthMm:18,icnKa:6}},
 {id:'A-3P',device:{sku:'A-3P',kind:'MCB',inA:16,poles:3,modules:3,widthMm:54,icnKa:6}}];
const project=()=>({lines:[
 {id:'L1',phase:'L1',power:2,overloadInput:{ibA:10}},
 {id:'L2',phase:'L2',power:3,overloadInput:{ibA:11}},
 {id:'L3',phase:'L1',power:4,overloadInput:{ibA:15}}],
 branchDevices:[],loads:[],sharedDevices:[]});
test('reviewed preliminary candidate can be chosen but never marked approved',()=>{
 const p=project(),before=JSON.stringify(p);
 const x=choice(p,'L1','A-16',catalog);
 assert.equal(x.status,'INCOMPLETE');
 assert.equal(x.requiresFinalChecks,true);
 assert.equal(x.engineeringApproved,false);
 assert.equal(JSON.stringify(p),before);
});
test('selected article cannot be replaced silently by workflow action',()=>{
 const p=project();p.lines[0].catalogSku='A-6';
 assert.throws(()=>choice(p,'L1','A-16',catalog),/WORKFLOW_ARTICLE_ALREADY_SELECTED/);
});
test('candidate below declared design current is refused',()=>{
 const p=project();
 assert.throws(()=>choice(p,'L1','A-6',catalog),/WORKFLOW_ARTICLE_CANDIDATE_REJECTED/);
});
test('3P article cannot be applied to single-phase branch',()=>{
 assert.throws(()=>choice(project(),'L1','A-3P',catalog),/WORKFLOW_ARTICLE_CANDIDATE_REJECTED/);
});
test('unknown article, unknown line and corrupt request cannot write',()=>{
 assert.throws(()=>choice(project(),'L1','MISSING',catalog),/WORKFLOW_ARTICLE_CANDIDATE_REJECTED/);
 assert.throws(()=>choice(project(),'GHOST','A-16',catalog),/WORKFLOW_ARTICLE_LINE_MISSING/);
 assert.throws(()=>choice(project(),'L1','A-16',null),/WORKFLOW_ARTICLE_CHOICE_INVALID/);
});
test('phase balancing suggests a lower unevenness without ever moving a circuit',()=>{
 const p=project(),before=JSON.stringify(p),r=phases(p);
 assert.ok(r.candidates.length>0);
 assert.ok(r.candidates[0].afterKw<r.candidates[0].beforeKw);
 assert.equal(r.candidates[0].applied,false);
 assert.equal(r.method,'ACTIVE_KW_HEURISTIC_ONLY');
 assert.equal(r.engineeringApproved,false);
 assert.equal(JSON.stringify(p),before);
});
test('three-phase power is evenly accounted for on all phases in heuristic',()=>{
 const p={lines:[{id:'X',phase:'3Ф',power:9},{id:'Y',phase:'L1',power:3}]};
 const r=phases(p);
 assert.deepEqual(r.phaseLoadsKw,{L1:6,L2:3,L3:3});
});
test('unknown and zero powers do not silently invent phase assignment',()=>{
 const p={lines:[{id:'X',phase:'',power:9},{id:'Y',phase:'L1',power:null}]};
 const r=phases(p);
 assert.equal(r.candidates.length,0);
 assert.deepEqual(r.phaseLoadsKw,{L1:0,L2:0,L3:0});
});
test('user-supplied common calculation input remains strictly numeric and bounded',()=>{
 const x=validate({singleVoltageV:'230',threeVoltageV:'400',
  powerFactor:'0,9',efficiency:'1',demandFactor:'0,8'});
 assert.equal(x.powerFactor,.9);assert.equal(x.demandFactor,.8);
});

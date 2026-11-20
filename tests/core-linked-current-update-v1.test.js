'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
global.epLoadCurrentV1=require('../load-current-v1.js').epLoadCurrentV1;
global.epApplyLoadCurrentV1=require('../load-current-v1.js').epApplyLoadCurrentV1;
const wf=require('../project-automation-workflow-v1.js');
const {epDesignChangeImpactV1:impact,epInvalidateDesignEvidenceV1:invalidate}=require('../design-change-impact-v1.js');
const inputs=()=>({singleVoltageV:230,threeVoltageV:400,powerFactor:.9,efficiency:1,demandFactor:1});
const project=()=>({title:'Shop',lines:[
 {id:'L1',name:'Lighting',phase:'L1',power:2,modules:1},
 {id:'L2',name:'Socket',phase:'L2',power:3,modules:1,overloadInput:{ibA:13}},
 {id:'L3',name:'Motor',phase:'3Ф',power:6,modules:3}],
 loads:[],sharedDevices:[],branchDevices:[]});
test('shared-input change explicitly recalculates linked currents and preserves manual Ib',()=>{
 const p=wf.epWorkflowApplyCurrentsV1(project(),inputs()).project;
 const before=JSON.stringify(p);
 const old1=p.lines[0].overloadInput.ibA,old3=p.lines[2].overloadInput.ibA;
 const result=wf.epWorkflowApplyCurrentsV1(p,{...inputs(),powerFactor:.8});
 assert.equal(result.applied.length,2);
 assert.ok(result.applied.every(x=>x.reason==='LINKED_INPUTS_RECALCULATED'));
 assert.ok(result.project.lines[0].overloadInput.ibA>old1);
 assert.ok(result.project.lines[2].overloadInput.ibA>old3);
 assert.equal(result.project.lines[1].overloadInput.ibA,13);
 assert.equal(result.project.workflowDesignInputsV1.powerFactor,.8);
 assert.equal(JSON.stringify(p),before);
 assert.equal(result.project.lines[0].calculationReview.required,true);
 assert.equal(result.project.lines[0].loadCurrentCalculation.powerSource,'circuit');
});
test('reapplying identical shared inputs is idempotent',()=>{
 const p=wf.epWorkflowApplyCurrentsV1(project(),inputs()).project;
 const r=wf.epWorkflowApplyCurrentsV1(p,inputs());
 assert.equal(r.status,'NO_CHANGES');
 assert.equal(r.applied.length,0);
 assert.ok(r.skipped.some(x=>x.code==='WORKFLOW_LINKED_CURRENT_UNCHANGED'));
 assert.deepEqual(r.project,p);
});
test('engineer override of Ib is not overwritten even when common factors change',()=>{
 const p=wf.epWorkflowApplyCurrentsV1(project(),inputs()).project;
 p.lines[0].overloadInput.ibA=15;
 const r=wf.epWorkflowApplyCurrentsV1(p,{...inputs(),demandFactor:.8});
 assert.equal(r.project.lines[0].overloadInput.ibA,15);
 assert.ok(r.skipped.some(x=>x.lineId==='L1'&&x.code==='WORKFLOW_EXISTING_CURRENT_PRESERVED'));
 assert.equal(r.applied.length,1);
});
test('manual source calculation does not qualify as linked',()=>{
 const p=wf.epWorkflowApplyCurrentsV1(project(),inputs()).project;
 p.lines[0].loadCurrentCalculation.powerSource='manual';
 const r=wf.epWorkflowApplyCurrentsV1(p,{...inputs(),powerFactor:.75});
 assert.equal(r.project.lines[0].overloadInput.ibA,p.lines[0].overloadInput.ibA);
 assert.equal(r.applied.length,1);
});
test('stale linked provenance is preserved, not silently accepted as current',()=>{
 const p=wf.epWorkflowApplyCurrentsV1(project(),inputs()).project;
 p.lines[0].loadCurrentCalculation.stale=true;
 const r=wf.epWorkflowApplyCurrentsV1(p,{...inputs(),demandFactor:.8});
 assert.equal(r.project.lines[0].overloadInput.ibA,p.lines[0].overloadInput.ibA);
 assert.ok(r.skipped.some(x=>x.lineId==='L1'&&x.code==='WORKFLOW_EXISTING_CURRENT_PRESERVED'));
});
test('changing line phase recomputes only on explicit engineer action',()=>{
 const p=wf.epWorkflowApplyCurrentsV1(project(),inputs()).project;
 p.lines[0].phase='3Ф';
 const r=wf.epWorkflowApplyCurrentsV1(p,inputs());
 assert.equal(r.applied.length,1);
 assert.equal(r.project.lines[0].loadCurrentCalculation.mode,'three_phase');
 assert.equal(r.project.lines[0].loadCurrentCalculation.inputs.voltageV,400);
});
test('unknown relevant voltage leaves linked Ib intact without guessing',()=>{
 const p=wf.epWorkflowApplyCurrentsV1(project(),inputs()).project;
 const x={...inputs(),singleVoltageV:null,powerFactor:.7};
 const r=wf.epWorkflowApplyCurrentsV1(p,x);
 assert.equal(r.project.lines[0].overloadInput.ibA,p.lines[0].overloadInput.ibA);
 assert.equal(r.project.lines[2].loadCurrentCalculation.inputs.powerFactor,.7);
 assert.equal(r.project.workflowDesignInputsV1.singleVoltageV,null);
});
test('changing shared factors invalidates load to enclosure evidence',()=>{
 const p=project();p.workflowDesignInputsV1=inputs();
 const q=structuredClone(p);q.workflowDesignInputsV1.powerFactor=.75;
 assert.deepEqual(impact(p,q).affected,['load','cable','device','topology','enclosure']);
 q.evidence={load:{status:'verified',source:'engineer'},network:{status:'verified',source:'engineer'},
  cable:{status:'verified'},device:{status:'verified'},topology:{status:'verified'},enclosure:{status:'verified'}};
 const next=invalidate(q,impact(p,q));
 assert.equal(next.evidence.load.stale,true);
 assert.equal(next.evidence.network.stale,undefined);
});
test('draft grouping edits invalidate dependent outputs but do not mutate circuits',()=>{
 const p=project(),q=structuredClone(p);q.consumerGroupMergeRulesV1={categories:['LIGHTING']};
 const before=JSON.stringify(q);
 assert.deepEqual(impact(p,q).changed,['load']);
 assert.equal(JSON.stringify(q),before);
});
test('renaming, stage metadata or presentation-only edits cause no invalidation',()=>{
 const p=project(),q=structuredClone(p);q.title='New title';q.lines[0].name='Renamed';
 q.designStageV1='DETAILED';
 assert.equal(impact(p,q).status,'UNCHANGED');
});

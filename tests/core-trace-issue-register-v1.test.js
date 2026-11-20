'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epEngineeringIssueRegisterV1:reg,epEngineeringIssueRegisterCsvV1:csv,
 epEngineeringIssueRegisterHtmlV1:html}=require('../engineering-issue-register-v1.js');
const print=require('../engineering-print-v1.js').epEngineeringPrintV1;
const names=['designWorkQueue','designReview','cableReference','designEvidence',
 'dossier','bom','board','layoutAlternatives','protection','crossView',
 'wiringTrace','neutralSegregation','neutralWireIsolation','singleLine','engineering'];
const project=()=>({title:'Shop',lines:[{id:'C1',name:'Lighting'}, {id:'C2',name:'Sockets'}]});
const bundle=()=>({overallStatus:'BLOCKED',projectTitle:'Shop',
 sections:{...Object.fromEntries(names.map(name=>[name,{status:'UNKNOWN',issues:[]}])),
 deliveryTrace:{status:'BLOCKED',rows:[{lineId:'C1',crossViewStatus:'REVIEW_REQUIRED',reviewIssueCount:1}],
  issues:[{code:'DELIVERY_BOARD_BOM_SKU_MISMATCH',level:'BLOCKED',lineId:'C1'}]}}});
test('global issue register imports delivery trace mismatch',()=>{
 const result=reg(bundle(),project());
 const issue=result.entries.find(x=>x.code==='DELIVERY_BOARD_BOM_SKU_MISMATCH');
 assert.ok(issue);assert.equal(issue.section,'deliveryTrace');
 assert.equal(issue.circuitId,'C1');assert.equal(issue.level,'BLOCKED');
 assert.equal(result.status,'BLOCKED');
});
test('one delivery mismatch contributes exactly one source-specific issue',()=>{
 const result=reg(bundle(),project());
 assert.equal(result.entries.filter(x=>x.section==='deliveryTrace').length,1);
 assert.equal(result.counts.BLOCKED,1);
});
test('stale linked Ib stays a review issue, not an approved check',()=>{
 const b=bundle();b.sections.deliveryTrace.issues=[{
  code:'DELIVERY_LINKED_IB_RECALCULATION_REQUIRED',level:'UNKNOWN',lineId:'C1'}];
 const out=reg(b,project());assert.equal(out.counts.UNKNOWN,1);
 assert.equal(out.counts.BLOCKED,0);
 assert.equal(out.engineeringApproved,false);
});
test('line ID missing from current project is preserved as orphan object',()=>{
 const b=bundle();b.sections.deliveryTrace.issues[0].lineId='REMOVED_LINE';
 const out=reg(b,project()),x=out.entries.find(i=>i.section==='deliveryTrace');
 assert.equal(x.circuitId,null);
 assert.equal(x.objectId,'REMOVED_LINE');
});
test('missing delivery trace in legacy minimal bundle does not add a new prerequisite',()=>{
 const b=bundle();delete b.sections.deliveryTrace;
 const out=reg(b,project());assert.equal(out.entries.length,0);
 assert.ok(!out.sections.includes('deliveryTrace'));
});
test('invalid issue payload cannot be silently discarded',()=>{
 const b=bundle();b.sections.deliveryTrace.issues=[null];
 assert.equal(reg(b,project()).counts.BLOCKED,1);
});
test('missing issues array on supplied trace reports inability to evaluate',()=>{
 const b=bundle();delete b.sections.deliveryTrace.issues;
 const out=reg(b,project());
 assert.ok(out.entries.some(i=>i.code==='SECTION_ISSUES_UNAVAILABLE'&&i.section==='deliveryTrace'));
});
test('separate circuit trace findings retain their origins',()=>{
 const b=bundle();b.sections.deliveryTrace.issues=[
 {code:'DELIVERY_SCHEMATIC_PHASE_MISMATCH',level:'BLOCKED',lineId:'C1'},
 {code:'DELIVERY_WORKFLOW_IB_MISMATCH',level:'BLOCKED',lineId:'C2'}];
 const out=reg(b,project());
 assert.equal(out.counts.BLOCKED,2);
 assert.deepEqual(out.entries.map(x=>x.circuitId),['C1','C2']);
});
test('HTML navigation targets real circuit without unsafe markup',()=>{
 const out=reg(bundle(),project()),markup=html(out,'C1');
 assert.match(markup,/data-issue-focus="C1"/);
 assert.match(markup,/DELIVERY_BOARD_BOM_SKU_MISMATCH/);
 assert.doesNotMatch(markup,/<script/);
});
test('CSV carries delivery trace origin and circuit',()=>{
 const out=reg(bundle(),project()),text=csv(out);
 assert.match(text,/deliveryTrace/);
 assert.match(text,/DELIVERY_BOARD_BOM_SKU_MISMATCH/);
 assert.match(text,/C1/);
 assert.equal(text.charCodeAt(0),0xFEFF);
});
test('CSV neutralizes hostile line ID and issue values',()=>{
 const b=bundle();b.sections.deliveryTrace.issues=[{
  code:'=HYPERLINK(1)',level:'BLOCKED',lineId:'-SUM(2)'}];
 const report=reg(b,project()),out=csv(report);
 assert.match(out,/"'=HYPERLINK\(1\)"/);
 assert.match(out,/"'-SUM\(2\)"/);
});
test('standalone print dossier includes trace issues in common issue section',()=>{
 const b=bundle();b.sections.issueRegister=reg(b,project());
 const out=print(b);assert.match(out,/Все инженерные замечания/);
 assert.match(out,/DELIVERY_BOARD_BOM_SKU_MISMATCH/);
 assert.match(out,/НЕ ДЛЯ МОНТАЖА/);
});
test('aggregation never changes project or bundle objects',()=>{
 const p=project(),b=bundle(),before=JSON.stringify({p,b});
 reg(b,p);
 assert.equal(JSON.stringify({p,b}),before);
});
test('independent section issues and trace issues both remain actionable',()=>{
 const b=bundle();b.sections.protection.issues=[{code:'IN_GT_IZ',level:'BLOCKED',lineId:'C1'}];
 const out=reg(b,project());assert.equal(out.counts.BLOCKED,2);
 assert.ok(out.entries.some(x=>x.section==='protection'));
 assert.ok(out.entries.some(x=>x.section==='deliveryTrace'));
});

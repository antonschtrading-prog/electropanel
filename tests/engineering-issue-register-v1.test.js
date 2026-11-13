'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epEngineeringIssueRegisterV1:reg,epEngineeringIssueRegisterHtmlV1:html,epEngineeringIssueRegisterCsvV1:csv}
 =require('../engineering-issue-register-v1');
const bundle=()=>({sections:Object.fromEntries(['dossier','bom','board','layoutAlternatives','protection','crossView','engineering']
 .map(name=>[name,{issues:[]}]))});
test('complete empty sections remain unknown not approved',()=>{
 const r=reg(bundle());assert.equal(r.status,'UNKNOWN');assert.equal(r.entries.length,0);
 assert.equal(r.ready_for_installation,false);
});
test('missing section fails closed',()=>{
 const b=bundle();delete b.sections.bom;
 const r=reg(b);assert.equal(r.status,'BLOCKED');
 assert(r.entries.some(x=>x.section==='bom'&&x.code==='SECTION_ISSUES_UNAVAILABLE'));
});
test('issues from different engineering views retain provenance',()=>{
 const b=bundle();b.sections.protection.issues=[{code:'IN_GT_IZ',level:'BLOCKED',lineId:'L1'}];
 b.sections.board.issues=[{code:'ARTICLE_MISSING',level:'UNKNOWN',id:'D1'}];
 const r=reg(b);assert.equal(r.counts.BLOCKED,1);assert.equal(r.counts.UNKNOWN,1);
 assert.equal(r.entries[0].section,'board');assert.equal(r.entries[1].circuitId,'L1');
});
test('invalid issues block instead of being dropped',()=>{
 const b=bundle();b.sections.crossView.issues=[null,{}];
 assert.equal(reg(b).counts.BLOCKED,2);
});
test('HTML allows navigation to circuit and escapes hostile content',()=>{
 const b=bundle();b.sections.protection.issues=[{code:'<script>',level:'BLOCKED',lineId:'"><img src=x>'}];
 const h=html(reg(b));assert.doesNotMatch(h,/<script>|<img/);
 assert.match(h,/data-issue-focus="&quot;&gt;&lt;img/);
});
test('CSV neutralizes formula-like issues and IDs',()=>{
 const b=bundle();b.sections.protection.issues=[{code:'=1+1',level:'BLOCKED',lineId:' -SUM(1)'}];
 const s=csv(reg(b));assert.match(s,/"'=1\+1"/);assert.match(s,/"' -SUM\(1\)"/);
});
test('issue register does not mutate input',()=>{
 const b=bundle(),before=JSON.stringify(b);reg(b);assert.equal(JSON.stringify(b),before);
});

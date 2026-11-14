'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epLoadCurrentV1,epApplyLoadCurrentV1}=require('../load-current-v1.js');
const {epLoadCurrentEvidenceV1}=require('../load-current-evidence-v1.js');
const {epEngineeringPrintV1}=require('../engineering-print-v1.js');
const {epEngineeringIssueRegisterV1}=require('../engineering-issue-register-v1.js');
const p0=()=>({title:'Example',lines:[{id:'L1',name:'Lighting',phase:'L1',power:2.3,
 overloadInput:{izA:20}}]});
function fixture(){
 const applied=epApplyLoadCurrentV1(p0(),'L1',{mode:'single_phase',powerSource:'circuit',
  voltageV:230,powerFactor:1,efficiency:1,demandFactor:1});
 assert.ok(applied.project);const p=applied.project;
 delete p.lines[0].calculationReview;
 return p;
}
test('consistent linked load source is arithmetic-only and requires no stale flag',()=>{
 const p=fixture(),report=epLoadCurrentEvidenceV1(p);
 assert.equal(report.status,'UNKNOWN');
 assert.equal(report.issues.length,0);
 assert.equal(report.rows[0].source,'CIRCUIT_LINKED');
 assert.equal(report.summary.calculated,1);
 assert.equal(report.engineeringApproved,false);
});
test("current evidence: rounded value tampering",()=>{
 const q=fixture();q.lines[0].loadCurrentCalculation.roundedIbA=999;
 const r=epLoadCurrentEvidenceV1(q);
 assert.ok(r.issues.some(x=>x.code==="LOAD_CURRENT_SAVED_RESULT_MISMATCH"&&x.level==="BLOCKED"),JSON.stringify(r.issues));
});
test("current evidence: unrounded value tampering",()=>{
 const q=fixture();q.lines[0].loadCurrentCalculation.ibA=999;
 const r=epLoadCurrentEvidenceV1(q);
 assert.ok(r.issues.some(x=>x.code==="LOAD_CURRENT_UNROUNDED_RESULT_MISMATCH"&&x.level==="BLOCKED"),JSON.stringify(r.issues));
});
test("current evidence: wrong phase mode",()=>{
 const q=fixture();q.lines[0].phase='3Ф';
 const r=epLoadCurrentEvidenceV1(q);
 assert.ok(r.issues.some(x=>x.code==="LOAD_CURRENT_PHASE_MODE_MISMATCH"&&x.level==="BLOCKED"),JSON.stringify(r.issues));
});
test("current evidence: linked source power edited",()=>{
 const q=fixture();q.lines[0].power=4;
 const r=epLoadCurrentEvidenceV1(q);
 assert.ok(r.issues.some(x=>x.code==="LOAD_CURRENT_LINKED_POWER_MISMATCH"&&x.level==="BLOCKED"),JSON.stringify(r.issues));
});
test("current evidence: linked source power removed",()=>{
 const q=fixture();delete q.lines[0].power;
 const r=epLoadCurrentEvidenceV1(q);
 assert.ok(r.issues.some(x=>x.code==="LOAD_CURRENT_LINKED_POWER_MISMATCH"&&x.level==="BLOCKED"),JSON.stringify(r.issues));
});
test("current evidence: linked source power set null",()=>{
 const q=fixture();q.lines[0].power=null;
 const r=epLoadCurrentEvidenceV1(q);
 assert.ok(r.issues.some(x=>x.code==="LOAD_CURRENT_LINKED_POWER_MISMATCH"&&x.level==="BLOCKED"),JSON.stringify(r.issues));
});
test("current evidence: invalid declared voltage",()=>{
 const q=fixture();q.lines[0].loadCurrentCalculation.inputs.voltageV=0;
 const r=epLoadCurrentEvidenceV1(q);
 assert.ok(r.issues.some(x=>x.code==="LOAD_CURRENT_INPUTS_INVALID"&&x.level==="BLOCKED"),JSON.stringify(r.issues));
});
test("current evidence: invalid declared cos phi",()=>{
 const q=fixture();q.lines[0].loadCurrentCalculation.inputs.powerFactor=2;
 const r=epLoadCurrentEvidenceV1(q);
 assert.ok(r.issues.some(x=>x.code==="LOAD_CURRENT_INPUTS_INVALID"&&x.level==="BLOCKED"),JSON.stringify(r.issues));
});
test("current evidence: invalid declared efficiency",()=>{
 const q=fixture();q.lines[0].loadCurrentCalculation.inputs.efficiency=0;
 const r=epLoadCurrentEvidenceV1(q);
 assert.ok(r.issues.some(x=>x.code==="LOAD_CURRENT_INPUTS_INVALID"&&x.level==="BLOCKED"),JSON.stringify(r.issues));
});
test("current evidence: invalid declared demand factor",()=>{
 const q=fixture();q.lines[0].loadCurrentCalculation.inputs.demandFactor=0;
 const r=epLoadCurrentEvidenceV1(q);
 assert.ok(r.issues.some(x=>x.code==="LOAD_CURRENT_INPUTS_INVALID"&&x.level==="BLOCKED"),JSON.stringify(r.issues));
});
test("current evidence: faulty formula mode",()=>{
 const q=fixture();q.lines[0].loadCurrentCalculation.mode='DC';
 const r=epLoadCurrentEvidenceV1(q);
 assert.ok(r.issues.some(x=>x.code==="LOAD_CURRENT_INPUTS_INVALID"&&x.level==="BLOCKED"),JSON.stringify(r.issues));
});
test("current evidence: missing declared input",()=>{
 const q=fixture();delete q.lines[0].loadCurrentCalculation.inputs;
 const r=epLoadCurrentEvidenceV1(q);
 assert.ok(r.issues.some(x=>x.code==="LOAD_CURRENT_INPUTS_INVALID"&&x.level==="BLOCKED"),JSON.stringify(r.issues));
});
test("current evidence: entered current no longer equals result",()=>{
 const q=fixture();q.lines[0].overloadInput.ibA=9;
 const r=epLoadCurrentEvidenceV1(q);
 assert.ok(r.issues.some(x=>x.code==="LOAD_CURRENT_IB_DIFFERS_FROM_RESULT"&&x.level==="BLOCKED"),JSON.stringify(r.issues));
});
test("current evidence: entered current missing",()=>{
 const q=fixture();delete q.lines[0].overloadInput;
 const r=epLoadCurrentEvidenceV1(q);
 assert.ok(r.issues.some(x=>x.code==="LOAD_CURRENT_IB_MISSING"&&x.level==="UNKNOWN"),JSON.stringify(r.issues));
});
test("current evidence: entered current zero",()=>{
 const q=fixture();q.lines[0].overloadInput.ibA=0;
 const r=epLoadCurrentEvidenceV1(q);
 assert.ok(r.issues.some(x=>x.code==="LOAD_CURRENT_IB_MISSING"&&x.level==="UNKNOWN"),JSON.stringify(r.issues));
});
test("current evidence: stale flag retained",()=>{
 const q=fixture();q.lines[0].loadCurrentCalculation.stale=true;
 const r=epLoadCurrentEvidenceV1(q);
 assert.ok(r.issues.some(x=>x.code==="LOAD_CURRENT_STALE"&&x.level==="UNKNOWN"),JSON.stringify(r.issues));
});
test("current evidence: pending review preserved",()=>{
 const q=fixture();q.lines[0].calculationReview={required:true,pending:['faultInput']};
 const r=epLoadCurrentEvidenceV1(q);
 assert.ok(r.issues.some(x=>x.code==="LOAD_CURRENT_REVIEW_REQUIRED"&&x.level==="UNKNOWN"),JSON.stringify(r.issues));
});
test("current evidence: unknown provenance source",()=>{
 const q=fixture();q.lines[0].loadCurrentCalculation.powerSource='SYSTEM_GUESS';
 const r=epLoadCurrentEvidenceV1(q);
 assert.ok(r.issues.some(x=>x.code==="LOAD_CURRENT_SOURCE_UNKNOWN"&&x.level==="UNKNOWN"),JSON.stringify(r.issues));
});
test("current evidence: invalid evidence record",()=>{
 const q=fixture();q.lines[0].loadCurrentCalculation=[];
 const r=epLoadCurrentEvidenceV1(q);
 assert.ok(r.issues.some(x=>x.code==="LOAD_CURRENT_RECORD_INVALID"&&x.level==="BLOCKED"),JSON.stringify(r.issues));
});
test("current evidence: invalid evidence string",()=>{
 const q=fixture();q.lines[0].loadCurrentCalculation='invalid';
 const r=epLoadCurrentEvidenceV1(q);
 assert.ok(r.issues.some(x=>x.code==="LOAD_CURRENT_RECORD_INVALID"&&x.level==="BLOCKED"),JSON.stringify(r.issues));
});
test("current evidence: manual source ignores unrelated circuit power",()=>{
 const q=fixture();q.lines[0].loadCurrentCalculation.powerSource='manual';q.lines[0].power=4;
 const r=epLoadCurrentEvidenceV1(q);
 assert.equal(r.issues.some(x=>x.code==='LOAD_CURRENT_LINKED_POWER_MISMATCH'),false);
});

test('a valid manual Ib is not fabricated into a calculated source',()=>{
 const p=p0();p.lines[0].overloadInput.ibA='10';
 const r=epLoadCurrentEvidenceV1(p);
 assert.equal(r.rows[0].calculation,null);
 assert.equal(r.rows[0].source,'MANUAL_DECLARATION');
 assert.equal(r.summary.manual,1);
 assert.equal(r.issues.length,0);
});
test('missing Ib is listed without inventing voltage or calculation',()=>{
 const r=epLoadCurrentEvidenceV1(p0());
 assert.equal(r.summary.missing,1);
 assert.ok(r.issues.some(x=>x.code==='LOAD_CURRENT_IB_MISSING'&&x.level==='UNKNOWN'));
});
test('manual override can be stale without treating its new Ib as a linked formula result',()=>{
 const p=fixture();
 p.lines[0].loadCurrentCalculation.powerSource='manual';
 p.lines[0].loadCurrentCalculation.stale=true;
 p.lines[0].overloadInput.ibA=11;
 const r=epLoadCurrentEvidenceV1(p);
 assert.ok(r.issues.some(x=>x.code==='LOAD_CURRENT_IB_DIFFERS_FROM_RESULT'&&x.level==='UNKNOWN'));
 assert.equal(r.status,'UNKNOWN');
});
test('independent parallel circuits report each issue under correct line ID',()=>{
 const p=fixture(),second=structuredClone(p.lines[0]);
 second.id='L2';second.overloadInput.ibA=999;p.lines.push(second);
 const r=epLoadCurrentEvidenceV1(p);
 assert.ok(r.issues.some(x=>x.lineId==='L2'&&x.code==='LOAD_CURRENT_IB_DIFFERS_FROM_RESULT'));
 assert.equal(r.issues.some(x=>x.lineId==='L1'),false);
});
test('duplicate IDs are blocking and never treated as independent validated circuits',()=>{
 const p=fixture();p.lines.push({...p.lines[0]});
 const r=epLoadCurrentEvidenceV1(p);
 assert.ok(r.issues.some(x=>x.code==='LOAD_CURRENT_CIRCUIT_INVALID'));
 assert.equal(r.status,'BLOCKED');
});
test('malformed project and excessive circuit count are blocked',()=>{
 assert.equal(epLoadCurrentEvidenceV1(null).status,'BLOCKED');
 assert.equal(epLoadCurrentEvidenceV1({lines:Array.from({length:401},()=>({id:'X'}))}).status,'BLOCKED');
});
test('calculator exception is a blocking evidence issue',()=>{
 const p=fixture();
 const r=epLoadCurrentEvidenceV1(p,()=>{throw Error('calculation unavailable');});
 assert.ok(r.issues.some(x=>x.code==='LOAD_CURRENT_RECALCULATION_FAILED'));
});
test('manual power source is never silently promoted to a verified calculation',()=>{
 const p=fixture();p.lines[0].loadCurrentCalculation.powerSource='manual';
 const r=epLoadCurrentEvidenceV1(p);
 assert.equal(r.rows[0].source,'MANUAL_CALCULATION');
 assert.equal(r.engineeringApproved,false);
});
test('printed engineering bundle exposes source, review and draft status',()=>{
 const r=epLoadCurrentEvidenceV1(fixture());
 const html=epEngineeringPrintV1({projectTitle:'Board',overallStatus:'UNKNOWN',
  sections:{loadCurrent:r}});
 for(const field of ['Источник Ib','Повторная проверка','CIRCUIT_LINKED','UNKNOWN'])
  assert.ok(html.includes(field),field);
 assert.match(html,/НЕ ДЛЯ МОНТАЖА/);
});
test('load-current evidence issues reach shared engineering issue register',()=>{
 const project=fixture();project.lines[0].overloadInput.ibA=5;
 const evidence=epLoadCurrentEvidenceV1(project);
 const reg=epEngineeringIssueRegisterV1({sections:{loadCurrent:evidence}},project);
 assert.ok(reg.entries.some(x=>x.section==='loadCurrent'&&
  x.code==='LOAD_CURRENT_IB_DIFFERS_FROM_RESULT'&&x.circuitId==='L1'));
});
test('provenance audit never modifies original project',()=>{
 const p=fixture(),saved=JSON.stringify(p);
 epLoadCurrentEvidenceV1(p);
 assert.equal(JSON.stringify(p),saved);
});
test('reported current evidence makes no safety or installation approval claim',()=>{
 const r=epLoadCurrentEvidenceV1(fixture());
 assert.equal(r.engineeringApproved,false);
 assert.equal(r.ready_for_installation,false);
 assert.ok(r.rows.every(x=>x.status!=='PASS'));
});
test('verified arithmetic remains invalid if phase or source attribution is inconsistent',()=>{
 const p=fixture(),line=p.lines[0];line.phase='3Ф';line.power=8;
 const r=epLoadCurrentEvidenceV1(p);
 assert.equal(r.status,'BLOCKED');
 assert.ok(r.issues.some(x=>x.code==='LOAD_CURRENT_PHASE_MODE_MISMATCH'));
 assert.ok(r.issues.some(x=>x.code==='LOAD_CURRENT_LINKED_POWER_MISMATCH'));
});

'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
global.epDraftBoardPlanV1=require('../draft-board-plan-v1.js').epDraftBoardPlanV1;
const {epCircuitDossierV1,epCircuitDossierCsvV1,epCircuitDossierPanelV1}=require('../circuit-dossier-v1.js');
const project=()=>({railCount:1,railCapacity:4,lines:[{id:'L1',name:'Розетки',phase:'L1',power:2,modules:1,
 catalogSku:'A',overloadInput:{ibA:10,izA:20},faultInput:{ikKa:3},route44Input:{length:20}}]});
const lookup=()=>({maker:'Example',series:'S',source:'https://example.org',modules:1});
test('trace includes declared currents, article provenance and DIN position',()=>{
 const x=epCircuitDossierV1(project(),lookup).rows[0];assert.equal(x.declared.ikKa,3);
 assert.equal(x.articleSource,'https://example.org');assert.deepEqual(x.placement,{rail:1,from:1,to:1});
});
test('unknown catalogue article blocks',()=>assert.ok(epCircuitDossierV1(project(),()=>null).issues.some(x=>x.code==='ARTICLE_UNKNOWN')));
test('unplaced circuit is blocked',()=>{const p=project();p.railCapacity=1;p.lines.push({id:'L2',modules:1});assert.ok(epCircuitDossierV1(p,lookup).issues.some(x=>x.code==='CIRCUIT_NOT_PLACED'));});
test('calculation review is surfaced and blocks',()=>{const p=project();p.lines[0].calculationReview={required:true};assert.equal(epCircuitDossierV1(p,lookup).status,'BLOCKED');});
test('CSV escapes semicolons, quotes and newlines',()=>{const p=project();p.lines[0].name='A;"B"\nC';const csv=epCircuitDossierCsvV1(epCircuitDossierV1(p,lookup));assert.match(csv,/"A;""B""\nC"/);});
test('HTML escapes line and article input',()=>{const p=project();p.lines[0].name='<img src=x onerror=alert(1)>';const html=epCircuitDossierPanelV1(p,lookup);assert.doesNotMatch(html,/<img/);assert.match(html,/&lt;img/);});
test('pure projection leaves project unchanged',()=>{const p=project(),before=JSON.stringify(p);epCircuitDossierV1(p,lookup);assert.equal(JSON.stringify(p),before);});
test('never claims installation approval',()=>{const x=epCircuitDossierV1(project(),lookup);assert.equal(x.engineeringApproved,false);assert.equal(x.ready_for_installation,false);});

test('invalid project is blocked, not treated as empty',()=>{
 assert.equal(epCircuitDossierV1(null).status,'BLOCKED');
 assert.equal(epCircuitDossierV1({lines:[]}).status,'BLOCKED');
});
test('declared numeric inputs must be positive finite numbers',()=>{
 const p=project();p.lines[0].overloadInput.ibA='-10';
 assert.ok(epCircuitDossierV1(p,lookup).issues.some(x=>x.code==='INVALID_OR_MISSING_IBA'));
});
test('missing route and unknown phase are visible',()=>{
 const p=project();delete p.lines[0].route44Input;p.lines[0].phase='X';
 const codes=epCircuitDossierV1(p,lookup).issues.map(x=>x.code);
 assert.ok(codes.includes('ROUTE_NOT_DECLARED'));assert.ok(codes.includes('PHASE_UNKNOWN'));
});
test('duplicate apparatus mappings are blocked',()=>{
 const p=project();p.branchDevices=[{id:'B1',circuitId:'L1',modules:1},{id:'B2',circuitId:'L1',modules:1}];
 assert.ok(epCircuitDossierV1(p,lookup).issues.some(x=>x.code==='DUPLICATE_BRANCH_BINDING'));
});
test('article width mismatch is blocked',()=>{
 const p=project();assert.ok(epCircuitDossierV1(p,()=>({...lookup(),modules:2})).issues.some(x=>x.code==='ARTICLE_WIDTH_CONFLICT'));
});
test('CSV defangs spreadsheet formulas in user supplied names',()=>{
 const p=project();p.lines[0].name='=HYPERLINK("https://example.org")';
 const csv=epCircuitDossierCsvV1(epCircuitDossierV1(p,lookup));
 assert.match(csv,/"'=HYPERLINK\(""https:\/\/example.org""\)"/);
});

test('CSV defangs leading whitespace followed by spreadsheet formula',()=>{
 const p=project();p.lines[0].name='  +SUM(1,2)';
 const csv=epCircuitDossierCsvV1(epCircuitDossierV1(p,lookup));
 assert.ok(csv.includes('"\'  +SUM(1,2)"'));
});

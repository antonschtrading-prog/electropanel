'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {epDesignQualityGatesV1:review}=require('../design-quality-gates-v1.js');
const article=()=>({sku:'A',maker:'Maker',series:'Series',source:'https://example.org',widthMm:18,modules:1});
const line=()=>({id:'L1',power:2,phase:'L1'});
const device=()=>({id:'Q1',xMm:0,widthMm:18});
const base=()=>({lines:[line()],catalogArticles:[article()],dinEvidence:{railWidthMm:36,devices:[device()]}});
const cases=[
 ['G01',p=>{delete p.lines[0].id},'UNKNOWN'],
 ['G02',p=>p.lines.push({...line()}),'BLOCKED'],
 ['G03',p=>p.lines[0].power=-1,'BLOCKED'],
 ['G04',p=>p.lines[0].phase='INVALID','BLOCKED'],
 ['G05',p=>p.lines[0].loadCurrentCalculation={stale:true},'UNKNOWN'],
 ['G06',p=>{p.lines[0].loadCurrentCalculation={roundedIbA:10};p.lines[0].overloadInput={ibA:12}},'BLOCKED'],
 ['G07',p=>p.lines[0].selectedCableSectionMm2=-2,'BLOCKED'],
 ['G08',p=>p.lines[0].voltageDropCalculation={stale:true},'UNKNOWN'],
 ['G09',p=>p.lines[0].voltageDropCalculation={dropPercent:8,maxDropPercent:5},'BLOCKED'],
 ['G10',p=>p.lines[0].catalogSku='missing','UNKNOWN'],
 ['G11',p=>delete p.catalogArticles[0].sku,'UNKNOWN'],
 ['G12',p=>p.catalogArticles.push({...article()}),'BLOCKED'],
 ['G13',p=>delete p.catalogArticles[0].maker,'UNKNOWN'],
 ['G14',p=>delete p.catalogArticles[0].source,'UNKNOWN'],
 ['G15',p=>delete p.catalogArticles[0].widthMm,'UNKNOWN'],
 ['G16',p=>p.dinEvidence.railWidthMm=-1,'BLOCKED'],
 ['G17',p=>p.dinEvidence.devices.push({...device()}),'BLOCKED'],
 ['G18',p=>p.dinEvidence.devices[0].widthMm=0,'BLOCKED'],
 ['G19',p=>p.dinEvidence.devices[0].xMm=30,'BLOCKED'],
 ['G20',p=>p.dinEvidence.devices.push({id:'Q2',xMm:10,widthMm:18}),'BLOCKED']
];
for(const [id,mutate,expected] of cases)test(id+' detects its targeted quality defect',()=>{
 const p=base();mutate(p);const r=review(p);
 assert.ok(r.issues.some(i=>i.gate===id&&i.status===expected),JSON.stringify(r.issues));
 assert.equal(r.engineeringApproved,false);
});
test('valid declarations still cannot imply engineering approval',()=>{
 const r=review(base());assert.equal(r.status,'UNKNOWN');assert.equal(r.engineeringApproved,false);
 assert.equal(r.issues.length,0);
});
test('absent DIN evidence remains unknown',()=>{
 const p=base();delete p.dinEvidence;
 const r=review(p);assert.equal(r.status,'UNKNOWN');
 assert.equal(r.checks.filter(c=>c.scope==='din').length,5);
});
test('malformed project fails closed',()=>assert.equal(review(null).status,'BLOCKED'));

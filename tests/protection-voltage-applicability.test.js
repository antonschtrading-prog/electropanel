'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epProtectionInputsV1:apply}=require('../protection-inputs-v1.js');
const {epProtectiveDeviceShortlistV1:shortlist}=require('../protective-device-shortlist-v1.js');
global.epProtectiveDeviceShortlistV1=shortlist;
const {epProtectionWorkbenchV1:workbench,epProtectionWorkbenchHtmlV1:html}=require('../protection-workbench-v1.js');
const {epCircuitDesignReviewV1:review}=require('../circuit-design-review-v1.js');
const {epSingleLineDraftV1:scheme}=require('../single-line-draft-v1.js');
const {epSchematicCrossViewV1:schemeAudit,epProtectionProjectionAuditV1:protectionAudit}=
 require('../cross-view-audit-v1.js');
const {epSingleLineSvgV1:svg}=require('../single-line-svg-v1.js');
const {epEngineeringPrintV1:print}=require('../engineering-print-v1.js');
function fixture(voltageV=230,icnVoltageV=230){
 const d={id:'B16',sku:'B16-FACTORY',maker:'Maker',series:'IEC MCB',
  label:'Breaker B16',kind:'MCB',inA:16,icnKa:6,
  icnVoltageV,icnStandard:'IEC/EN 60898-1',curve:'B',modules:1,widthMm:18,poles:1,
  poleConfiguration:'1P',source:'https://example.org/datasheet',verificationStatus:'VERIFIED'};
 const p={railCount:1,railCapacity:12,lines:[{id:'L1',name:'Lighting',phase:'L1',catalogSku:'B16',
  device:'Breaker B16',modules:1,overloadInput:{ibA:10,izA:25},
  faultInput:{ikKa:3,...(voltageV===null?{}:{voltageV})}}],
  sharedDevices:[],branchDevices:[{id:'BD1',circuitId:'L1',label:'Breaker B16',modules:1}]};
 return {p,d,lookup:()=>d};
}
const declarations={ibA:10,izA:25,ikKa:3};
test('manual form records source-declared voltage without changing the source project',()=>{
 const {p}=fixture(null),before=JSON.stringify(p);
 const r=apply(p,'L1',{...declarations,voltageV:'230'});
 assert.ok(r.project);assert.equal(r.project.lines[0].faultInput.voltageV,230);
 assert.equal(r.values.voltageV,230);
 assert.equal(JSON.stringify(p),before);
 assert.equal(r.engineeringApproved,false);
});
test('legacy input contract preserves existing voltage when form does not submit it',()=>{
 const {p}=fixture(400);const r=apply(p,'L1',declarations);
 assert.equal(r.project.lines[0].faultInput.voltageV,400);
 assert.deepEqual(r.values,declarations);
});
test('clearing explicit voltage removes old claim and reopens review',()=>{
 const {p}=fixture(400);const r=apply(p,'L1',{...declarations,voltageV:''});
 assert.ok(r.project);
 assert.equal(r.project.lines[0].faultInput.voltageV,undefined);
 assert.equal(r.project.lines[0].calculationReview.required,true);
 assert.equal(r.values.voltageV,null);
});
test('comma decimal voltage is normalized as declared',()=>{
 const {p}=fixture(null);
 const r=apply(p,'L1',{...declarations,voltageV:'230,5'});
 assert.equal(r.project.lines[0].faultInput.voltageV,230.5);
});
test("invalid zero voltage rejected atomically",()=>{
 const {p}=fixture(230),before=JSON.stringify(p);
 const r=apply(p,'L1',{...declarations,voltageV:0});
 assert.equal(r.status,'BLOCKED');
 assert.equal(r.code,'FAULT_VOLTAGE_INVALID');
 assert.equal(r.project,null);
 assert.equal(JSON.stringify(p),before);
});
test("invalid negative voltage rejected atomically",()=>{
 const {p}=fixture(230),before=JSON.stringify(p);
 const r=apply(p,'L1',{...declarations,voltageV:-220});
 assert.equal(r.status,'BLOCKED');
 assert.equal(r.code,'FAULT_VOLTAGE_INVALID');
 assert.equal(r.project,null);
 assert.equal(JSON.stringify(p),before);
});
test("invalid beyond permitted range voltage rejected atomically",()=>{
 const {p}=fixture(230),before=JSON.stringify(p);
 const r=apply(p,'L1',{...declarations,voltageV:1600});
 assert.equal(r.status,'BLOCKED');
 assert.equal(r.code,'FAULT_VOLTAGE_INVALID');
 assert.equal(r.project,null);
 assert.equal(JSON.stringify(p),before);
});
test("invalid non-numeric voltage rejected atomically",()=>{
 const {p}=fixture(230),before=JSON.stringify(p);
 const r=apply(p,'L1',{...declarations,voltageV:"abc"});
 assert.equal(r.status,'BLOCKED');
 assert.equal(r.code,'FAULT_VOLTAGE_INVALID');
 assert.equal(r.project,null);
 assert.equal(JSON.stringify(p),before);
});
test("invalid nonfinite voltage rejected atomically",()=>{
 const {p}=fixture(230),before=JSON.stringify(p);
 const r=apply(p,'L1',{...declarations,voltageV:"Infinity"});
 assert.equal(r.status,'BLOCKED');
 assert.equal(r.code,'FAULT_VOLTAGE_INVALID');
 assert.equal(r.project,null);
 assert.equal(JSON.stringify(p),before);
});
test("invalid boolean voltage rejected atomically",()=>{
 const {p}=fixture(230),before=JSON.stringify(p);
 const r=apply(p,'L1',{...declarations,voltageV:true});
 assert.equal(r.status,'BLOCKED');
 assert.equal(r.code,'FAULT_VOLTAGE_INVALID');
 assert.equal(r.project,null);
 assert.equal(JSON.stringify(p),before);
});
test("invalid object voltage rejected atomically",()=>{
 const {p}=fixture(230),before=JSON.stringify(p);
 const r=apply(p,'L1',{...declarations,voltageV:{}});
 assert.equal(r.status,'BLOCKED');
 assert.equal(r.code,'FAULT_VOLTAGE_INVALID');
 assert.equal(r.project,null);
 assert.equal(JSON.stringify(p),before);
});
test("invalid expression voltage rejected atomically",()=>{
 const {p}=fixture(230),before=JSON.stringify(p);
 const r=apply(p,'L1',{...declarations,voltageV:"230+10"});
 assert.equal(r.status,'BLOCKED');
 assert.equal(r.code,'FAULT_VOLTAGE_INVALID');
 assert.equal(r.project,null);
 assert.equal(JSON.stringify(p),before);
});
test("invalid exponent voltage rejected atomically",()=>{
 const {p}=fixture(230),before=JSON.stringify(p);
 const r=apply(p,'L1',{...declarations,voltageV:"2.3e2"});
 assert.equal(r.status,'BLOCKED');
 assert.equal(r.code,'FAULT_VOLTAGE_INVALID');
 assert.equal(r.project,null);
 assert.equal(JSON.stringify(p),before);
});
test("invalid embedded newline voltage rejected atomically",()=>{
 const {p}=fixture(230),before=JSON.stringify(p);
 const r=apply(p,'L1',{...declarations,voltageV:"230\n400"});
 assert.equal(r.status,'BLOCKED');
 assert.equal(r.code,'FAULT_VOLTAGE_INVALID');
 assert.equal(r.project,null);
 assert.equal(JSON.stringify(p),before);
});
test("Icn rating: 230 V at 230 V",()=>{
 const {p,d,lookup}=fixture(230,230);
 const row=shortlist(p.lines[0],[{id:'B16',device:d}]).candidates[0];
 const w=workbench(p,lookup,[{id:'B16',device:d}]).selected;
 const dr=review(p,lookup).rows[0];
test("Icn rating: 400 V at 230 V",()=>{
 const {p,d,lookup}=fixture(230,400);
 const row=shortlist(p.lines[0],[{id:'B16',device:d}]).candidates[0];
 const w=workbench(p,lookup,[{id:'B16',device:d}]).selected;
 const dr=review(p,lookup).rows[0];
test("Icn rating: 400 V at 400 V",()=>{
 const {p,d,lookup}=fixture(400,400);
 const row=shortlist(p.lines[0],[{id:'B16',device:d}]).candidates[0];
 const w=workbench(p,lookup,[{id:'B16',device:d}]).selected;
 const dr=review(p,lookup).rows[0];
test("Icn rating: 230 V at 400 V",()=>{
 const {p,d,lookup}=fixture(400,230);
 const row=shortlist(p.lines[0],[{id:'B16',device:d}]).candidates[0];
 const w=workbench(p,lookup,[{id:'B16',device:d}]).selected;
 const dr=review(p,lookup).rows[0];
test("Icn rating: 380 V at 400 V",()=>{
 const {p,d,lookup}=fixture(400,380);
 const row=shortlist(p.lines[0],[{id:'B16',device:d}]).candidates[0];
 const w=workbench(p,lookup,[{id:'B16',device:d}]).selected;
 const dr=review(p,lookup).rows[0];
test("Icn rating: 690 V at 400 V",()=>{
 const {p,d,lookup}=fixture(400,690);
 const row=shortlist(p.lines[0],[{id:'B16',device:d}]).candidates[0];
 const w=workbench(p,lookup,[{id:'B16',device:d}]).selected;
 const dr=review(p,lookup).rows[0];
test("Icn rating: 220 V at 230 V",()=>{
 const {p,d,lookup}=fixture(230,220);
 const row=shortlist(p.lines[0],[{id:'B16',device:d}]).candidates[0];
 const w=workbench(p,lookup,[{id:'B16',device:d}]).selected;
 const dr=review(p,lookup).rows[0];
 assert.equal(row.status,'POTENTIAL',JSON.stringify(row));
 assert.equal(row.reasons.includes('ICN_VOLTAGE_LT_DECLARED'),false);
 assert.equal(w.reasons.includes('ARTICLE_ICN_VOLTAGE_LT_DECLARED'),false);
 assert.equal(dr.reasons.some(x=>x.code==='CATALOG_ICN_VOLTAGE_LT_DECLARED'),false);
});
 assert.equal(row.status,'POTENTIAL',JSON.stringify(row));
 assert.equal(row.reasons.includes('ICN_VOLTAGE_LT_DECLARED'),false);
 assert.equal(w.reasons.includes('ARTICLE_ICN_VOLTAGE_LT_DECLARED'),false);
 assert.equal(dr.reasons.some(x=>x.code==='CATALOG_ICN_VOLTAGE_LT_DECLARED'),false);
});
 assert.equal(row.status,'POTENTIAL',JSON.stringify(row));
 assert.equal(row.reasons.includes('ICN_VOLTAGE_LT_DECLARED'),false);
 assert.equal(w.reasons.includes('ARTICLE_ICN_VOLTAGE_LT_DECLARED'),false);
 assert.equal(dr.reasons.some(x=>x.code==='CATALOG_ICN_VOLTAGE_LT_DECLARED'),false);
});
 assert.equal(row.status,'REJECTED',JSON.stringify(row));
 assert.ok(row.reasons.includes('ICN_VOLTAGE_LT_DECLARED'));
 assert.ok(w.reasons.includes('ARTICLE_ICN_VOLTAGE_LT_DECLARED'));
 assert.equal(w.status,'BLOCKED');
 assert.ok(dr.reasons.some(x=>x.code==='CATALOG_ICN_VOLTAGE_LT_DECLARED'&&x.level==='BLOCKED'));
});
 assert.equal(row.status,'REJECTED',JSON.stringify(row));
 assert.ok(row.reasons.includes('ICN_VOLTAGE_LT_DECLARED'));
 assert.ok(w.reasons.includes('ARTICLE_ICN_VOLTAGE_LT_DECLARED'));
 assert.equal(w.status,'BLOCKED');
 assert.ok(dr.reasons.some(x=>x.code==='CATALOG_ICN_VOLTAGE_LT_DECLARED'&&x.level==='BLOCKED'));
});
 assert.equal(row.status,'POTENTIAL',JSON.stringify(row));
 assert.equal(row.reasons.includes('ICN_VOLTAGE_LT_DECLARED'),false);
 assert.equal(w.reasons.includes('ARTICLE_ICN_VOLTAGE_LT_DECLARED'),false);
 assert.equal(dr.reasons.some(x=>x.code==='CATALOG_ICN_VOLTAGE_LT_DECLARED'),false);
});
 assert.equal(row.status,'REJECTED',JSON.stringify(row));
 assert.ok(row.reasons.includes('ICN_VOLTAGE_LT_DECLARED'));
 assert.ok(w.reasons.includes('ARTICLE_ICN_VOLTAGE_LT_DECLARED'));
 assert.equal(w.status,'BLOCKED');
 assert.ok(dr.reasons.some(x=>x.code==='CATALOG_ICN_VOLTAGE_LT_DECLARED'&&x.level==='BLOCKED'));
});

test('undeclared operating voltage does not manufacture a 230/400-V assumption',()=>{
 const {p,d,lookup}=fixture(null,400);
 const row=shortlist(p.lines[0],[{id:'B16',device:d}]).candidates[0];
 const w=workbench(p,lookup,[{id:'B16',device:d}]).selected;
 const r=review(p,lookup).rows[0];
 assert.equal(row.status,'POTENTIAL');
 assert.ok(row.caution.includes('FAULT_VOLTAGE_UNDECLARED'));
 assert.ok(w.reasons.includes('FAULT_VOLTAGE_UNDECLARED'));
 assert.ok(r.reasons.some(x=>x.code==='FAULT_VOLTAGE_NOT_DECLARED'));
 assert.equal(w.engineeringApproved,false);
});
test('missing manufacturer rated voltage remains a gap, not a fabricated pass',()=>{
 const {p,d,lookup}=fixture(230,null);
 const row=shortlist(p.lines[0],[{id:'B16',device:d}]).candidates[0];
 assert.ok(row.caution.includes('ICN_RATED_VOLTAGE_UNDECLARED'));
 const w=workbench(p,lookup,[{id:'B16',device:d}]).selected;
 assert.ok(w.reasons.includes('ARTICLE_ICN_VOLTAGE_UNDECLARED'));
 const dr=review(p,lookup).rows[0];
 assert.ok(dr.reasons.some(x=>x.code==='CATALOG_ICN_VOLTAGE_UNDECLARED'));
});
test('HTML form exposes a separate declared rated-voltage input',()=>{
 const {p,d,lookup}=fixture(400,400);
 const markup=html(workbench(p,lookup,[{id:'B16',device:d}]));
 assert.match(markup,/name="voltageV"/);
 assert.match(markup,/value="400"/);
 assert.match(markup,/Напряжение сети для проверки Icn/);
});
test('project protection view preserves explicit voltage',()=>{
 const {p,d,lookup}=fixture(400,400);
 const row=workbench(p,lookup,[{id:'B16',device:d}]).rows[0];
 assert.equal(row.voltageV,400);
 assert.equal(row.selectedArticle.icnVoltageV,400);
});
test('schematic preserves the declared voltage instead of deriving it',()=>{
 const {p,d,lookup}=fixture(400,400),view=scheme(p,lookup);
 assert.equal(view.nodes.find(x=>x.id==='CIRCUIT:L1').design.voltageV,400);
 assert.ok(svg(view).includes('U заявл. 400 В'));
 assert.equal(schemeAudit(p,view,lookup).issues.some(x=>x.code==='SCHEMATIC_DESIGN_FAULT_VOLTAGE_STALE'),false);
});
test('stale voltage on schematic is identified',()=>{
 const {p,d,lookup}=fixture(230,400),view=scheme(p,lookup);
 view.nodes.find(x=>x.id==='CIRCUIT:L1').design.voltageV=400;
 assert.ok(schemeAudit(p,view,lookup).issues.some(x=>x.code==='SCHEMATIC_DESIGN_FAULT_VOLTAGE_STALE'));
});
test('stale voltage on protection projection is identified',()=>{
 const {p,d,lookup}=fixture(230,400),w=workbench(p,lookup,[{id:'B16',device:d}]);
 w.rows[0].voltageV=400;
 assert.ok(protectionAudit(p,w,lookup).issues.some(x=>x.code==='PROTECTION_FAULT_VOLTAGE_STALE'));
});
test('draft report prints operating and rated Icn voltages as distinct declared data',()=>{
 const {p,d,lookup}=fixture(230,400),w=workbench(p,lookup,[{id:'B16',device:d}]);
 const report=print({projectTitle:'Draft',overallStatus:'UNKNOWN',sections:{protection:w,singleLine:scheme(p,lookup)}});
 assert.match(report,/Напряжение сети, В/);
 assert.match(report,/Напряжение Icn, В/);
 assert.match(report,/НЕ ДЛЯ МОНТАЖА/);
});
test('protection report source remains unchanged after voltage validation',()=>{
 const {p,d,lookup}=fixture(400,230),snapshot=JSON.stringify(p);
 shortlist(p.lines[0],[{id:'B16',device:d}]);
 workbench(p,lookup,[{id:'B16',device:d}]);review(p,lookup);
 assert.equal(JSON.stringify(p),snapshot);
});

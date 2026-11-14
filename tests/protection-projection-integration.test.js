'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
global.epProtectiveDeviceShortlistV1=require('../protective-device-shortlist-v1.js').epProtectiveDeviceShortlistV1;
const {epProtectionWorkbenchV1}=require('../protection-workbench-v1.js');
const {epProtectionProjectionAuditV1:audit,epCrossViewAuditV1:crossView}=
 require('../cross-view-audit-v1.js');
const {epDraftBomV1}=require('../draft-bom-v1.js');
const {epDraftBoardPlanV1}=require('../draft-board-plan-v1.js');
const {epSingleLineDraftV1}=require('../single-line-draft-v1.js');
function fixture(){
 const p={lines:[{id:'L1',name:'Lighting',phase:'L1',device:'Breaker B16',
  catalogSku:'B16-1',modules:1,overloadInput:{ibA:10,izA:25},faultInput:{ikKa:5},
  loadCurrentCalculation:{roundedIbA:10,stale:false}}],
  sharedDevices:[],railCount:1,railCapacity:12,
  branchDevices:[{id:'BD1',label:'Breaker B16',modules:1,circuitId:'L1'}]};
 const d={sku:'MFR-B16',maker:'Maker',series:'Series',kind:'MCB',label:'Breaker B16',
  inA:16,icnKa:6,poles:1,modules:1,widthMm:18,
  source:'https://example.org/b16',verificationStatus:'VERIFIED'};
 const lookup=()=>d;
 const protection=epProtectionWorkbenchV1(p,lookup,[{id:'B16-1',device:d}],null);
 assert.equal(protection.rows.length,1);
 return {p,d,protection,lookup,r:protection.rows[0]};
}
test('fresh protection row matches project and current catalogue data',()=>{
 const {p,protection,lookup}=fixture();
 assert.deepEqual(audit(p,protection,lookup).issues,[]);
 assert.equal(audit(p,protection,lookup).engineeringApproved,false);
});
test("Ib changed only in protection row",()=>{
 const {p,d,r,protection,lookup}=fixture();
 r.ibA=15;
 const result=audit(p,protection,lookup);
 assert.ok(result.issues.some(x=>x.code==="PROTECTION_IB_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("Iz changed only in protection row",()=>{
 const {p,d,r,protection,lookup}=fixture();
 r.izA=26;
 const result=audit(p,protection,lookup);
 assert.ok(result.issues.some(x=>x.code==="PROTECTION_IZ_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("Ik changed only in protection row",()=>{
 const {p,d,r,protection,lookup}=fixture();
 r.ikKa=7;
 const result=audit(p,protection,lookup);
 assert.ok(result.issues.some(x=>x.code==="PROTECTION_IK_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("phase changed only in projection",()=>{
 const {p,d,r,protection,lookup}=fixture();
 r.phase='L3';
 const result=audit(p,protection,lookup);
 assert.ok(result.issues.some(x=>x.code==="PROTECTION_PHASE_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("selected article ID changed only in projection",()=>{
 const {p,d,r,protection,lookup}=fixture();
 r.selectedSku='ANOTHER';
 const result=audit(p,protection,lookup);
 assert.ok(result.issues.some(x=>x.code==="PROTECTION_SELECTED_SKU_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("review becomes required in project after projection",()=>{
 const {p,d,r,protection,lookup}=fixture();
 p.lines[0].calculationReview={required:true,pending:['faultInput']};
 const result=audit(p,protection,lookup);
 assert.ok(result.issues.some(x=>x.code==="PROTECTION_REVIEW_STATUS_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("workbench falsely claims pending review",()=>{
 const {p,d,r,protection,lookup}=fixture();
 r.reasons.push('CALCULATION_REVIEW_STALE');
 const result=audit(p,protection,lookup);
 assert.ok(result.issues.some(x=>x.code==="PROTECTION_REVIEW_STATUS_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("load current becomes stale after projection",()=>{
 const {p,d,r,protection,lookup}=fixture();
 p.lines[0].loadCurrentCalculation.stale=true;
 const result=audit(p,protection,lookup);
 assert.ok(result.issues.some(x=>x.code==="PROTECTION_LOAD_STATUS_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("workbench falsely claims stale load",()=>{
 const {p,d,r,protection,lookup}=fixture();
 r.reasons.push('LOAD_CURRENT_STALE');
 const result=audit(p,protection,lookup);
 assert.ok(result.issues.some(x=>x.code==="PROTECTION_LOAD_STATUS_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("Ib calculation mismatch after projection",()=>{
 const {p,d,r,protection,lookup}=fixture();
 p.lines[0].loadCurrentCalculation.roundedIbA=15;
 const result=audit(p,protection,lookup);
 assert.ok(result.issues.some(x=>x.code==="PROTECTION_IB_CALC_STATUS_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("workbench falsely claims Ib mismatch",()=>{
 const {p,d,r,protection,lookup}=fixture();
 r.reasons.push('IB_DIFFERS_FROM_CALCULATION');
 const result=audit(p,protection,lookup);
 assert.ok(result.issues.some(x=>x.code==="PROTECTION_IB_CALC_STATUS_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("manufacturer SKU changed",()=>{
 const {p,d,r,protection,lookup}=fixture();
 d.sku='NEW-SKU';
 const result=audit(p,protection,lookup);
 assert.ok(result.issues.some(x=>x.code==="PROTECTION_MANUFACTURER_SKU_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("manufacturer name changed",()=>{
 const {p,d,r,protection,lookup}=fixture();
 d.maker='NEW';
 const result=audit(p,protection,lookup);
 assert.ok(result.issues.some(x=>x.code==="PROTECTION_MAKER_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("series changed",()=>{
 const {p,d,r,protection,lookup}=fixture();
 d.series='NEW';
 const result=audit(p,protection,lookup);
 assert.ok(result.issues.some(x=>x.code==="PROTECTION_SERIES_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("article type changed to RCBO",()=>{
 const {p,d,r,protection,lookup}=fixture();
 d.kind='RCBO';
 const result=audit(p,protection,lookup);
 assert.ok(result.issues.some(x=>x.code==="PROTECTION_KIND_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("article label changed",()=>{
 const {p,d,r,protection,lookup}=fixture();
 d.label='NEW';
 const result=audit(p,protection,lookup);
 assert.ok(result.issues.some(x=>x.code==="PROTECTION_LABEL_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("article nominal current changed",()=>{
 const {p,d,r,protection,lookup}=fixture();
 d.inA=25;
 const result=audit(p,protection,lookup);
 assert.ok(result.issues.some(x=>x.code==="PROTECTION_NOMINAL_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("article breaking capacity changed",()=>{
 const {p,d,r,protection,lookup}=fixture();
 d.icnKa=10;
 const result=audit(p,protection,lookup);
 assert.ok(result.issues.some(x=>x.code==="PROTECTION_BREAKING_CAPACITY_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("article pole count changed",()=>{
 const {p,d,r,protection,lookup}=fixture();
 d.poles=2;
 const result=audit(p,protection,lookup);
 assert.ok(result.issues.some(x=>x.code==="PROTECTION_POLES_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("article width changed",()=>{
 const {p,d,r,protection,lookup}=fixture();
 d.modules=3;
 const result=audit(p,protection,lookup);
 assert.ok(result.issues.some(x=>x.code==="PROTECTION_MODULES_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("article source changed",()=>{
 const {p,d,r,protection,lookup}=fixture();
 d.source='https://example.org/updated';
 const result=audit(p,protection,lookup);
 assert.ok(result.issues.some(x=>x.code==="PROTECTION_SOURCE_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("verification status changed",()=>{
 const {p,d,r,protection,lookup}=fixture();
 d.verificationStatus='UNVERIFIED';
 const result=audit(p,protection,lookup);
 assert.ok(result.issues.some(x=>x.code==="PROTECTION_EVIDENCE_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("project declared current changed after report",()=>{
 const {p,d,r,protection,lookup}=fixture();
 p.lines[0].overloadInput.ibA=17;
 const result=audit(p,protection,lookup);
 assert.ok(result.issues.some(x=>x.code==="PROTECTION_IB_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("project cable current changed after report",()=>{
 const {p,d,r,protection,lookup}=fixture();
 p.lines[0].overloadInput.izA=18;
 const result=audit(p,protection,lookup);
 assert.ok(result.issues.some(x=>x.code==="PROTECTION_IZ_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("project short circuit current changed after report",()=>{
 const {p,d,r,protection,lookup}=fixture();
 p.lines[0].faultInput.ikKa=7;
 const result=audit(p,protection,lookup);
 assert.ok(result.issues.some(x=>x.code==="PROTECTION_IK_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("project phase changed after report",()=>{
 const {p,d,r,protection,lookup}=fixture();
 p.lines[0].phase='3Ф';
 const result=audit(p,protection,lookup);
 assert.ok(result.issues.some(x=>x.code==="PROTECTION_PHASE_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("project SKU changed after report",()=>{
 const {p,d,r,protection,lookup}=fixture();
 p.lines[0].catalogSku='ANOTHER';
 const result=audit(p,protection,lookup);
 assert.ok(result.issues.some(x=>x.code==="PROTECTION_SELECTED_SKU_STALE"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("article projection deleted",()=>{
 const {p,d,r,protection,lookup}=fixture();
 r.selectedArticle=null;
 const result=audit(p,protection,lookup);
 assert.ok(result.issues.some(x=>x.code==="PROTECTION_SELECTED_ARTICLE_MISSING"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});
test("projection reasons are invalid",()=>{
 const {p,d,r,protection,lookup}=fixture();
 r.reasons=null;
 const result=audit(p,protection,lookup);
 assert.ok(result.issues.some(x=>x.code==="PROTECTION_REASONS_INVALID"),JSON.stringify(result.issues));
 assert.equal(result.engineeringApproved,false);
});

test('missing selected article and projection metadata fail closed',()=>{
 const {p,protection}=fixture();
 const result=audit(p,protection,()=>null);
 assert.ok(result.issues.some(x=>x.code==='PROTECTION_ARTICLE_UNRESOLVED'));
});
test('lookup exceptions are detected rather than treated as valid selections',()=>{
 const {p,protection}=fixture();
 const result=audit(p,protection,()=>{throw Error('offline')});
 assert.ok(result.issues.some(x=>x.code==='PROTECTION_LOOKUP_FAILED'));
});
test('lookup absent is an explicit problem',()=>{
 const {p,protection}=fixture();
 assert.ok(audit(p,protection,null).issues.some(x=>x.code==='PROTECTION_LOOKUP_UNAVAILABLE'));
});
test('missing view is blocked',()=>{
 const {p}=fixture();
 assert.equal(audit(p,null,()=>null).issues[0].code,'PROTECTION_PROJECTION_UNAVAILABLE');
});
test('invalid project is blocked',()=>{
 assert.equal(audit(null,{rows:[]},()=>null).status,'BLOCKED');
});
test('orphan row is not silently accepted',()=>{
 const {p,protection,lookup}=fixture();
 protection.rows.push({...protection.rows[0],lineId:'GHOST'});
 assert.ok(audit(p,protection,lookup).issues.some(x=>x.code==='PROTECTION_ROW_ORPHAN'));
});
test('duplicate row is not silently accepted',()=>{
 const {p,protection,lookup}=fixture();
 protection.rows.push({...protection.rows[0]});
 assert.ok(audit(p,protection,lookup).issues.some(x=>x.code==='PROTECTION_ROW_DUPLICATE'));
});
test('missing circuit row is blocked',()=>{
 const {p,protection,lookup}=fixture();protection.rows=[];
 assert.ok(audit(p,protection,lookup).issues.some(x=>x.code==='PROTECTION_ROW_MISSING'));
});
test('duplicate source circuit ID is blocked',()=>{
 const {p,protection,lookup}=fixture();p.lines.push({...p.lines[0]});
 assert.ok(audit(p,protection,lookup).issues.some(x=>x.code==='PROTECTION_PROJECT_CIRCUIT_DUPLICATE'));
});
test('invalid source circuit ID is blocked',()=>{
 const {p,protection,lookup}=fixture();p.lines.push({id:null});
 assert.ok(audit(p,protection,lookup).issues.some(x=>x.code==='PROTECTION_PROJECT_CIRCUIT_INVALID'));
});
test('invalid view row is blocked',()=>{
 const {p,protection,lookup}=fixture();protection.rows.push({lineId:null});
 assert.ok(audit(p,protection,lookup).issues.some(x=>x.code==='PROTECTION_ROW_INVALID'));
});
test('unselected apparatus cannot retain a stale manufacturer projection',()=>{
 const {p,protection,lookup}=fixture();delete p.lines[0].catalogSku;
 assert.ok(audit(p,protection,lookup).issues.some(x=>x.code==='PROTECTION_SELECTED_SKU_STALE'));
});
test('missing SKU cannot have selected manufacturer details',()=>{
 const {p,protection,lookup}=fixture();delete p.lines[0].catalogSku;
 protection.rows[0].selectedSku=null;
 assert.ok(audit(p,protection,lookup).issues.some(x=>x.code==='PROTECTION_UNSELECTED_ARTICLE_STALE'));
});
test('complete cross-view audit incorporates protection evidence failures',()=>{
 const {p,d,protection,lookup}=fixture();
 const board=epDraftBoardPlanV1(p,lookup),bom=epDraftBomV1(p,lookup),singleLine=epSingleLineDraftV1(p,lookup);
 protection.rows[0].ibA=999;
 const report=crossView(p,protection,board,bom,singleLine,lookup);
 assert.ok(report.issues.some(x=>x.code==='PROTECTION_IB_STALE'),JSON.stringify(report.issues));
 assert.equal(report.status,'BLOCKED');
});
test('legacy cross-view audit remains compatible with four arguments',()=>{
 const {p,protection,lookup}=fixture();
 const board=epDraftBoardPlanV1(p,lookup),bom=epDraftBomV1(p,lookup);
 const report=crossView(p,protection,board,bom);
 assert.equal(report.issues.some(x=>x.code.startsWith('PROTECTION_IB_')),false);
});
test('comparison converts decimal-string current to the same declared numeric value',()=>{
 const {p,protection,lookup}=fixture();
 p.lines[0].overloadInput.ibA='10,0';
 p.lines[0].overloadInput.izA='25';
 p.lines[0].faultInput.ikKa='5.0';
 assert.deepEqual(audit(p,protection,lookup).issues,[]);
});
test('workbench report cannot mutate source project through audit',()=>{
 const {p,protection,lookup}=fixture(),before=JSON.stringify(p);
 audit(p,protection,lookup);
 assert.equal(JSON.stringify(p),before);
});

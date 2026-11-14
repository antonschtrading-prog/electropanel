'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epProtectiveDeviceShortlistV1:shortlist,epProtectiveDeviceProjectAuditV1:projectAudit}=require('../protective-device-shortlist-v1.js');
global.epProtectiveDeviceShortlistV1=shortlist;
const {epProtectionWorkbenchV1:workbench,epProtectionWorkbenchHtmlV1:html}=require('../protection-workbench-v1.js');
const {epSingleLineDraftV1:diagram}=require('../single-line-draft-v1.js');
const {epSchematicCrossViewV1:diagramAudit}=require('../cross-view-audit-v1.js');
function fixture(){
 const d={id:'RC1',sku:'MRC-16',kind:'MCB',maker:'Vendor',series:'Series',label:'B16',
  modules:1,widthMm:18,poles:1,inA:16,icnKa:6,source:'https://example.org/device',
  verificationStatus:'VERIFIED'};
 const p={lines:[{id:'L1',name:'Lights',phase:'L1',device:'B16',catalogSku:'RC1',modules:1,
  overloadInput:{ibA:12,izA:20},faultInput:{ikKa:5}}],
  sharedDevices:[],branchDevices:[{id:'BD1',circuitId:'L1',label:'B16',modules:1}]};
 return {d,p,lookup:()=>d};
}
test('basic MCB and RCBO shortlist are arithmetic-only without engineering approval',()=>{
 const {d,p}=fixture();
 for(const kind of ['MCB','RCBO']){
  const r=shortlist(p.lines[0],[{id:'RC1',device:{...d,kind}}]);
  assert.equal(r.candidates[0].status,'POTENTIAL');
  assert.equal(r.candidates[0].kind,kind);
  assert.equal(r.engineeringApproved,false);
  assert.equal(r.ready_for_installation,false);
 }
});
test("shortlist: MCB candidate",()=>{
 const {d,p}=fixture();d.kind='MCB';
 const r=shortlist(p.lines[0],[{id:'RC1',device:d}]);
 assert.equal(r.candidates[0].status,"POTENTIAL",JSON.stringify(r.candidates));
});
test("shortlist: RCBO candidate",()=>{
 const {d,p}=fixture();d.kind='RCBO';
 const r=shortlist(p.lines[0],[{id:'RC1',device:d}]);
 assert.equal(r.candidates[0].status,"POTENTIAL",JSON.stringify(r.candidates));
});
test("shortlist: RCD excluded",()=>{
 const {d,p}=fixture();d.kind='RCD';
 const r=shortlist(p.lines[0],[{id:'RC1',device:d}]);
 assert.equal(r.candidates.length,0);
});
test("shortlist: meter excluded",()=>{
 const {d,p}=fixture();d.kind='METER';
 const r=shortlist(p.lines[0],[{id:'RC1',device:d}]);
 assert.equal(r.candidates.length,0);
});
test("shortlist: relay excluded",()=>{
 const {d,p}=fixture();d.kind='RELAY';
 const r=shortlist(p.lines[0],[{id:'RC1',device:d}]);
 assert.equal(r.candidates.length,0);
});
test("shortlist: contactor excluded",()=>{
 const {d,p}=fixture();d.kind='CONTACTOR';
 const r=shortlist(p.lines[0],[{id:'RC1',device:d}]);
 assert.equal(r.candidates.length,0);
});
test("shortlist: DIN supply excluded",()=>{
 const {d,p}=fixture();d.kind='DIN_PSU';
 const r=shortlist(p.lines[0],[{id:'RC1',device:d}]);
 assert.equal(r.candidates.length,0);
});
test("shortlist: switch excluded",()=>{
 const {d,p}=fixture();d.kind='SWITCH';
 const r=shortlist(p.lines[0],[{id:'RC1',device:d}]);
 assert.equal(r.candidates.length,0);
});
test("shortlist: underrated nominal current",()=>{
 const {d,p}=fixture();d.inA=8;
 const r=shortlist(p.lines[0],[{id:'RC1',device:d}]);
 assert.equal(r.candidates[0].status,"REJECTED",JSON.stringify(r.candidates));
 assert.ok(r.candidates[0].reasons.includes("IN_LT_IB"));
});
test("shortlist: oversized nominal current",()=>{
 const {d,p}=fixture();d.inA=25;
 const r=shortlist(p.lines[0],[{id:'RC1',device:d}]);
 assert.equal(r.candidates[0].status,"REJECTED",JSON.stringify(r.candidates));
 assert.ok(r.candidates[0].reasons.includes("IN_GT_IZ"));
});
test("shortlist: insufficient Icn",()=>{
 const {d,p}=fixture();d.icnKa=3;
 const r=shortlist(p.lines[0],[{id:'RC1',device:d}]);
 assert.equal(r.candidates[0].status,"REJECTED",JSON.stringify(r.candidates));
 assert.ok(r.candidates[0].reasons.includes("ICN_LT_DECLARED_IK"));
});
test("shortlist: wrong 3P single phase",()=>{
 const {d,p}=fixture();d.poles=3;
 const r=shortlist(p.lines[0],[{id:'RC1',device:d}]);
 assert.equal(r.candidates[0].status,"REJECTED",JSON.stringify(r.candidates));
 assert.ok(r.candidates[0].reasons.includes("POLES_INCOMPATIBLE"));
});
test("shortlist: single pole three phase",()=>{
 const {d,p}=fixture();p.phase='3Ф';
 const r=shortlist(p.lines[0],[{id:'RC1',device:d}]);
 assert.equal(r.candidates[0].status,"REJECTED",JSON.stringify(r.candidates));
 assert.ok(r.candidates[0].reasons.includes("POLES_INCOMPATIBLE"));
});
test("shortlist: valid 3P three phase",()=>{
 const {d,p}=fixture();p.phase='3Ф';d.poles=3;
 const r=shortlist(p.lines[0],[{id:'RC1',device:d}]);
 assert.equal(r.candidates[0].status,"POTENTIAL",JSON.stringify(r.candidates));
});
test("shortlist: valid 4P three phase",()=>{
 const {d,p}=fixture();p.phase='3Ф';d.poles=4;
 const r=shortlist(p.lines[0],[{id:'RC1',device:d}]);
 assert.equal(r.candidates[0].status,"POTENTIAL",JSON.stringify(r.candidates));
});
test("shortlist: malformed module count",()=>{
 const {d,p}=fixture();d.modules=0;
 const r=shortlist(p.lines[0],[{id:'RC1',device:d}]);
 assert.equal(r.candidates[0].status,"REJECTED",JSON.stringify(r.candidates));
 assert.ok(r.candidates[0].reasons.includes("CATALOG_SPEC_INVALID"));
});
test("shortlist: overlong module count",()=>{
 const {d,p}=fixture();d.modules=13;
 const r=shortlist(p.lines[0],[{id:'RC1',device:d}]);
 assert.equal(r.candidates[0].status,"REJECTED",JSON.stringify(r.candidates));
 assert.ok(r.candidates[0].reasons.includes("CATALOG_SPEC_INVALID"));
});
test("shortlist: non-integer module count",()=>{
 const {d,p}=fixture();d.modules=1.5;
 const r=shortlist(p.lines[0],[{id:'RC1',device:d}]);
 assert.equal(r.candidates[0].status,"REJECTED",JSON.stringify(r.candidates));
 assert.ok(r.candidates[0].reasons.includes("CATALOG_SPEC_INVALID"));
});
test("shortlist: negative module width",()=>{
 const {d,p}=fixture();d.widthMm=-1;
 const r=shortlist(p.lines[0],[{id:'RC1',device:d}]);
 assert.equal(r.candidates[0].status,"REJECTED",JSON.stringify(r.candidates));
 assert.ok(r.candidates[0].reasons.includes("CATALOG_WIDTH_INVALID"));
});
test("shortlist: width beyond DIN modules",()=>{
 const {d,p}=fixture();d.widthMm=36;
 const r=shortlist(p.lines[0],[{id:'RC1',device:d}]);
 assert.equal(r.candidates[0].status,"REJECTED",JSON.stringify(r.candidates));
 assert.ok(r.candidates[0].reasons.includes("CATALOG_WIDTH_INVALID"));
});
test("shortlist: nonfinite width",()=>{
 const {d,p}=fixture();d.widthMm=Infinity;
 const r=shortlist(p.lines[0],[{id:'RC1',device:d}]);
 assert.equal(r.candidates[0].status,"REJECTED",JSON.stringify(r.candidates));
 assert.ok(r.candidates[0].reasons.includes("CATALOG_WIDTH_INVALID"));
});
test("shortlist: missing Ib",()=>{
 const {d,p}=fixture();delete p.overloadInput.ibA;
 const r=shortlist(p.lines[0],[{id:'RC1',device:d}]);
 assert.equal(r.candidates[0].status,"INCOMPLETE",JSON.stringify(r.candidates));
});
test("shortlist: missing Iz",()=>{
 const {d,p}=fixture();delete p.overloadInput.izA;
 const r=shortlist(p.lines[0],[{id:'RC1',device:d}]);
 assert.equal(r.candidates[0].status,"INCOMPLETE",JSON.stringify(r.candidates));
});
test("shortlist: missing Ik",()=>{
 const {d,p}=fixture();delete p.faultInput.ikKa;
 const r=shortlist(p.lines[0],[{id:'RC1',device:d}]);
 assert.equal(r.candidates[0].status,"INCOMPLETE",JSON.stringify(r.candidates));
});
test("shortlist: missing datasheet caution",()=>{
 const {d,p}=fixture();delete d.source;
 const r=shortlist(p.lines[0],[{id:'RC1',device:d}]);
 assert.equal(r.candidates[0].status,"POTENTIAL",JSON.stringify(r.candidates));
});
test("shortlist: unverified product caution",()=>{
 const {d,p}=fixture();d.verificationStatus='UNVERIFIED';
 const r=shortlist(p.lines[0],[{id:'RC1',device:d}]);
 assert.equal(r.candidates[0].status,"POTENTIAL",JSON.stringify(r.candidates));
});
test("shortlist: pending calculation caution",()=>{
 const {d,p}=fixture();p.calculationReview={required:true};
 const r=shortlist(p.lines[0],[{id:'RC1',device:d}]);
 assert.equal(r.candidates[0].status,"POTENTIAL",JSON.stringify(r.candidates));
});
test("shortlist: stale linked load caution",()=>{
 const {d,p}=fixture();p.loadCurrentCalculation={stale:true,roundedIbA:12};
 const r=shortlist(p.lines[0],[{id:'RC1',device:d}]);
 assert.equal(r.candidates[0].status,"POTENTIAL",JSON.stringify(r.candidates));
});
test("shortlist: Ib mismatch caution",()=>{
 const {d,p}=fixture();p.loadCurrentCalculation={roundedIbA:16};
 const r=shortlist(p.lines[0],[{id:'RC1',device:d}]);
 assert.equal(r.candidates[0].status,"POTENTIAL",JSON.stringify(r.candidates));
});
test("workbench: RCBO selected accepted",()=>{
 const {d,p}=fixture();d.kind='RCBO';
 const r=workbench(p,()=>d,[{id:'RC1',device:d}],'L1'),row=r.selected;
 assert.equal(row.reasons.includes('SELECTED_ARTICLE_NOT_MCB'),false);
 assert.equal(r.engineeringApproved,false);
});
test("workbench: RCD selected rejected",()=>{
 const {d,p}=fixture();d.kind='RCD';
 const r=workbench(p,()=>d,[{id:'RC1',device:d}],'L1'),row=r.selected;
 assert.ok(row.reasons.includes("SELECTED_ARTICLE_NOT_MCB"),JSON.stringify(row.reasons));
 assert.equal(r.engineeringApproved,false);
});
test("workbench: meter selected rejected",()=>{
 const {d,p}=fixture();d.kind='METER';
 const r=workbench(p,()=>d,[{id:'RC1',device:d}],'L1'),row=r.selected;
 assert.ok(row.reasons.includes("SELECTED_ARTICLE_NOT_MCB"),JSON.stringify(row.reasons));
 assert.equal(r.engineeringApproved,false);
});
test("workbench: stale line label",()=>{
 const {d,p}=fixture();p.lines[0].device='OLD';
 const r=workbench(p,()=>d,[{id:'RC1',device:d}],'L1'),row=r.selected;
 assert.ok(row.reasons.includes("ARTICLE_LABEL_MISMATCH"),JSON.stringify(row.reasons));
 assert.equal(row.status,'BLOCKED');
 assert.equal(r.engineeringApproved,false);
});
test("workbench: stale line width",()=>{
 const {d,p}=fixture();p.lines[0].modules=3;
 const r=workbench(p,()=>d,[{id:'RC1',device:d}],'L1'),row=r.selected;
 assert.ok(row.reasons.includes("ARTICLE_MODULE_WIDTH_MISMATCH"),JSON.stringify(row.reasons));
 assert.equal(row.status,'BLOCKED');
 assert.equal(r.engineeringApproved,false);
});
test("workbench: invalid article modules",()=>{
 const {d,p}=fixture();d.modules=0;
 const r=workbench(p,()=>d,[{id:'RC1',device:d}],'L1'),row=r.selected;
 assert.ok(row.reasons.includes("ARTICLE_MODULES_INVALID"),JSON.stringify(row.reasons));
 assert.equal(row.status,'BLOCKED');
 assert.equal(r.engineeringApproved,false);
});
test("workbench: inconsistent article width",()=>{
 const {d,p}=fixture();d.widthMm=36;
 const r=workbench(p,()=>d,[{id:'RC1',device:d}],'L1'),row=r.selected;
 assert.ok(row.reasons.includes("ARTICLE_GEOMETRY_INVALID"),JSON.stringify(row.reasons));
 assert.equal(row.status,'BLOCKED');
 assert.equal(r.engineeringApproved,false);
});
test("workbench: phase-poles wrong",()=>{
 const {d,p}=fixture();d.poles=3;
 const r=workbench(p,()=>d,[{id:'RC1',device:d}],'L1'),row=r.selected;
 assert.ok(row.reasons.includes("ARTICLE_POLES_MISMATCH"),JSON.stringify(row.reasons));
 assert.equal(row.status,'BLOCKED');
 assert.equal(r.engineeringApproved,false);
});
test("workbench: branch width inconsistent",()=>{
 const {d,p}=fixture();p.branchDevices[0].modules=2;
 const r=workbench(p,()=>d,[{id:'RC1',device:d}],'L1'),row=r.selected;
 assert.ok(row.reasons.includes("BRANCH_WIDTH_MISMATCH"),JSON.stringify(row.reasons));
 assert.equal(row.status,'BLOCKED');
 assert.equal(r.engineeringApproved,false);
});
test("workbench: branch label inconsistent",()=>{
 const {d,p}=fixture();p.branchDevices[0].label='OLD';
 const r=workbench(p,()=>d,[{id:'RC1',device:d}],'L1'),row=r.selected;
 assert.ok(row.reasons.includes("BRANCH_LABEL_MISMATCH"),JSON.stringify(row.reasons));
 assert.equal(row.status,'BLOCKED');
 assert.equal(r.engineeringApproved,false);
});
test("workbench: branch missing",()=>{
 const {d,p}=fixture();p.branchDevices=[];
 const r=workbench(p,()=>d,[{id:'RC1',device:d}],'L1'),row=r.selected;
 assert.ok(row.reasons.includes("BRANCH_ASSIGNMENT_MISSING"),JSON.stringify(row.reasons));
 assert.equal(row.status,'BLOCKED');
 assert.equal(r.engineeringApproved,false);
});
test("workbench: branch duplicated",()=>{
 const {d,p}=fixture();p.branchDevices.push({...p.branchDevices[0],id:'BD2'});
 const r=workbench(p,()=>d,[{id:'RC1',device:d}],'L1'),row=r.selected;
 assert.ok(row.reasons.includes("BRANCH_ASSIGNMENT_DUPLICATE"),JSON.stringify(row.reasons));
 assert.equal(row.status,'BLOCKED');
 assert.equal(r.engineeringApproved,false);
});
test("workbench: calculated Ib divergence",()=>{
 const {d,p}=fixture();p.lines[0].loadCurrentCalculation={roundedIbA:17};
 const r=workbench(p,()=>d,[{id:'RC1',device:d}],'L1'),row=r.selected;
 assert.ok(row.reasons.includes("IB_DIFFERS_FROM_CALCULATION"),JSON.stringify(row.reasons));
 assert.equal(row.status,'BLOCKED');
 assert.equal(r.engineeringApproved,false);
});
test("workbench: linked calculation stale",()=>{
 const {d,p}=fixture();p.lines[0].loadCurrentCalculation={roundedIbA:12,stale:true};
 const r=workbench(p,()=>d,[{id:'RC1',device:d}],'L1'),row=r.selected;
 assert.ok(row.reasons.includes("LOAD_CURRENT_STALE"),JSON.stringify(row.reasons));
 assert.equal(r.engineeringApproved,false);
});
test("workbench: unverified maker evidence",()=>{
 const {d,p}=fixture();d.verificationStatus='UNVERIFIED';
 const r=workbench(p,()=>d,[{id:'RC1',device:d}],'L1'),row=r.selected;
 assert.ok(row.reasons.includes("CATALOG_DATA_UNVERIFIED"),JSON.stringify(row.reasons));
 assert.equal(r.engineeringApproved,false);
});
test("workbench: datasheet absent",()=>{
 const {d,p}=fixture();delete d.source;
 const r=workbench(p,()=>d,[{id:'RC1',device:d}],'L1'),row=r.selected;
 assert.ok(row.reasons.includes("DATASHEET_SOURCE_MISSING"),JSON.stringify(row.reasons));
 assert.equal(r.engineeringApproved,false);
});
test("workbench: RCBO residual evidence explicit",()=>{
 const {d,p}=fixture();d.kind='RCBO';
 const r=workbench(p,()=>d,[{id:'RC1',device:d}],'L1'),row=r.selected;
 assert.ok(row.reasons.includes("RCBO_RESIDUAL_PROTECTION_UNVERIFIED"),JSON.stringify(row.reasons));
 assert.equal(r.engineeringApproved,false);
});
test("workbench: MCB disconnection evidence explicit",()=>{
 const {d,p}=fixture();d.kind='MCB';
 const r=workbench(p,()=>d,[{id:'RC1',device:d}],'L1'),row=r.selected;
 assert.ok(row.reasons.includes("MCB_DISCONNECTION_UNVERIFIED"),JSON.stringify(row.reasons));
 assert.equal(r.engineeringApproved,false);
});

test('workbench exposes manufacturer SKU separately from project article ID',()=>{
 const {d,p}=fixture();
 const row=workbench(p,()=>d,[{id:'RC1',device:d}],'L1').selected;
 assert.equal(row.selectedSku,'RC1');
 assert.equal(row.selectedArticle.sku,'MRC-16');
 assert.equal(row.selectedArticle.kind,'MCB');
 assert.equal(row.selectedArticle.verificationStatus,'VERIFIED');
});
test('RCBO becomes selectable through the existing protective device workbench',()=>{
 const {d,p}=fixture();d.kind='RCBO';
 const report=workbench(p,()=>d,[{id:'RC1',device:d}],'L1');
 const markup=html(report);
 assert.match(markup,/RCBO/);
 assert.match(markup,/data-protection-sku="RC1"/);
 assert.doesNotMatch(markup,/data-protection-sku="RC1"[^>]* disabled/);
});
test('rejected RCBO remains visibly disabled',()=>{
 const {d,p}=fixture();d.kind='RCBO';d.inA=32;
 const markup=html(workbench(p,()=>d,[{id:'RC1',device:d}],'L1'));
 assert.match(markup,/data-protection-sku="RC1"[^>]* disabled/);
});
test('selected unknown SKU fails project shortlist audit closed',()=>{
 const {d,p}=fixture();
 assert.ok(projectAudit(p,()=>null,[{id:'RC1',device:d}]).issues.some(x=>x.code==='SELECTED_ARTICLE_UNKNOWN'));
});
test('project shortlist audit recognises RCBO as selected project article',()=>{
 const {d,p}=fixture();d.kind='RCBO';
 const report=projectAudit(p,()=>d,[{id:'RC1',device:d}]);
 assert.equal(report.issues.some(x=>x.code==='SELECTED_ARTICLE_NOT_IN_CATALOG'),false);
 assert.deepEqual(report.results[0].potential,['RC1']);
});
test('schematic projections carry exact declared current and pending status',()=>{
 const {d,p}=fixture();
 p.lines[0].calculationReview={required:true,pending:['faultInput']};
 p.lines[0].protectionInputSource='calculation';
 const r=diagram(p,()=>d),node=r.nodes.find(x=>x.lineId==='L1');
 assert.equal(node.article.kind,'MCB');
 assert.equal(node.article.modules,1);
 assert.equal(node.design.ibA,12);
 assert.equal(node.design.izA,20);
 assert.equal(node.design.ikKa,5);
 assert.equal(node.design.calculationReviewRequired,true);
 assert.equal(node.design.inputSource,'calculation');
 assert.equal(diagramAudit(p,r,()=>d).issues.length,0);
});
test("one-line: old Ib persists on diagram",()=>{
 const {d,p}=fixture(),v=diagram(p,()=>d);
 v.nodes.find(x=>x.lineId==='L1').design.ibA=10;
 const check=diagramAudit(p,v,()=>d);
 assert.ok(check.issues.some(x=>x.code==="SCHEMATIC_DESIGN_IB_STALE"),JSON.stringify(check.issues));
});
test("one-line: old Iz persists on diagram",()=>{
 const {d,p}=fixture(),v=diagram(p,()=>d);
 v.nodes.find(x=>x.lineId==='L1').design.izA=18;
 const check=diagramAudit(p,v,()=>d);
 assert.ok(check.issues.some(x=>x.code==="SCHEMATIC_DESIGN_IZ_STALE"),JSON.stringify(check.issues));
});
test("one-line: old Ik persists on diagram",()=>{
 const {d,p}=fixture(),v=diagram(p,()=>d);
 v.nodes.find(x=>x.lineId==='L1').design.ikKa=4;
 const check=diagramAudit(p,v,()=>d);
 assert.ok(check.issues.some(x=>x.code==="SCHEMATIC_DESIGN_IK_STALE"),JSON.stringify(check.issues));
});
test("one-line: review flag not updated",()=>{
 const {d,p}=fixture(),v=diagram(p,()=>d);
 v.nodes.find(x=>x.lineId==='L1').design.calculationReviewRequired=true;
 const check=diagramAudit(p,v,()=>d);
 assert.ok(check.issues.some(x=>x.code==="SCHEMATIC_DESIGN_REVIEW_FLAG_STALE"),JSON.stringify(check.issues));
});
test("one-line: load calculation became stale",()=>{
 const {d,p}=fixture(),v=diagram(p,()=>d);
 v.nodes.find(x=>x.lineId==='L1').design.loadCurrentStale=true;
 const check=diagramAudit(p,v,()=>d);
 assert.ok(check.issues.some(x=>x.code==="SCHEMATIC_DESIGN_CALCULATED_CURRENT_STATUS_STALE"),JSON.stringify(check.issues));
});
test("one-line: input source changed",()=>{
 const {d,p}=fixture(),v=diagram(p,()=>d);
 v.nodes.find(x=>x.lineId==='L1').design.inputSource='auto';
 const check=diagramAudit(p,v,()=>d);
 assert.ok(check.issues.some(x=>x.code==="SCHEMATIC_DESIGN_CURRENT_PROVENANCE_STALE"),JSON.stringify(check.issues));
});
test("one-line: design declaration entirely omitted",()=>{
 const {d,p}=fixture(),v=diagram(p,()=>d);
 delete v.nodes.find(x=>x.lineId==='L1').design;
 const check=diagramAudit(p,v,()=>d);
 assert.ok(check.issues.some(x=>x.code==="SCHEMATIC_DESIGN_EVIDENCE_MISSING"),JSON.stringify(check.issues));
});
test("one-line: article module count became stale",()=>{
 const {d,p}=fixture(),v=diagram(p,()=>d);
 d.modules=2;
 const check=diagramAudit(p,v,()=>d);
 assert.ok(check.issues.some(x=>x.code==="SCHEMATIC_CIRCUIT_MODULES_STALE"),JSON.stringify(check.issues));
});

test('schema-sensitive report nodes escape hostile declared current strings on SVG output',()=>{
 const {d,p}=fixture();p.lines[0].overloadInput.ibA='<img src=x>';
 const svg=require('../single-line-svg-v1.js').epSingleLineSvgV1(diagram(p,()=>d));
 assert.doesNotMatch(svg,/<img src=x>/);
 assert.match(svg,/&lt;img src=x&gt;/);
});
test('one-line shows review warning without claiming verification',()=>{
 const {d,p}=fixture();p.lines[0].calculationReview={required:true,pending:['faultInput']};
 const svg=require('../single-line-svg-v1.js').epSingleLineSvgV1(diagram(p,()=>d));
 assert.match(svg,/ПЕРЕПРОВЕРИТЬ/);
 assert.match(svg,/НЕ электрический провод/);
});

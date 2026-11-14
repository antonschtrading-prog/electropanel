'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epProjectCatalogV1:catalogue,epProjectCatalogHtmlV1:catalogHtml,
 epUpsertProjectArticleV2:upsert,epImportProjectArticlesV2:importArticles}=require('../project-catalog-workbench-v1.js');
const {epProtectiveDeviceShortlistV1:shortlist}=require('../protective-device-shortlist-v1.js');
global.epProtectiveDeviceShortlistV1=shortlist;
const {epProtectionWorkbenchV1:workbench}=require('../protection-workbench-v1.js');
const {epSingleLineDraftV1:singleLine}=require('../single-line-draft-v1.js');
const {epSchematicCrossViewV1:schematicAudit,epCatalogOutputCrossViewV1:outputAudit,
 epProtectionProjectionAuditV1:protectionAudit}=require('../cross-view-audit-v1.js');
const {epDraftBomV1:bom}=require('../draft-bom-v1.js');
const {epDraftBoardPlanV1:board}=require('../draft-board-plan-v1.js');
const {epEngineeringPrintV1:print}=require('../engineering-print-v1.js');
const {epSingleLineSvgV1:singleLineSvg}=require('../single-line-svg-v1.js');
function record(kind='RCBO',extra={}){
 return {id:'RCD-LOCAL',maker:'Declared manufacturer',series:'Declared series',
 sku:'RCD-16',kind,label:'D16',inA:16,icnKa:6,poles:kind==='RCD'?2:1,
 modules:kind==='RCD'?2:1,widthMm:kind==='RCD'?36:18,
 source:'https://example.org/datasheet',...extra};
}
function project(a=record()){
 return {railCount:1,railCapacity:12,
  lines:[{id:'L1',name:'Lighting',phase:'L1',catalogSku:a.kind==='RCBO'?a.id:null,
   modules:1,device:'D16',overloadInput:{ibA:10,izA:20},faultInput:{ikKa:4}}],
  branchDevices:[{id:'BD1',circuitId:'L1',label:'D16',modules:1}],
  sharedDevices:a.kind==='RCD'?[{id:'G1',label:'D16',templateId:'RCD_2P',catalogSku:a.id,modules:2,circuitIds:['L1']}]:[],
  catalogArticles:[a]};
}
test('RCBO residual parameters are saved as declarations, never verified product facts',()=>{
 const p=project(record('RCBO',{residualCurrentMa:30,residualType:'A'}));
 const c=catalogue(p);
 assert.deepEqual(c.issues,[]);
 const item=c.lookup('RCD-LOCAL');
 assert.equal(item.residualCurrentMa,30);
 assert.equal(item.residualType,'A');
 assert.equal(item.verificationStatus,'UNVERIFIED');
 assert.equal(item.sourceType,'PROJECT_DECLARATION');
});
test('missing optional residual data stays explicit null rather than fabricated',()=>{
 const c=catalogue(project(record('RCBO')));
 assert.equal(c.lookup('RCD-LOCAL').residualCurrentMa,null);
 assert.equal(c.lookup('RCD-LOCAL').residualType,null);
 assert.equal(c.issues.length,0);
});
test("RCD accepts declared differential type AC",()=>{
 const item=catalogue(project(record('RCD',{residualCurrentMa:30,residualType:"AC"}))).lookup('RCD-LOCAL');
 assert.equal(item.residualType,"AC");
});
test("RCD accepts declared differential type A",()=>{
 const item=catalogue(project(record('RCD',{residualCurrentMa:30,residualType:"A"}))).lookup('RCD-LOCAL');
 assert.equal(item.residualType,"A");
});
test("RCD accepts declared differential type F",()=>{
 const item=catalogue(project(record('RCD',{residualCurrentMa:30,residualType:"F"}))).lookup('RCD-LOCAL');
 assert.equal(item.residualType,"F");
});
test("RCD accepts declared differential type B",()=>{
 const item=catalogue(project(record('RCD',{residualCurrentMa:30,residualType:"B"}))).lookup('RCD-LOCAL');
 assert.equal(item.residualType,"B");
});
test("RCD accepts declared differential type B+",()=>{
 const item=catalogue(project(record('RCD',{residualCurrentMa:30,residualType:"B+"}))).lookup('RCD-LOCAL');
 assert.equal(item.residualType,"B+");
});
test("negative residual current blocked",()=>{
 const c=catalogue(project(record('RCD',{residualCurrentMa:-30})));
 assert.ok(c.issues.some(x=>x.code==="CATALOG_RESIDUAL_CURRENT_INVALID"));
 assert.equal(c.lookup('RCD-LOCAL'),null);
});
test("zero residual current blocked",()=>{
 const c=catalogue(project(record('RCD',{residualCurrentMa:0})));
 assert.ok(c.issues.some(x=>x.code==="CATALOG_RESIDUAL_CURRENT_INVALID"));
 assert.equal(c.lookup('RCD-LOCAL'),null);
});
test("overly large residual current blocked",()=>{
 const c=catalogue(project(record('RCD',{residualCurrentMa:5000})));
 assert.ok(c.issues.some(x=>x.code==="CATALOG_RESIDUAL_CURRENT_INVALID"));
 assert.equal(c.lookup('RCD-LOCAL'),null);
});
test("string residual current blocked",()=>{
 const c=catalogue(project(record('RCD',{residualCurrentMa:"30"})));
 assert.ok(c.issues.some(x=>x.code==="CATALOG_RESIDUAL_CURRENT_INVALID"));
 assert.equal(c.lookup('RCD-LOCAL'),null);
});
test("invalid residual input blocked",()=>{
 const c=catalogue(project(record('RCD',{residualCurrentMa:true})));
 assert.ok(c.issues.some(x=>x.code==="CATALOG_RESIDUAL_CURRENT_INVALID"));
 assert.equal(c.lookup('RCD-LOCAL'),null);
});
test("nonfinite residual value blocked",()=>{
 const c=catalogue(project(record('RCD',{residualCurrentMa:Infinity})));
 assert.ok(c.issues.some(x=>x.code==="CATALOG_RESIDUAL_CURRENT_INVALID"));
 assert.equal(c.lookup('RCD-LOCAL'),null);
});

test('unknown differential protection type blocked',()=>{
 const c=catalogue(project(record('RCD',{residualType:'EXPERIMENTAL'})));
 assert.ok(c.issues.some(x=>x.code==='CATALOG_RESIDUAL_TYPE_INVALID'));
});
test('control characters in residual type cannot enter catalogue',()=>{
 const c=catalogue(project(record('RCBO',{residualType:'A\nB'})));
 assert.ok(c.issues.some(x=>x.code==='CATALOG_RESIDUAL_TYPE_INVALID'));
});
test('ordinary MCB cannot masquerade as residual protective device',()=>{
 const c=catalogue(project(record('MCB',{residualCurrentMa:30,residualType:'A'})));
 assert.ok(c.issues.some(x=>x.code==='CATALOG_RESIDUAL_KIND_CONFLICT'));
});
test('other apparatus cannot retain residual type after category change',()=>{
 const c=catalogue(project(record('METER',{residualType:'AC'})));
 assert.ok(c.issues.some(x=>x.code==='CATALOG_RESIDUAL_KIND_CONFLICT'));
});
test('RCBO candidate declares residual parameters but remains arithmetic-only',()=>{
 const a=record('RCBO',{residualCurrentMa:30,residualType:'A'});
 const c=catalogue(project(a)),r=shortlist(project(a).lines[0],[{id:a.id,device:c.lookup(a.id)}]);
 assert.equal(r.candidates[0].status,'POTENTIAL');
 assert.equal(r.candidates[0].residualCurrentMa,30);
 assert.equal(r.candidates[0].residualType,'A');
 assert.equal(r.engineeringApproved,false);
 assert.equal(r.candidates[0].caution.includes('CATALOG_DATA_UNVERIFIED'),true);
});
test('unknown residual sensitivity is an explicit RCBO shortlist caution',()=>{
 const a=record(),r=shortlist(project(a).lines[0],[{id:a.id,device:a}]);
 assert.ok(r.candidates[0].caution.includes('RCBO_RESIDUAL_CURRENT_UNDECLARED'));
});
test('unknown residual type is an explicit RCBO shortlist caution',()=>{
 const a=record(),r=shortlist(project(a).lines[0],[{id:a.id,device:a}]);
 assert.ok(r.candidates[0].caution.includes('RCBO_RESIDUAL_TYPE_UNDECLARED'));
});
test('RCBO workbench records declared data but not residual protection approval',()=>{
 const a=record('RCBO',{residualCurrentMa:30,residualType:'A'}),p=project(a);
 const c=catalogue(p);const row=workbench(p,c.lookup,[{id:a.id,device:c.lookup(a.id)}]).rows[0];
 assert.equal(row.selectedArticle.residualCurrentMa,30);
 assert.equal(row.selectedArticle.residualType,'A');
 assert.ok(row.reasons.includes('RCBO_RESIDUAL_PROTECTION_UNVERIFIED'));
 assert.equal(row.reasons.includes('RCBO_RESIDUAL_CURRENT_UNDECLARED'),false);
 assert.equal(row.reasons.includes('RCBO_RESIDUAL_TYPE_UNDECLARED'),false);
});
test('RCBO missing data is separately flagged by the workbench',()=>{
 const a=record(),p=project(a),c=catalogue(p);
 const row=workbench(p,c.lookup,[{id:a.id,device:c.lookup(a.id)}]).rows[0];
 assert.ok(row.reasons.includes('RCBO_RESIDUAL_CURRENT_UNDECLARED'));
 assert.ok(row.reasons.includes('RCBO_RESIDUAL_TYPE_UNDECLARED'));
});
test('catalogue UI makes residual type and sensitivity visible',()=>{
 const a=record('RCBO',{residualCurrentMa:30,residualType:'A'});
 const html=catalogHtml(project(a));
 assert.match(html,/IΔn/);
 assert.match(html,/30 мА \/ A/);
 assert.match(html,/name="residualCurrentMa"/);
 assert.match(html,/name="residualType"/);
});
test('updating a used RCBO residual sensitivity retains affected circuit review',()=>{
 const a=record('RCBO',{residualCurrentMa:30,residualType:'A'}),p=project(a);
 const result=upsert(p,{...a,residualCurrentMa:100},{},a.id);
 assert.ok(result.project,JSON.stringify(result));
 assert.equal(result.project.catalogArticles[0].residualCurrentMa,100);
 assert.ok(result.project.lines[0].calculationReview.required);
 assert.deepEqual(result.affectedCircuits,['L1']);
 assert.equal(p.catalogArticles[0].residualCurrentMa,30);
});
test('invalid RCBO residual edit rolls back atomically',()=>{
 const a=record('RCBO',{residualCurrentMa:30,residualType:'A'}),p=project(a),before=JSON.stringify(p);
 const result=upsert(p,{...a,residualCurrentMa:-1},{},a.id);
 assert.equal(result.project,null);
 assert.equal(result.code,'CATALOG_RESIDUAL_CURRENT_INVALID');
 assert.equal(JSON.stringify(p),before);
});
test('RCD residual article edit reopens assigned circuit fault-route evidence',()=>{
 const a=record('RCD',{residualCurrentMa:30,residualType:'AC'}),p=project(a);
 p.lines[0].route44Input={lengthM:10};
 const result=upsert(p,{...a,residualType:'A'},{},a.id);
 assert.ok(result.project,JSON.stringify(result));
 assert.deepEqual(result.affectedShared,['G1']);
 assert.deepEqual(result.affectedCircuits,['L1']);
 assert.equal(result.project.lines[0].calculationReview.required,true);
});
test('batch import preserves source-declared residual properties',()=>{
 const p={lines:[],sharedDevices:[],catalogArticles:[]},a=record('RCD',{residualCurrentMa:100,residualType:'B'});
 const result=importArticles(p,[a]);
 assert.ok(result.project);
 assert.equal(catalogue(result.project).lookup(a.id).residualCurrentMa,100);
 assert.equal(catalogue(result.project).lookup(a.id).residualType,'B');
});
test('bad residual value rejects entire catalogue import without partial changes',()=>{
 const p={lines:[],catalogArticles:[],sharedDevices:[]},a=record('RCBO',{residualCurrentMa:30,residualType:'A'});
 const result=importArticles(p,[a,{...a,id:'OTHER',sku:'OTHER',residualCurrentMa:0}]);
 assert.equal(result.project,null);
 assert.equal(p.catalogArticles.length,0);
});
test('schematic retains both RCBO current and residual type from catalogue',()=>{
 const a=record('RCBO',{residualCurrentMa:30,residualType:'A'}),p=project(a),c=catalogue(p);
 const view=singleLine(p,c.lookup),node=view.nodes.find(x=>x.id==='CIRCUIT:L1');
 assert.equal(node.article.residualCurrentMa,30);
 assert.equal(node.article.residualType,'A');
 assert.deepEqual(schematicAudit(p,view,c.lookup).issues,[]);
});
test('schematic catches changed RCBO IΔn',()=>{
 const a=record('RCBO',{residualCurrentMa:30,residualType:'A'}),p=project(a),c=catalogue(p);
 const view=singleLine(p,c.lookup);view.nodes.find(x=>x.id==='CIRCUIT:L1').article.residualCurrentMa=100;
 assert.ok(schematicAudit(p,view,c.lookup).issues.some(x=>x.code==='SCHEMATIC_CIRCUIT_RESIDUAL_CURRENT_STALE'));
});
test('schematic catches changed RCBO differential type',()=>{
 const a=record('RCBO',{residualCurrentMa:30,residualType:'A'}),p=project(a),c=catalogue(p);
 const view=singleLine(p,c.lookup);view.nodes.find(x=>x.id==='CIRCUIT:L1').article.residualType='B';
 assert.ok(schematicAudit(p,view,c.lookup).issues.some(x=>x.code==='SCHEMATIC_CIRCUIT_RESIDUAL_TYPE_STALE'));
});
test('shared RCD missing IΔn and type remains unknown, not approved',()=>{
 const a=record('RCD'),p=project(a),c=catalogue(p),view=singleLine(p,c.lookup);
 assert.ok(view.issues.some(x=>x.code==='SINGLE_LINE_SHARED_RESIDUAL_CURRENT_UNDECLARED'));
 assert.ok(view.issues.some(x=>x.code==='SINGLE_LINE_SHARED_RESIDUAL_TYPE_UNDECLARED'));
 assert.equal(view.engineeringApproved,false);
});
test('shared RCD with explicit residual declaration populates single-line group',()=>{
 const a=record('RCD',{residualCurrentMa:30,residualType:'A'}),p=project(a),c=catalogue(p);
 const node=singleLine(p,c.lookup).nodes.find(x=>x.id==='RCD:G1');
 assert.equal(node.article.residualCurrentMa,30);
 assert.equal(node.article.residualType,'A');
});
test('BOM retains RCBO IΔn and differential type',()=>{
 const a=record('RCBO',{residualCurrentMa:30,residualType:'A'}),p=project(a),c=catalogue(p);
 const item=bom(p,c.lookup).items.find(x=>x.key===a.id);
 assert.equal(item.residualCurrentMa,30);
 assert.equal(item.residualType,'A');
});
test('BOM detects stale residual rating',()=>{
 const a=record('RCBO',{residualCurrentMa:30,residualType:'A'}),p=project(a),c=catalogue(p);
 const b=bom(p,c.lookup);b.items[0].residualCurrentMa=300;
 const report=outputAudit(p,board(p,c.lookup),b,c.lookup);
 assert.ok(report.issues.some(x=>x.code==='OUTPUT_BOM_RESIDUAL_CURRENT_STALE'));
});
test('BOM detects stale differential type',()=>{
 const a=record('RCBO',{residualCurrentMa:30,residualType:'A'}),p=project(a),c=catalogue(p);
 const b=bom(p,c.lookup);b.items[0].residualType='AC';
 const report=outputAudit(p,board(p,c.lookup),b,c.lookup);
 assert.ok(report.issues.some(x=>x.code==='OUTPUT_BOM_RESIDUAL_TYPE_STALE'));
});
test('protection workbench detects stale IΔn in article selection',()=>{
 const a=record('RCBO',{residualCurrentMa:30,residualType:'A'}),p=project(a),c=catalogue(p);
 const report=workbench(p,c.lookup,[{id:a.id,device:c.lookup(a.id)}]);
 report.rows[0].selectedArticle.residualCurrentMa=100;
 assert.ok(protectionAudit(p,report,c.lookup).issues.some(x=>x.code==='PROTECTION_RESIDUAL_CURRENT_STALE'));
});
test('protection workbench detects stale differential type in article selection',()=>{
 const a=record('RCBO',{residualCurrentMa:30,residualType:'A'}),p=project(a),c=catalogue(p);
 const report=workbench(p,c.lookup,[{id:a.id,device:c.lookup(a.id)}]);
 report.rows[0].selectedArticle.residualType='AC';
 assert.ok(protectionAudit(p,report,c.lookup).issues.some(x=>x.code==='PROTECTION_RESIDUAL_TYPE_STALE'));
});
test('vector diagram renders declared residual rating, never claims verified installation',()=>{
 const a=record('RCD',{residualCurrentMa:30,residualType:'A'}),p=project(a),c=catalogue(p);
 const svg=singleLineSvg(singleLine(p,c.lookup));
 assert.match(svg,/IΔn 30 мА/);
 assert.match(svg,/НЕ электрический провод/);
});
test('print carries type and sensitivity through scheme, protection and BOM sections',()=>{
 const a=record('RCBO',{residualCurrentMa:30,residualType:'A'}),p=project(a),c=catalogue(p);
 const bundle={projectTitle:'Draft',overallStatus:'UNKNOWN',sections:{
  protection:workbench(p,c.lookup,[{id:a.id,device:c.lookup(a.id)}]),
  bom:bom(p,c.lookup),singleLine:singleLine(p,c.lookup)}};
 const report=print(bundle);
 assert.match(report,/IΔn, мА/);
 assert.match(report,/Тип дифзащиты/);
 assert.match(report,/>30<\/td>/);
 assert.match(report,/НЕ ДЛЯ МОНТАЖА/);
});
test('project and catalogue remain immutable during residual projections',()=>{
 const a=record('RCBO',{residualCurrentMa:30,residualType:'A'}),p=project(a),before=JSON.stringify(p);
 const c=catalogue(p);singleLine(p,c.lookup);bom(p,c.lookup);workbench(p,c.lookup,[{id:a.id,device:c.lookup(a.id)}]);
 assert.equal(JSON.stringify(p),before);
});

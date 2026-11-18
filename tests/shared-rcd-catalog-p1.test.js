'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
function environment(){
 const c=vm.createContext({console,Date,Number,String,Array,Set,Map,Math,JSON,Object,BigInt,URL});
 const deps=['overload-v30.js','protection.js','catalog.js','project-catalog-workbench-v1.js','draft-board-plan-v1.js'].map(file=>fs.readFileSync(path.join(root,file),'utf8')).join('\n');
 vm.runInContext(deps,c);
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');vm.runInContext(app.slice(0,app.indexOf("$('loadRows').addEventListener")),c);
 vm.runInContext('state=demo();ensureV2(state)',c);return c;
}
const run=(c,s)=>vm.runInContext(s,c);
const plain=(c,s)=>JSON.parse(run(c,'JSON.stringify('+s+')'));

test('source-backed A9F74116 and CDA440D records remain unverified',()=>{
 const {EP_CATALOG}=require('../catalog.js'),mcb=EP_CATALOG['SE-A9F74116'],rcd=EP_CATALOG['HA-CDA440D'];
 assert.deepEqual([mcb.widthMm,mcb.heightMm,mcb.depthMm,mcb.icuKa,mcb.sourceType,mcb.sourceReviewedAt],[18,85,78.5,10,'MANUFACTURER_PRODUCT_PAGE','2026-11-19']);
 assert.deepEqual([rcd.kind,rcd.poles,rcd.poleConfiguration,rcd.modules,rcd.widthMm,rcd.heightMm,rcd.depthMm,rcd.inA,rcd.residualCurrentMa,rcd.residualType,rcd.conditionalShortCircuitKa],['RCD',4,'3P+N',4,70,83,70,40,30,'A',6]);
 assert.match(rcd.source,/^https:\/\/hager\.com\//);assert.match(rcd.productSource,/^https:\/\/assets\.hager\.com\//);
 assert.equal(mcb.verificationStatus,undefined);assert.equal(rcd.verificationStatus,undefined);
});

test('specific shared RCD article drives width and persists stable group identity',()=>{
 const c=environment(),group=plain(c,"addSharedRCDTo(state,'RCD_4P','QD1',['L1','L2'],'HA-CDA440D')");
 assert.equal(group.label,'QD1');assert.equal(group.catalogSku,'HA-CDA440D');assert.equal(group.modules,4);assert.equal(group.id,'RCD1');
 assert.equal(run(c,"state.lines[0].device"),'B10');
});

test('unknown, wrong-kind and wrong-pole shared article changes are atomic',()=>{
 const c=environment();run(c,"addSharedRCDTo(state,'RCD_4P','QD1',['L1','L2'])");
 for(const [sku,pattern] of [['UNKNOWN',/Не найден/],['SE-A9F74116',/должен быть УЗО/],['TEST-RCD2',/Полюса/]]){
  run(c,"projectCatalogEntries=()=>Object.entries(EP_CATALOG).concat([['TEST-RCD2',{maker:'Test',series:'RCD',sku:'TEST2',kind:'RCD',poles:2,modules:2,widthMm:35,inA:40}]])");
  const before=run(c,'JSON.stringify(state)');assert.throws(()=>run(c,`applySharedCatalogueSku(state,'RCD1','${sku}')`),pattern);assert.equal(run(c,'JSON.stringify(state)'),before);
 }
});

test('shared article survives JSON reload and reaches single-line, SVG and BOM',()=>{
 const c=environment();run(c,"addSharedRCDTo(state,'RCD_4P','QD1',['L1','L2'],'HA-CDA440D')");
 const restored=plain(c,'JSON.parse(JSON.stringify(state))');assert.equal(restored.sharedDevices[0].catalogSku,'HA-CDA440D');assert.equal(restored.sharedDevices[0].modules,4);
 const {EP_CATALOG}=require('../catalog.js'),lookup=id=>EP_CATALOG[id]||null;
 const {epSingleLineDraftV1}=require('../single-line-draft-v1.js'),{epSingleLineSvgV1}=require('../single-line-svg-v1.js'),{epDraftBomV1}=require('../draft-bom-v1.js');
 const draft=epSingleLineDraftV1(restored,lookup),group=draft.nodes.find(x=>x.id==='RCD:RCD1');assert.equal(group.article.sku,'CDA440D');
 assert.match(epSingleLineSvgV1(draft),/Hager \/ CDA \/ CDA440D/);assert.match(JSON.stringify(epDraftBomV1(restored,lookup)),/CDA440D/);
});

test('clearing article restores template width and reopens only linked manual calculations',()=>{
 const c=environment();run(c,"state.lines.slice(0,3).forEach(l=>{l.overloadInput={ibA:10,izA:20};l.faultInput={ikKa:3,voltageV:230}});addSharedRCDTo(state,'RCD_4P','QD1',['L1','L2'],'HA-CDA440D');applySharedCatalogueSku(state,'RCD1','')");
 const out=plain(c,'state');assert.equal(out.sharedDevices[0].modules,4);assert.equal(out.sharedDevices[0].catalogSku,undefined);
 assert.equal(out.lines[0].calculationReview.required,true);assert.equal(out.lines[0].calculationReview.reason,'SHARED_RCD_ARTICLE_CHANGED');assert.equal(out.lines[1].calculationReview.required,true);assert.equal(out.lines[2].calculationReview,undefined);
 assert.deepEqual([out.lines[0].overloadInput.ibA,out.lines[0].overloadInput.izA,out.lines[0].faultInput.ikKa],[10,20,3]);
});

test('real UI exposes create/edit selectors and atomic change handler',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');assert.match(app,/id="sharedRcdSku"/);assert.match(app,/data-shared-rcd-sku/);assert.match(app,/applySharedCatalogueSku\(draft,select\.dataset\.sharedRcdSku,select\.value\)/);assert.match(app,/Проверка размещения DIN недоступна/);
 const c=environment(),html=run(c,"sharedRcdArticleOptions('','RCD_4P')");assert.match(html,/HA-CDA440D/);assert.match(html,/CDA440D/);assert.match(html,/3P\+N/);
});

test('wider shared RCD replacement is rejected before mutation at DIN capacity',()=>{
 const c=environment();run(c,`state.railCount=1;state.railCapacity=8;state.lines=state.lines.slice(0,4);state.loads=state.loads.filter(x=>state.lines.some(l=>l.id===x.circuitId));state.branchDevices=state.branchDevices.slice(0,4);state.sharedDevices=[];delete state.manualLayoutV1;
  state.lines.forEach((l,i)=>{l.modules=i===3?3:1;delete l.catalogSku;state.branchDevices[i].modules=l.modules;});
  projectCatalogEntries=()=>Object.entries(EP_CATALOG).concat([['TEST-RCD2',{maker:'Test',series:'RCD',sku:'TEST2',kind:'RCD',poles:4,poleConfiguration:'3P+N',modules:2,widthMm:35,heightMm:83,depthMm:70,inA:40,residualCurrentMa:30,residualType:'A',sourceType:'PROJECT_DECLARATION',source:'https://example.org/rcd'}]]);
  addSharedRCDTo(state,'RCD_4P','QD1',['L1','L2'],'TEST-RCD2')`);
 assert.notEqual(run(c,"epDraftBoardPlanV1(state,key=>projectCatalogEntries(state).find(([id])=>id===key)?.[1]||null).status"),'BLOCKED');
 const before=run(c,'JSON.stringify(state)');assert.throws(()=>run(c,"applySharedCatalogueSku(state,'RCD1','HA-CDA440D')"),/DIN-компоновку/);assert.equal(run(c,'JSON.stringify(state)'),before);
});

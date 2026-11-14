'use strict';
// Real-browser regression of the shipped page, not a reimplementation of app handlers.
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../dist');
const server=http.createServer((req,res)=>{
 const name=decodeURIComponent(req.url.split('?')[0]);const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end();}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(data);});
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,...(process.env.EP_CHROMIUM?{executablePath:process.env.EP_CHROMIUM}:{})});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(['warning','error'].includes(m.type()))console.log('Browser:',m.text());});
 await page.goto('http://127.0.0.1:'+server.address().port);
 await page.locator('#loadDemo').click();
 await page.evaluate(()=>{selectedLine='L1';switchView('board');});
 assert.equal(await page.locator('#boardCanvas [data-line]').count(),6);

 // A catalogue article type must govern both protection selection and its board facade.
 const faceSelection=await page.evaluate(()=>{
  const p=JSON.parse(JSON.stringify(state)),id=p.lines[0].id;
  p.catalogArticles=[{id:'METER-AS-BREAKER',sku:'MTR-1',maker:'Declared maker',series:'Test',
   kind:'METER',label:'Meter',modules:2,widthMm:36,poles:2,inA:40,source:'https://example.org/meter'}];
  const original=JSON.stringify(p);
  let rejected=false;
  try{applyCatalogueSku(p,id,'METER-AS-BREAKER');}catch(error){rejected=/автоматический выключатель|дифавтомат/.test(error.message);}
  const types=['MCB','RCD','RCBO','CONTACTOR','METER','DIN_PSU'].map(kind=>{
   const host=document.createElement('div');
   host.innerHTML=epCatalogFrontSvgV1({maker:'ABB',series:'Illustrative',kind,
    sku:'DEMO',modules:2,widthMm:36,poles:2,inA:16},kind);
   const svg=host.querySelector('svg');
   return {kind:svg.getAttribute('data-device-kind'),levers:svg.querySelectorAll('[data-lever]').length,
    test:svg.querySelectorAll('[data-test-control]').length,
    display:svg.querySelectorAll('[data-display]').length,
    vents:svg.querySelectorAll('[data-vent]').length};
  });
  return {rejected,unchanged:JSON.stringify(p)===original,types};
 });
 assert.equal(faceSelection.rejected,true,'meter must not be selectable as branch protection');
 assert.equal(faceSelection.unchanged,true,'blocked selection must preserve the project');
 assert.deepEqual(faceSelection.types.map(x=>[x.kind,x.levers>0,x.test>0,x.display>0,x.vents>0]),[
  ['MCB',true,false,false,false],['RCD',true,true,false,false],
  ['RCBO',true,true,false,false],['CONTACTOR',false,false,false,false],
  ['METER',false,false,true,false],['DIN_PSU',false,false,false,true]
 ]);

 // A project audit must resolve devices from the project argument, not the open editor.
 const auditIsolation=await page.evaluate(()=>{
  const p=JSON.parse(JSON.stringify(state));
  p.catalogArticles=[{id:'LOCAL-ONLY',sku:'LOCAL',maker:'Local',series:'S',kind:'MCB',modules:1,widthMm:18,poles:1,inA:16,source:'https://example.org/local'}];
  p.lines[0].catalogSku='LOCAL-ONLY';p.lines[0].modules=1;p.lines[0].device='LOCAL';
  return {globalMissing:catalogDevice('LOCAL-ONLY')===null,unknown:catalogAudit(p).issues.some(x=>x.circuitId===p.lines[0].id&&x.code==='CATALOG_UNKNOWN')};
 });
 assert.deepEqual(auditIsolation,{globalMissing:true,unknown:false});

 // Real app change() must preserve manual fault checks while recomputing linked Ib.
 const reviewPage=await browser.newPage({viewport:{width:1180,height:900}});
 try{
  await reviewPage.goto('http://127.0.0.1:'+server.address().port);
  await reviewPage.locator('#loadDemo').click();
  const dependencyFlow=await reviewPage.evaluate(()=>{
   const id=state.lines[0].id;
   let consumer=state.loads.find(x=>x.circuitId===id);
   if(!consumer)consumer=addConsumerTo(state,id,'Lighting 1',1.5);
   const input={mode:state.lines[0].phase==='3Ф'?'three_phase':'single_phase',
    powerSource:'circuit',voltageV:state.lines[0].phase==='3Ф'?400:230,
    powerFactor:1,efficiency:1,demandFactor:1};
   const result=epApplyLoadCurrentV1(state,id,input);
   if(!result.project)return {error:'calculation '+result.code};
   state=result.project;
   const line=state.lines.find(l=>l.id===id);
   line.faultInput={ikKa:'3',source:'design input'};
   line.calculationReview={required:true,pending:['faultInput'],reason:'AWAITING_FAULT_REVIEW'};
   lastDesignSnapshot=structuredCloneCompat(state);
   const oldIb=line.loadCurrentCalculation.roundedIbA;
   const record=state.loads.find(x=>x.circuitId===id);
   editConsumerIn(state,record.id,record.name,record.powerKw+0.5);
   changed();
   const updated=state.lines.find(l=>l.id===id);
   const saved=JSON.parse(localStorage.getItem('electropanel_web_preview'));
   return {oldIb,newIb:updated.loadCurrentCalculation.roundedIbA,
    pending:updated.calculationReview?.pending||[],
    reviewed:updated.calculationReview?.required,
    stale:updated.loadCurrentCalculation.stale===true,
    powerSource:updated.loadCurrentCalculation.powerSource,
    savedPending:saved.lines.find(l=>l.id===id)?.calculationReview?.pending||[],
    impacts:lastDesignImpact?.changed||[]};
  });
  assert.ok(!dependencyFlow.error,JSON.stringify(dependencyFlow));
  assert.ok(dependencyFlow.newIb>dependencyFlow.oldIb,JSON.stringify(dependencyFlow));
  assert.deepEqual(dependencyFlow.pending.slice().sort(),['faultInput','overloadInput']);
  assert.deepEqual(dependencyFlow.savedPending.slice().sort(),['faultInput','overloadInput']);
  assert.equal(dependencyFlow.reviewed,true);
  assert.equal(dependencyFlow.stale,false);
  assert.equal(dependencyFlow.powerSource,'circuit');
  assert.ok(dependencyFlow.impacts.includes('load'));
  const persistedRcd=await reviewPage.evaluate(()=>{
   const p=JSON.parse(JSON.stringify(state));
   p.sharedDevices=[{id:'RCD-TEST',templateId:'RCD_2P',label:'Custom RCD',
    modules:3,circuitIds:[p.lines[0].id],catalogSku:'RCD-CUSTOM'}];
   p.groupInputLinks=[];
   p.catalogArticles=[{id:'RCD-CUSTOM',maker:'Declared manufacturer',series:'RCD S',
    sku:'RCD-CUSTOM',kind:'RCD',label:'Custom RCD',modules:3,widthMm:54,
    poles:2,inA:40,source:'https://example.org/rcd'}];
   const restored=normalizeImport(p);
   const article=epProjectCatalogV1(restored,EP_CATALOG).lookup('RCD-CUSTOM');
   return {sku:restored.sharedDevices[0].catalogSku,modules:restored.sharedDevices[0].modules,
    articleKind:article?.kind||null,articleWidth:article?.widthMm||null};
  });
  assert.deepEqual(persistedRcd,{
   sku:'RCD-CUSTOM',modules:3,articleKind:'RCD',articleWidth:54
  },'Shared RCD must keep project-specific manufacturer linkage after normalization');
 }finally{await reviewPage.close();}



 // Exercise the actual form and an isolated browser storage context, not a synthetic record.
 const residualContext=await browser.newContext();
 try{
  const residualPage=await residualContext.newPage();
  await residualPage.goto('http://127.0.0.1:'+server.address().port);
  await residualPage.locator('#loadDemo').click();
  const result=await residualPage.evaluate(()=>{
   const form=document.getElementById('catalogArticleForm');
   if(!form)return {error:'Catalogue form missing'};
   const data={id:'BROWSER-RCBO-RCD-30',maker:'Declared manufacturer',series:'Declared DIN series',
    sku:'D16-30',label:'D16 30mA',modules:'2',widthMm:'36',poles:'1',inA:'16',
    kind:'RCBO',icnKa:'6',curve:'C',residualCurrentMa:'30',residualType:'A',
    source:'https://example.org/rcbo-datasheet'};
   for(const [key,value] of Object.entries(data)){
    const input=form.elements.namedItem(key);
    if(!input)return {error:'Missing input '+key};
    input.value=value;
   }
   form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
   const stored=state.catalogArticles.find(x=>x.id===data.id);
   if(!stored)return {error:'Form submission did not persist RCBO'};
   const restored=normalizeImport(JSON.parse(localStorage.getItem('electropanel_web_preview')));
   const restoredArticle=restored.catalogArticles.find(x=>x.id===data.id);
   const p=structuredCloneCompat(state);
   const line=p.lines[0];if(!line)return {error:'Demo has no circuit'};
   line.phase='L1';
   try{applyCatalogueSku(p,line.id,data.id);}
   catch(error){return {error:'Selected RCBO not applied: '+error.message};}
   const catalogue=epProjectCatalogV1(p,EP_CATALOG),lookup=catalogue.lookup;
   const scheme=epSingleLineDraftV1(p,lookup);
   const protection=epProtectionWorkbenchV1(p,lookup,
    Object.entries(catalogue.articles).map(([id,device])=>({id,device})),line.id);
   const b=epDraftBomV1(p,lookup);
   const bundle=epEngineeringBundleV1(p,lookup);
   const report=epEngineeringPrintV1(bundle);
   const circuit=scheme.nodes.find(x=>x.lineId===line.id);
   const bomArticle=b.items.find(x=>x.key===data.id);
   return {storedCurrent:stored.residualCurrentMa,storedType:stored.residualType,
    restoredCurrent:restoredArticle?.residualCurrentMa,restoredType:restoredArticle?.residualType,
    projectCurrent:lookup(data.id)?.residualCurrentMa,
    schematicCurrent:circuit?.article?.residualCurrentMa,
    schematicType:circuit?.article?.residualType,
    protectionCurrent:protection.selected?.selectedArticle?.residualCurrentMa,
    protectionType:protection.selected?.selectedArticle?.residualType,
    bomCurrent:bomArticle?.residualCurrentMa,bomType:bomArticle?.residualType,
    printResidual:report.includes('IΔn, мА')&&report.includes('Тип дифзащиты')&&report.includes('30'),
    catalogueStatus:lookup(data.id)?.verificationStatus};
  });
  assert.deepEqual(result,{
   storedCurrent:30,storedType:'A',restoredCurrent:30,restoredType:'A',
   projectCurrent:30,schematicCurrent:30,schematicType:'A',
   protectionCurrent:30,protectionType:'A',bomCurrent:30,bomType:'A',
   printResidual:true,catalogueStatus:'UNVERIFIED'
  },'User-declared RCBO residual parameters must survive form -> storage -> selection -> schematic -> protection -> BOM -> print');
 }finally{await residualContext.close();}

 // End-to-end RCD catalogue edit: original project -> review -> scheme -> DIN -> BOM -> cross-view.
 const rcdEdit=await page.evaluate(()=>{
  const breaker={id:'E2E-B',sku:'B16',maker:'E2E Maker',series:'M',kind:'MCB',
   label:'Breaker B16',modules:1,widthMm:18,poles:1,inA:16,source:'https://example.org/b16'};
  const rcd={id:'E2E-R',sku:'R40',maker:'E2E Maker',series:'R',kind:'RCD',
   label:'RCD old',modules:2,widthMm:36,poles:2,inA:40,source:'https://example.org/r40'};
  const p={title:'Isolated panel',railCount:1,railCapacity:12,
   catalogArticles:[breaker,rcd],loads:[],
   lines:[{id:'L1',name:'Light',phase:'L1',catalogSku:'E2E-B',modules:1,device:'Breaker B16',
    faultInput:{ikKa:3}}],
   branchDevices:[{id:'BD1',circuitId:'L1',label:'Breaker B16',modules:1}],
   sharedDevices:[{id:'R1',catalogSku:'E2E-R',templateId:'RCD_2P',label:'RCD old',modules:2,circuitIds:['L1']}]};
  const change=epUpsertProjectArticleV2(p,{...rcd,label:'RCD new',modules:3,widthMm:54},EP_CATALOG,'E2E-R');
  if(!change.project)return {error:change.code};
  try{validateEntities(change.project);validateBranchDevices(change.project);}
  catch(error){return {error:'Project model rejected catalogue RCD: '+error.message};}
  const lookup=epProjectCatalogV1(change.project,EP_CATALOG).lookup;
  const singleLine=epSingleLineDraftV1(change.project,lookup);
  const board=epDraftBoardPlanV1(change.project,lookup);
  const bom=epDraftBomV1(change.project,lookup);
  const audit=epCatalogOutputCrossViewV1(change.project,board,bom,lookup);
  const schematicAudit=epSchematicCrossViewV1(change.project,singleLine,lookup);
  return {
   affectedCircuits:change.affectedCircuits,affectedShared:change.affectedShared,
   review:change.project.lines[0].calculationReview?.required===true,
   groupName:singleLine.nodes.find(n=>n.id==='RCD:R1')?.name,
   groupModules:singleLine.nodes.find(n=>n.id==='RCD:R1')?.article?.modules,
   boardModules:board.placements.find(x=>x.deviceId==='R1')?.modules,
   bomModules:bom.items.find(x=>x.key==='E2E-R')?.modules,
   schematicIssues:schematicAudit.issues.map(x=>x.code),
   outputIssues:audit.issues.map(x=>x.code),
   originalUnchanged:p.sharedDevices[0].modules===2
  };
 });
 assert.deepEqual(rcdEdit,{
  affectedCircuits:['L1'],affectedShared:['R1'],review:true,groupName:'RCD new',
  groupModules:3,boardModules:3,bomModules:3,schematicIssues:[],outputIssues:[],
  originalUnchanged:true
 },'RCD edit must reconcile every project view without silently changing source');


 // Assign a real seeded article through the actual editor.
 await page.locator('#boardCanvas [data-line="L1"]').click();
 await page.locator('#catalogSku').selectOption('SE-A9F74116');
 // Engineering forms share the board workspace.
 await page.evaluate(()=>switchView('board'));
 await page.locator('#loadCurrentPanel summary').click();
 const load=page.locator('[data-load-current-form="L1"]');
 for(const [name,value] of Object.entries({voltageV:'230',powerFactor:'1',efficiency:'1',demandFactor:'1'}))await load.locator('[name="'+name+'"]').fill(value);
 await load.locator('[name="linkCircuitPower"]').check();
 await load.locator('button[type="submit"]').click();
 const computed=await page.evaluate(()=>state.lines[0].overloadInput.ibA);assert.equal(computed,5.218);
 // Edit a consumer using the model command, then exercise the same changed pipeline as UI.
 await page.evaluate(()=>{checkpoint();state.loads.find(x=>x.circuitId==='L1').powerKw=2.3;changed();});
 assert.equal(await page.evaluate(()=>state.lines[0].overloadInput.ibA),10);
 await page.evaluate(()=>{state=epApplyCableReferenceInputV1(state,'L1',{installationMethod:'C',confirmContext:true}).project;state=epApplyCableSectionV1(state,'L1','2.5').project;changed();switchView('board');});
 const pos=page.locator('[data-board-position]');
 await pos.locator('[name="rail"]').fill('2');await pos.locator('[name="slot"]').fill('4');await pos.locator('button').click();
 assert.equal(await page.evaluate(()=>epReconcileProjectV2(state,catalogDevice).rows[0].placement.startModule),3);
 await page.locator('#undoBtn').click();
 assert.equal(await page.evaluate(()=>state.lines[0].cableDesignInput.sectionMm2),2.5);
 assert.equal(await page.evaluate(()=>epReconcileProjectV2(state,catalogDevice).rows[0].placement.railIndex),0);
 await page.locator('#redoBtn').click();
 assert.equal(await page.evaluate(()=>epReconcileProjectV2(state,catalogDevice).rows[0].placement.railIndex),1);
 // Import a project-specific catalogue record, exercise its protection shortlist.
 await page.evaluate(()=>{state.catalogArticles=[{id:'USER-16',sku:'user16',maker:'User maker',series:'Declared',kind:'MCB',poles:1,modules:1,widthMm:18,inA:16,icnKa:6,curve:'C',source:'https://example.org/datasheet'}];changed();});
 assert.equal(await page.evaluate(()=>normalizeImport(JSON.parse(localStorage.getItem('electropanel_web_preview'))).lines.length),6);
 const savedBeforeReload=await page.evaluate(()=>localStorage.getItem('electropanel_web_preview'));
 await page.reload();
 const reloadReport=await page.evaluate(before=>{
  const raw=localStorage.getItem('electropanel_web_preview');
  let storedLines=null,importedLines=null,importError=null;
  try{
   const parsed=JSON.parse(raw);
   storedLines=parsed?.lines?.length??null;
   try{importedLines=normalizeImport(parsed).lines.length;}catch(e){importError=String(e);}
  }catch(e){importError='JSON: '+String(e);}
  return {runtimeLines:state?.lines?.length??null,storedLines,importedLines,importError,
   changed:raw!==before,storedLength:raw?.length??null,
   schema:state?.schema??null};
 },savedBeforeReload);
 assert.equal(reloadReport.runtimeLines,6,'Saved project did not restore: '+JSON.stringify({reloadReport,errors}));
 assert.equal(await page.evaluate(()=>state.lines[0].loadCurrentCalculation.roundedIbA),10);
 assert.equal(await page.evaluate(()=>state.lines[0].cableDesignInput.sectionMm2),2.5);
 assert.equal(await page.evaluate(()=>state.catalogArticles.length),1);
 assert.equal(await page.evaluate(()=>state.manualLayoutV1[0].railIndex),1);
 const roundtrip=await page.evaluate(()=>{const p=normalizeImport(JSON.parse(snapshot()));return {section:p.lines[0].cableDesignInput.sectionMm2,sku:p.lines[0].catalogSku,catalog:p.catalogArticles.length};});
 assert.deepEqual(roundtrip,{section:2.5,sku:'SE-A9F74116',catalog:1});
 await page.evaluate(()=>{selectedLine='L1';switchView('board');});
 assert.match(await page.locator('#protectionWorkbench').innerText(),/User maker/);
 assert.match(await page.locator('#projectChainPanel').innerText(),/A9F74116/);
 assert.equal(await page.evaluate(()=>epEngineeringBundleV1(state,catalogDevice).sections.reconciliation.rows[0].placement.startModule),3);
 await page.evaluate(()=>switchView('board'));
 // New catalogue form: create without JSON, assign and preserve its identity.
 await page.locator('#catalogEditor summary').click();
 const editor=page.locator('#catalogArticleForm');
 for(const [name,value] of Object.entries({id:'USER-25',maker:'Test maker',series:'Declared',sku:'U25',label:'User C25',modules:'1',widthMm:'18',poles:'1',inA:'25',curve:'C',icnKa:'6',source:'https://example.org/u25'}))await editor.locator('[name="'+name+'"]').fill(value);
 await editor.locator('button[type="submit"]').click();
 // A named input `id` must never shadow the form ID check and trigger a native GET navigation.
 const catalogAfterSubmit=await page.evaluate(()=>({stateDefined:typeof state!=='undefined',count:typeof state!=='undefined'?state.catalogArticles?.length:null,path:location.pathname,search:location.search,saved:JSON.parse(localStorage.getItem('electropanel_web_preview')).catalogArticles?.some(x=>x.id==='USER-25')}));
 assert.deepEqual(catalogAfterSubmit,{stateDefined:true,count:2,path:'/',search:'',saved:true},'Catalog submission must stay in the app and persist the declared article: '+JSON.stringify({catalogAfterSubmit,errors}));
 await page.locator('#catalogSearchInput').fill('U25');
 assert.equal(await page.locator('[data-catalog-row]:visible').count(),1);
 await page.locator('#catalogSearchInput').fill('');
 await page.locator('#catalogSku').selectOption('USER-25');
 await page.locator('[data-delete-article="USER-25"]').click();
 assert.equal(await page.evaluate(()=>state.catalogArticles.length),2);
 // Source-backed 3P article can be selected for the 3-phase circuit.
 await page.locator('#boardCanvas [data-line="L6"]').click();
 await page.locator('#catalogSku').selectOption('SE-A9F74332');
 assert.equal(await page.evaluate(()=>state.lines.find(x=>x.id==='L6').modules),3);
 await page.locator('#boardCanvas [data-line="L1"]').click();
 // Real route form, not direct invocation of the numerical function.
 await page.locator('#faultRoutePanel summary').click();
 const route=page.locator('[data-fault-route="L1"]');
 for(const [name,value] of Object.entries({u0V:'230',cmin:'0.95',sourceROhm:'0.1',sourceXOhm:'0.05',networkSource:'Test network study',iaA:'160',requiredTimeS:'0.4',tripSource:'Test curve reference',timeSource:'Test project scope'}))await route.locator('[name="'+name+'"]').fill(value);
 for(const [key,value] of Object.entries({lengthM:'25',phaseROhmKm:'8',peROhmKm:'8',phaseXOhmKm:'0.08',peXOhmKm:'0.08',source:'Test conductor datasheet at design temperature'}))await route.locator('[data-segment-field="'+key+'"]').fill(value);
 await route.locator('[data-segment-temperature]').check();
 await route.locator('button[type="submit"]').click();
 assert.equal(await page.evaluate(()=>epFaultRouteReviewV2(state,state.lines[0],catalogDevice).thresholdStatus),'PASS');
 assert.equal(await page.evaluate(()=>state.lines[0].faultInput?.ikKa??null),null);
 await page.locator('#catalogSku').selectOption('SE-A9F74116');
 assert.equal(await page.evaluate(()=>epFaultRouteReviewV2(state,state.lines[0],catalogDevice).thresholdStatus),'UNKNOWN');
 assert.equal(await page.evaluate(()=>normalizeImport(JSON.parse(localStorage.getItem('electropanel_web_preview'))).lines.length),6);
 await page.reload();
 assert.equal(await page.evaluate(()=>state.lines[0].faultRouteInput.segments.length),1);
 assert.equal(await page.evaluate(()=>epFaultRouteReviewV2(state,state.lines[0],catalogDevice).stale),true);
 await page.evaluate(()=>{selectedLine='L1';switchView('board');});
 // Edit an unused custom article in the visible form.
 await page.locator('[data-edit-article="USER-25"]').click();
 await editor.locator('[name="inA"]').fill('32');
 await editor.locator('button[type="submit"]').click();
 assert.equal(await page.evaluate(()=>catalogDevice('USER-25').inA),32);
 assert.equal(await page.evaluate(()=>catalogDevice('SE-A9F74116').inA),16);
 
 // Bulk JSON import is atomic and cannot bypass width, identity or source validation.
 await page.locator('#catalogImportRecordsBtn').evaluate(button=>button.closest('details').open=true);
 await page.locator('#catalogJsonInput').fill(JSON.stringify([
  {id:'BATCH-OK',maker:'Declared maker',series:'Batch',sku:'B16',kind:'MCB',modules:1,widthMm:18,poles:1,inA:16,source:'https://example.org/b16'},
  {id:'BATCH-BAD',maker:'Declared maker',series:'Batch',sku:'B25',kind:'MCB',modules:1,widthMm:36,poles:1,inA:25,source:'https://example.org/b25'}
 ]));
 await page.locator('#catalogImportRecordsBtn').click();
 assert.equal(await page.evaluate(()=>state.catalogArticles.length),2,'Rejected batch must not partially mutate project');
 await page.locator('#catalogJsonInput').fill(JSON.stringify([
  {id:'BATCH-OK',maker:'Declared maker',series:'Batch',sku:'B16',kind:'MCB',modules:1,widthMm:18,poles:1,inA:16,source:'https://example.org/b16'}
 ]));
 await page.locator('#catalogImportRecordsBtn').click();
 assert.equal(await page.evaluate(()=>state.catalogArticles.length),3);
 // A duplicate manufacturer/article pair must be rejected without partial commit.
 await page.locator('#catalogImportRecordsBtn').evaluate(button=>button.closest('details').open=true);
 await page.locator('#catalogJsonInput').fill(JSON.stringify([
  {id:'BATCH-NEW',maker:'Declared maker',series:'Batch',sku:'B20',kind:'MCB',modules:1,widthMm:18,poles:1,inA:20,source:'https://example.org/b20'},
  {id:'BATCH-DUP',maker:'Declared maker',series:'Batch',sku:'B16',kind:'MCB',modules:1,widthMm:18,poles:1,inA:16,source:'https://example.org/duplicate'}
 ]));
 await page.locator('#catalogImportRecordsBtn').click();
 assert.equal(await page.evaluate(()=>state.catalogArticles.length),3,'Duplicate maker/SKU must roll back whole batch');
 await page.locator('#undoBtn').click();
 assert.equal(await page.evaluate(()=>state.catalogArticles.length),2,'Undo must revert accepted import');
 await page.locator('#redoBtn').click();
 assert.equal(await page.evaluate(()=>state.catalogArticles.length),3,'Redo must restore accepted import');
 assert.equal(await page.evaluate(()=>catalogDevice('BATCH-OK').verificationStatus),'UNVERIFIED');
 assert.match(await page.locator('#projectCatalogWorkbench').innerText(),/пользовательских: 3/);
 assert.equal(await page.evaluate(()=>epProjectCatalogV1({...state,catalogArticles:[...state.catalogArticles,{id:'TOO-WIDE',maker:'Width maker',series:'W',sku:'W1',kind:'MCB',modules:1,widthMm:36,poles:1,inA:16,source:'https://example.org/w1'}]},EP_CATALOG).issues.some(x=>x.code==='ARTICLE_WIDTH_EXCEEDS_MODULES')),true);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('electropanel_web_preview')).catalogArticles.length),3);


 // Browser-level integration: user-declared RCBO -> branch -> draft scheme -> DIN -> BOM -> print.
 const rcboWorkflow=await page.evaluate(()=>{
  const p=structuredCloneCompat(state);
  const line=p.lines.find(l=>['L1','L2','L3'].includes(l.phase))||p.lines[0];
  if(!line)return {error:'No circuit'};
  line.phase='L1';line.overloadInput={ibA:10,izA:25};
  line.faultInput={ikKa:'3',source:'design-stage Ik input'};
  p.catalogArticles=[...(p.catalogArticles||[]),{
   id:'RCBO-INTEGRATION',sku:'D16-1PN',maker:'Declared Manufacturer',
   series:'Proposed RCBO',label:'RCBO B16',kind:'RCBO',poles:1,
   modules:2,widthMm:36,inA:16,icnKa:6,
   source:'https://example.org/rcbo-product'
  }];
  try{applyCatalogueSku(p,line.id,'RCBO-INTEGRATION');}
  catch(error){return {error:error.message};}
  const bundle=epEngineeringBundleV1(p,catalogDevice);
  const schematic=bundle.sections.singleLine.nodes.find(x=>x.lineId===line.id);
  const selection=bundle.sections.protectionSelection.results.find(x=>x.lineId===line.id);
  const protective=bundle.sections.protection.rows.find(x=>x.lineId===line.id);
  const actualBranch=p.branchDevices.find(x=>x.circuitId===line.id);
  const board=bundle.sections.board.placements.find(x=>x.deviceId===actualBranch?.id);
  const bom=bundle.sections.bom.items.find(x=>x.key==='RCBO-INTEGRATION');
  const registry=bundle.sections.issueRegister.entries.filter(x=>x.circuitId===line.id);
  const report=epEngineeringPrintV1(bundle);
  return {error:null,circuit:line.id,selectedSku:line.catalogSku,
   selectedKind:protective?.selectedArticle?.kind,
   candidateKind:protective?.candidates?.find(x=>x.sku==='RCBO-INTEGRATION')?.kind,
   selectionPotential:selection?.potential?.includes('RCBO-INTEGRATION'),
   branchWidth:actualBranch?.modules,boardWidth:board?.modules,
   boardArticle:board?.article,bomWidth:bom?.modules,bomKind:bom?.kind,
   schematicKind:schematic?.article?.kind,
   schematicIb:schematic?.design?.ibA,
   schematicReview:schematic?.design?.calculationReviewRequired,
   reportHasRcbo:report.includes('RCBO-INTEGRATION')&&report.includes('RCBO'),
   issueCodeCount:registry.length,
   globalCatalogUntouched:catalogDevice('RCBO-INTEGRATION')===null
  };
 });
 assert.equal(rcboWorkflow.error,null,JSON.stringify(rcboWorkflow));
 assert.equal(rcboWorkflow.selectedSku,'RCBO-INTEGRATION');
 assert.equal(rcboWorkflow.selectedKind,'RCBO');
 assert.equal(rcboWorkflow.candidateKind,'RCBO');
 assert.equal(rcboWorkflow.selectionPotential,true);
 assert.equal(rcboWorkflow.branchWidth,2);
 assert.equal(rcboWorkflow.boardWidth,2);
 assert.equal(rcboWorkflow.boardArticle,'RCBO-INTEGRATION');
 assert.equal(rcboWorkflow.bomWidth,2);
 assert.equal(rcboWorkflow.bomKind,'RCBO');
 assert.equal(rcboWorkflow.schematicKind,'RCBO');
 assert.equal(rcboWorkflow.schematicIb,10);
 assert.equal(rcboWorkflow.schematicReview,true);
 assert.equal(rcboWorkflow.reportHasRcbo,true);
 assert.equal(rcboWorkflow.globalCatalogUntouched,true);

 assert.ok(await page.evaluate(()=>epEngineeringBundleV1(state,catalogDevice).sections.faultRoutes.rows[0].ikMinA>400));
 await page.locator('#faultRoutePanel summary').click();
 await page.locator('#faultRoutePanel').screenshot({path:'browser-fault-route.png'});
 await page.screenshot({path:'browser-integration.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS: real Chromium load → catalogue → calculation → DIN move → undo/redo → reload → JSON roundtrip → bundle');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());

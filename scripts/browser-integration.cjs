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
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('electropanel_web_preview')).catalogArticles.length),3);

 assert.ok(await page.evaluate(()=>epEngineeringBundleV1(state,catalogDevice).sections.faultRoutes.rows[0].ikMinA>400));
 await page.locator('#faultRoutePanel summary').click();
 await page.locator('#faultRoutePanel').screenshot({path:'browser-fault-route.png'});
 await page.screenshot({path:'browser-integration.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS: real Chromium load → catalogue → calculation → DIN move → undo/redo → reload → JSON roundtrip → bundle');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());

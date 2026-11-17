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
 // New unified engineer workflow: consumer power -> existing arithmetic engine ->
 // candidate shortlist and linked diagram/DIN/BOM. Inputs remain user-owned.
 await page.evaluate(()=>switchView('loads'));
 assert.equal(await page.locator('#automationFlowPanel #workflowPreviewBtn').count(),1);
 const beforeWorkflow=await page.evaluate(()=>JSON.stringify(state.lines));
 await page.locator('#workflow-singleVoltageV').fill('230');
 await page.locator('#workflow-threeVoltageV').fill('400');
 await page.locator('#workflow-powerFactor').fill('0,9');
 await page.locator('#workflow-efficiency').fill('1');
 await page.locator('#workflow-demandFactor').fill('1');
 await page.locator('#workflowPreviewBtn').click();
 const workflowPreview=await page.evaluate(()=>{
  const r=epWorkflowPreviewV1(state,catalogDevice,
   projectCatalogEntries().map(([id,device])=>({id,device})),
   {singleVoltageV:230,threeVoltageV:400,powerFactor:.9,efficiency:1,demandFactor:1});
  return {circuits:r.summary.circuits,calculated:r.summary.calculated,
   stages:r.steps.length,preview:r.rows.length,
   approved:r.engineeringApproved};
 });
 assert.ok(workflowPreview.circuits>0);
 assert.ok(workflowPreview.calculated>0,JSON.stringify(workflowPreview));
 assert.equal(workflowPreview.stages,5);
 assert.equal(workflowPreview.approved,false);
 assert.equal(await page.evaluate(()=>JSON.stringify(state.lines)),beforeWorkflow,
  'Preview does not write calculations to project');
 await page.locator('#workflowApplyCurrentsBtn').click();
 const applied=await page.evaluate(()=>{
  const saved=normalizeImport(JSON.parse(localStorage.getItem('electropanel_web_preview')));
  return {updated:state.lines.filter(l=>l.loadCurrentCalculation?.powerSource==='circuit').length,
   persisted:saved.workflowDesignInputsV1?.singleVoltageV,
   arithmetic:saved.lines.filter(l=>l.loadCurrentCalculation?.powerSource==='circuit').length,
   railCapacity:state.railCount*state.railCapacity};
 });
 assert.ok(applied.updated>0,JSON.stringify(applied));
 assert.equal(applied.persisted,230);
 assert.equal(applied.arithmetic,applied.updated);
 await page.locator('#undoBtn').click();
 assert.equal(await page.evaluate(()=>state.lines.filter(l=>l.loadCurrentCalculation?.powerSource==='circuit').length),0);
 await page.locator('#redoBtn').click();
 assert.ok(await page.evaluate(()=>state.lines.some(l=>l.loadCurrentCalculation?.powerSource==='circuit')));
 const offer=page.locator('[data-workflow-article][data-workflow-line]').first();
 assert.ok(await offer.count()>0,'Draft workflow offers a reviewed provisional SKU');
 const proposalId=await offer.getAttribute('data-workflow-line');
 const proposalSku=await offer.getAttribute('data-workflow-article');
 await offer.click();
 const articleChoice=await page.evaluate(id=>{
  const line=state.lines.find(l=>l.id===id);
  const saved=normalizeImport(JSON.parse(localStorage.getItem('electropanel_web_preview')));
  return {selected:line?.catalogSku,stored:saved.lines.find(l=>l.id===id)?.catalogSku,
   requestedReview:line?.articleReplacementReview?.required};
 },proposalId);
 assert.equal(articleChoice.selected,proposalSku);
 assert.equal(articleChoice.stored,proposalSku);
 assert.equal(articleChoice.requestedReview,true);
 const workflowCsvDownload=page.waitForEvent('download');
 await page.locator('#workflowExportCsvBtn').click();
 const exportedWorkflow=await workflowCsvDownload;
 assert.match(exportedWorkflow.suggestedFilename(),/_workflow_DRAFT\.csv$/);
 const beforeConsumerCsv=await page.evaluate(()=>JSON.stringify(state));
 const consumerDownload=page.waitForEvent('download');
 await page.locator('#workflowConsumerCsvBtn').click();
 const exportedConsumers=await consumerDownload;
 assert.match(exportedConsumers.suggestedFilename(),/_consumers_DRAFT\\.csv$/);
 assert.equal(await page.evaluate(()=>JSON.stringify(state)),beforeConsumerCsv,
  'Consumer reconciliation export must not mutate engineering state');
 const auditUi=await page.evaluate(()=>epWorkflowConsumerAuditV1(state));
 assert.equal(auditUi.engineeringApproved,false);
 assert.ok(auditUi.rows.length>0);
 await page.locator('#undoBtn').click();
 assert.notEqual(await page.evaluate(id=>state.lines.find(l=>l.id===id)?.catalogSku,proposalId),proposalSku);
 await page.locator('#redoBtn').click();
 assert.equal(await page.evaluate(id=>state.lines.find(l=>l.id===id)?.catalogSku,proposalId),proposalSku);
 // Device-level supply source -> incoming -> outgoing apparatus via real controls.
 await page.evaluate(()=>switchView('board'));
 // Stage and scope must not demand cable length, external transformer or
 // manufacturer selectivity in a preliminary panel project.
 assert.equal(await page.locator('.ep-design-stage-scope').count(),1);
 const previewScope=await page.evaluate(()=>epDesignStageScopeV1(state));
 assert.equal(previewScope.stage,'PRELIMINARY');
 assert.ok(previewScope.notRequired.includes('CABLE_ROUTE_AND_LENGTH'));
 assert.ok(previewScope.notRequired.includes('EXTERNAL_NETWORK_MODEL'));
 await page.locator('.ep-design-stage-scope summary').click();
 await page.locator('#designStageSelect').selectOption('BOARD_DESIGN');
 await page.locator('#designSelectivityRequested').check();
 await page.locator('#designStageSave').click();
 const stageAfterSave=await page.evaluate(()=>{
  const restored=normalizeImport(JSON.parse(localStorage.getItem('electropanel_web_preview')));
  const scope=epDesignStageScopeV1(state);
  return {stage:state.designStageV1,selectivity:scope.selectivityRequested,
   persisted:restored.designRequirementsV1?.selectivity,
   scopeRequired:scope.required.includes('MANUFACTURER_SELECTIVITY')};
 });
 assert.deepEqual(stageAfterSave,{stage:'BOARD_DESIGN',selectivity:true,
  persisted:true,scopeRequired:true});
 await page.locator('.ep-design-stage-scope summary').click();
 await page.locator('#designStageSelect').selectOption('PRELIMINARY');
 await page.locator('#designSelectivityRequested').uncheck();
 await page.locator('#designStageSave').click();
 assert.equal(await page.evaluate(()=>epDesignStageScopeV1(state).selectivityRequested),false);
 await page.locator('#deviceSupplyIncomingId').fill('QF0');
 await page.locator('#deviceSupplyIncomingLabel').fill('Главный ввод');
 await page.locator('#deviceSupplyIncomingSave').click();
 assert.equal(await page.locator('.ep-incoming-terminal-bindings').count(),1);
 await page.locator('.ep-incoming-terminal-bindings summary').click();
 await page.locator('#incomingBindingIncoming').selectOption('QF0');
 await page.locator('#incomingBindingSave').click();
 assert.equal(await page.evaluate(()=>(state.incomingTerminalBindingsV1||[]).length),0,
  'Unknown terminal-model device must not create an incoming binding');
 assert.equal(await page.locator('.ep-device-supply-cross').count(),1);

 await page.locator('#deviceSupplyFrom').selectOption('SOURCE:MAIN');
 await page.locator('#deviceSupplyTo').selectOption('INCOMING:QF0');
 await page.locator('#deviceSupplyLinkSave').click();
 const deviceGraphUI=await page.evaluate(()=>{
  const r=epDeviceSupplyAuditV1(state),persisted=JSON.parse(localStorage.getItem('electropanel_web_preview'));
  const restored=normalizeImport(persisted);
  return {edges:r.edges.length,source:r.edges[0]?.from,
   restored:restored.deviceSupplyV1?.links.length,
   selectivity:r.selectivityStatus,approval:r.engineeringApproved};
 });
 assert.equal(deviceGraphUI.edges,1,JSON.stringify(deviceGraphUI));
 assert.equal(deviceGraphUI.source,'SOURCE:MAIN');
 assert.equal(deviceGraphUI.restored,1);
 assert.equal(deviceGraphUI.selectivity,'NOT_ASSESSED');
 assert.equal(deviceGraphUI.approval,false);
 const terminalReconciliation=await page.evaluate(()=>{
  const r=epDeviceSupplyTerminalReconciliationV1(state);
  const bundle=epEngineeringBundleV1(state,catalogDevice);
  return {status:r.status,rows:r.rows.length,physical:r.physicalContinuity,
   bundleStatus:bundle.statuses.supplyTerminals,approved:r.engineeringApproved};
 });
 assert.equal(terminalReconciliation.rows,0,JSON.stringify(terminalReconciliation));
 assert.equal(terminalReconciliation.status,'UNKNOWN');
 assert.equal(terminalReconciliation.physical,'NOT_VERIFIED');
 assert.equal(terminalReconciliation.approved,false);
 assert.equal(await page.locator('.ep-device-supply-terminals').count(),1);

 await page.locator('#deviceSupplyFrom').selectOption('INCOMING:QF0');
 await page.locator('#deviceSupplyTo').selectOption('INCOMING:QF0');
 await page.locator('#deviceSupplyLinkSave').click();
 assert.equal(await page.evaluate(()=>state.deviceSupplyV1.links.length),1,'self-feed rejected');
 await page.locator('#undoBtn').click();
 assert.equal(await page.evaluate(()=>state.deviceSupplyV1?.links.length||0),0);
 await page.locator('#redoBtn').click();
 assert.equal(await page.evaluate(()=>state.deviceSupplyV1.links.length),1);
 await page.locator('[data-device-supply-unlink="INCOMING:QF0"]').click();
 assert.equal(await page.evaluate(()=>state.deviceSupplyV1.links.length),0);
 // Enter prospective maximum Ik for an incoming breaker using existing R/X engine.
 await page.locator('#deviceSupplyFrom').selectOption('SOURCE:MAIN');
 await page.locator('#deviceSupplyTo').selectOption('INCOMING:QF0');
 await page.locator('#deviceSupplyLinkSave').click();
 assert.equal(await page.locator('.ep-incoming-maximum').count(),1);
 await page.locator('.ep-incoming-maximum summary').click();
 await page.locator('#incomingMaxNode').selectOption('INCOMING:QF0');
 await page.locator('#incomingMaxSourceModel').selectOption('DECLARED_RX');
 await page.locator('#incomingMaxU').fill('400');
 await page.locator('#incomingMaxC').fill('1,1');
 await page.locator('#incomingMaxR').fill('0,04');
 await page.locator('#incomingMaxX').fill('0,03');
 await page.locator('#incomingMaxNet').fill('Input node R/X source calculation 2026');
 await page.locator('#incomingMaxSave').click();
 const calculatedIncoming=await page.evaluate(()=>{
  const report=epIncomingMaximumAuditV1(state,catalogDevice);
  const restored=normalizeImport(JSON.parse(localStorage.getItem('electropanel_web_preview')));
  const b=epEngineeringBundleV1(state,catalogDevice);
  return {rows:report.rows.length,ik:report.rows[0]?.ikMaxKa,
   imported:restored.incomingMaximumStudiesV1?.length,
   section:b.sections.incomingMaximum.rows.length,
   status:report.status,approved:report.engineeringApproved};
 });
 assert.equal(calculatedIncoming.rows,1,JSON.stringify(calculatedIncoming));
 assert.ok(calculatedIncoming.ik>0);
 assert.equal(calculatedIncoming.imported,1);
 assert.equal(calculatedIncoming.section,1);
 assert.equal(calculatedIncoming.approved,false);
 assert.equal(await page.locator('.ep-protection-evidence-matrix').count(),1);
 await page.locator('.ep-incoming-maximum summary').click();
 await page.locator('[data-incoming-max-clear="INCOMING:QF0"]').click();
 assert.equal(await page.evaluate(()=>(state.incomingMaximumStudiesV1||[]).length),0);
 await page.locator('[data-device-supply-unlink="INCOMING:QF0"]').click();
 assert.equal(await page.evaluate(()=>state.deviceSupplyV1.links.length),0);
 // A missing line-location calculation must be rejected rather than inferred.
 await page.locator('.ep-calculated-device-fault summary').click();
 const probeBranch=await page.evaluate(()=>state.branchDevices[0].id);
 await page.locator('#calculatedFaultBranch').selectOption('BRANCH:'+probeBranch);
 await page.locator('#calculatedFaultBind').click();
 assert.equal(await page.evaluate(()=>(state.calculatedDeviceFaultBindingsV1||[]).length),0);
 // A local short-circuit study must bind to a selected device AND its actual supply path.
 await page.locator('#deviceSupplyFrom').selectOption('SOURCE:MAIN');
 await page.locator('#deviceSupplyTo').selectOption('INCOMING:QF0');
 await page.locator('#deviceSupplyLinkSave').click();
 await page.locator('.ep-device-fault summary').click();
 await page.locator('#deviceFaultNode').selectOption('INCOMING:QF0');
 await page.locator('#deviceFaultIk').fill('6,5');
 await page.locator('#deviceFaultVoltage').fill('230');
 await page.locator('#deviceFaultSource').fill('Documented maximum fault study F-100');
 await page.locator('#deviceFaultRevision').fill('revision A');
 await page.locator('#deviceFaultSave').click();
 const locationStudy=await page.evaluate(()=>{
  const report=epDeviceFaultAuditV1(state,catalogDevice);
  const original=JSON.parse(localStorage.getItem('electropanel_web_preview'));
  const restored=normalizeImport(original);
  const engineering=epEngineeringBundleV1(state,catalogDevice);
  return {count:report.rows.length,ik:report.rows[0]?.ikMaxKa,
   source:report.rows[0]?.sourceDocument,
   imported:restored.deviceFaultScenariosV1?.length,
   section:engineering.sections.deviceFaultScenarios.rows.length,
   selectivity:report.selectivityStatus,approved:report.engineeringApproved};
 });
 assert.equal(locationStudy.count,1,JSON.stringify(locationStudy));
 assert.equal(locationStudy.ik,6.5);
 assert.equal(locationStudy.imported,1);
 assert.equal(locationStudy.section,1);
 assert.equal(locationStudy.selectivity,'NOT_ASSESSED');
 assert.equal(locationStudy.approved,false);
 await page.locator('#undoBtn').click();
 assert.equal(await page.evaluate(()=>(state.deviceFaultScenariosV1||[]).length),0);
 await page.locator('#redoBtn').click();
 assert.equal(await page.evaluate(()=>(state.deviceFaultScenariosV1||[]).length),1);
 await page.locator('.ep-device-fault summary').click();
 await page.locator('[data-device-fault-clear="INCOMING:QF0"]').click();
 assert.equal(await page.evaluate(()=>(state.deviceFaultScenariosV1||[]).length),0);
 await page.locator('[data-device-supply-unlink="INCOMING:QF0"]').click();
 assert.equal(await page.evaluate(()=>state.deviceSupplyV1.links.length),0);

 // Manufacturer exact-pair evidence is entered only after the upstream power path is declared.
 const branch1=await page.evaluate(()=>state.branchDevices.find(x=>x.circuitId==='L1').id);
 await page.locator('#deviceSupplyFrom').selectOption('SOURCE:MAIN');
 await page.locator('#deviceSupplyTo').selectOption('INCOMING:QF0');
 await page.locator('#deviceSupplyLinkSave').click();
 await page.locator('#deviceSupplyFrom').selectOption('INCOMING:QF0');
 await page.locator('#deviceSupplyTo').selectOption('BRANCH:'+branch1);
 await page.locator('#deviceSupplyConductors').selectOption('L1,N');
 await page.locator('#deviceSupplyLinkSave').click();
 await page.locator('.ep-device-fault summary').click();
 await page.locator('#deviceFaultNode').selectOption('BRANCH:'+branch1);
 await page.locator('#deviceFaultIk').fill('5');
 await page.locator('#deviceFaultVoltage').fill('230');
 await page.locator('#deviceFaultSource').fill('Location fault study L1');
 await page.locator('#deviceFaultRevision').fill('A');
 await page.locator('#deviceFaultSave').click();
 await page.locator('.ep-coordination-evidence summary').click();
 await page.locator('#coordPair').selectOption('INCOMING:QF0|BRANCH:'+branch1);
 await page.locator('#coordType').selectOption('SELECTIVITY_LIMIT');
 await page.locator('#coordVoltage').fill('230');
 await page.locator('#coordLimit').fill('8');
 await page.locator('#coordMaker').fill('Manufacturer declared example');
 await page.locator('#coordDocument').fill('Example application table');
 await page.locator('#coordRevision').fill('revision A');
 await page.locator('#coordPage').fill('table 2');
 await page.locator('#coordUrl').fill('https://example.org/product.pdf');
 await page.locator('#coordSave').click();
 const pairStudy=await page.evaluate(()=>{
  const r=epCoordAuditV1(state,catalogDevice);
  const project=normalizeImport(JSON.parse(localStorage.getItem('electropanel_web_preview')));
  const b=epEngineeringBundleV1(state,catalogDevice);
  return {records:r.rows.length,imported:project.deviceCoordinationEvidenceV1?.length,
   pair:b.sections.deviceCoordinationEvidence.rows.length,
   selectivity:r.selectivityStatus,backup:r.backupStatus,approved:r.engineeringApproved};
 });
 assert.equal(pairStudy.records,1,JSON.stringify(pairStudy));
 assert.equal(pairStudy.imported,1);
 assert.equal(pairStudy.pair,1);
 assert.equal(pairStudy.selectivity,'NOT_ASSESSED');
 assert.equal(pairStudy.backup,'NOT_ASSESSED');
 assert.equal(pairStudy.approved,false);
 await page.locator('#undoBtn').click();
 assert.equal(await page.evaluate(()=>(state.deviceCoordinationEvidenceV1||[]).length),0);
 await page.locator('#redoBtn').click();
 assert.equal(await page.evaluate(()=>(state.deviceCoordinationEvidenceV1||[]).length),1);
 await page.locator('.ep-coordination-evidence summary').click();
 await page.locator('[data-coord-clear="INCOMING:QF0|BRANCH:'+branch1+'|SELECTIVITY_LIMIT"]').click();
 assert.equal(await page.evaluate(()=>(state.deviceCoordinationEvidenceV1||[]).length),0);
 await page.locator('.ep-device-fault summary').click();
 await page.locator('[data-device-fault-clear="BRANCH:'+branch1+'"]').click();
 await page.locator('[data-device-supply-unlink="BRANCH:'+branch1+'"]').click();
 await page.locator('[data-device-supply-unlink="INCOMING:QF0"]').click();
 assert.equal(await page.evaluate(()=>state.deviceSupplyV1.links.length),0);

 // Engineer edits declared upstream protection hierarchy using the shipped UI.
 await page.evaluate(()=>switchView('board'));
 await page.locator('#protectionDownstream').selectOption('L2');
 await page.locator('#protectionUpstream').selectOption('L1');
 await page.locator('#protectionLinkSave').click();
 const savedTopology=await page.evaluate(()=>{
  const local=JSON.parse(localStorage.getItem('electropanel_web_preview'));
  const imported=normalizeImport(local);
  const bundle=epEngineeringBundleV1(state,catalogDevice);
  return {version:local.protectionLinksVersion,links:local.protectionLinks,
   imported:imported.protectionLinks,
   edges:bundle.sections.protectionTopology.edges.length,
   selectivity:bundle.sections.protectionTopology.selectivityStatus};
 });
 assert.equal(savedTopology.version,1,JSON.stringify(savedTopology));
 assert.deepEqual(savedTopology.links,[{downstreamLineId:'L2',upstreamLineId:'L1'}]);
 assert.deepEqual(savedTopology.imported,savedTopology.links);
 assert.equal(savedTopology.edges,1);
 assert.equal(savedTopology.selectivity,'NOT_ASSESSED');
 const supplyModel=await page.evaluate(()=>{
  const r=epSupplyDeviceGraphV1(state);
  return {status:r.status,nodes:r.nodes.length,edges:r.edges.length,
   approved:r.engineeringApproved,physical:r.physicalContinuity};
 });
 assert.ok(supplyModel.nodes>0,JSON.stringify(supplyModel));
 assert.equal(supplyModel.approved,false);
 assert.equal(supplyModel.physical,'NOT_VERIFIED');
 assert.equal(await page.locator('.ep-supply-device-graph').count(),1);

 assert.equal(await page.locator('.ep-protection-device-chain').count(),1);
 const deviceEvidence=await page.evaluate(()=>{
  const r=epProtectionDeviceChainV1(state,catalogDevice);
  return {count:r.pairs.length,selectivity:r.selectivityStatus,
   approved:r.engineeringApproved,ids:r.pairs.map(x=>[x.downstreamDeviceId,x.upstreamDeviceId])};
 });
 assert.equal(deviceEvidence.count,1);
 assert.equal(deviceEvidence.selectivity,'NOT_ASSESSED');
 assert.equal(deviceEvidence.approved,false);
 assert.ok(deviceEvidence.ids[0].every(Boolean),JSON.stringify(deviceEvidence));

 await page.locator('#protectionDownstream').selectOption('L1');
 await page.locator('#protectionUpstream').selectOption('L2');
 await page.locator('#protectionLinkSave').click();
 assert.equal(await page.evaluate(()=>state.protectionLinks.length),1,'cycle must be rejected atomically');
 await page.locator('#undoBtn').click();
 assert.equal(await page.evaluate(()=>(state.protectionLinks||[]).length),0);
 await page.locator('#redoBtn').click();
 assert.equal(await page.evaluate(()=>(state.protectionLinks||[]).length),1);
 await page.locator('[data-protection-unlink="L2"]').click();
 assert.equal(await page.evaluate(()=>state.protectionLinks.length),0);
 
 await page.evaluate(()=>{selectedLine='L1';switchView('board');});
 assert.equal(await page.locator('#boardCanvas [data-line]').count(),6);
 // Actual board controls must expose approved tier names, preserve selected
 // circuit, and never permit a manufacturer without source-backed articles.
 await page.locator('#boardCanvas [data-line="L1"]').click();
 assert.equal(await page.locator('#catalogTier').count(),1);
 await page.locator('#catalogTier').selectOption('comfort');
 assert.equal(await page.locator('#catalogMaker option[value="Panasonic"]').getAttribute('disabled'),'');
 assert.equal(await page.locator('#catalogMaker option[value="Schneider Electric"]').isDisabled(),false);
 await page.locator('#catalogTier').selectOption('premium');
 assert.equal(await page.locator('#catalogMaker option[value="Eaton"]').count(),1);
 assert.equal(await page.locator('#catalogMaker option[value="CHINT"]').count(),0);
 await page.locator('#catalogTier').selectOption('');
 assert.equal(await page.locator('#catalogTier').inputValue(),'');

 // Real browser: engineer can enter max L-N fault scenario and retain the
 // independently declared input across the project persistence roundtrip.
 const maxFaultPage=await browser.newPage({viewport:{width:1280,height:900}});
 try{
  await maxFaultPage.goto('http://127.0.0.1:'+server.address().port);
  await maxFaultPage.locator('#loadDemo').click();
  await maxFaultPage.evaluate(()=>{selectedLine='L1';switchView('board');});
  const maxForm=maxFaultPage.locator('#maximumFaultPanel [data-max-fault-model="SINGLE_PHASE_L_N"]');
  assert.equal(await maxForm.count(),1);
  await maxFaultPage.locator('#maximumFaultPanel > details > summary').click();
  await maxForm.locator('xpath=..').locator('summary').click();
  for(const [key,value] of Object.entries({
   u0V:'230',cmax:'1.1',comparisonPoint:'L1-OUTGOING',sourceROhm:'0.04',sourceXOhm:'0.03',
   networkSource:'Declared transformer equivalent'
  }))await maxForm.locator('[name="'+key+'"]').fill(value);
  for(const [key,value] of Object.entries({
   lengthM:'30',phaseROhmKm:'0.4',neutralROhmKm:'0.6',
   phaseXOhmKm:'0.08',neutralXOhmKm:'0.09',source:'Declared cable R/X'
  }))await maxForm.locator('[data-max-segment-field="'+key+'"]').fill(value);
  await maxForm.locator('[data-max-segment-temperature]').check();
  await maxForm.locator('button[type="submit"]').click();
  const maxState=await maxFaultPage.evaluate(()=>{
   const line=state.lines.find(x=>x.id==='L1');
   const stored=JSON.parse(localStorage.getItem('electropanel_web_preview'))
    .lines.find(x=>x.id==='L1');
   const result=epMaximumFaultCurrentV2(state,line,catalogDevice);
   return {model:line.maximumFaultInput?.model,segments:line.maximumFaultInput?.segments?.length,
    basis:line.maximumFaultInput?.basis?.catalogSku??null,
    source:stored.maximumFaultInput?.networkSource,
    max:result.ikMaxKa,approved:result.engineeringApproved};
  });
  assert.equal(maxState.model,'SINGLE_PHASE_L_N');
  assert.equal(maxState.segments,1);
  assert.equal(maxState.source,'Declared transformer equivalent');
  assert.ok(maxState.max>0,JSON.stringify(maxState));
  assert.equal(maxState.approved,false);
 }finally{await maxFaultPage.close();}

 // Transformer equivalent is a separate real UI path; it must save the
 // nameplate and upstream network evidence, rather than a prefilled impedance.
 const transformerPage=await browser.newPage({viewport:{width:1280,height:900}});
 try{
  await transformerPage.goto('http://127.0.0.1:'+server.address().port);
  await transformerPage.locator('#loadDemo').click();
  await transformerPage.evaluate(()=>{selectedLine='L1';switchView('board');});
  await transformerPage.locator('#maximumFaultPanel > details > summary').click();
  const form=transformerPage.locator('#maximumFaultPanel [data-max-fault-source-model="TRANSFORMER_WITH_UPSTREAM"]');
  assert.equal(await form.count(),1);
  await form.locator('xpath=..').locator('summary').click();
  for(const [key,value] of Object.entries({
   uLLV:'400',cmax:'1.1',comparisonPoint:'MAIN-BUSBAR',ratedPowerKva:'1000',ratedVoltageV:'400',
   ukPercent:'6',loadLossW:'9000',upstreamROhm:'0.001',
   upstreamXOhm:'0.002',source:'Manufacturer short-circuit data',
   upstreamSource:'Upstream grid impedance referred to LV'
  }))await form.locator('[name="'+key+'"]').fill(value);
  for(const [key,value] of Object.entries({
   lengthM:'30',r1OhmKm:'0.4',x1OhmKm:'0.08',source:'Design cable R/X'
  }))await form.locator('[data-max-segment-field="'+key+'"]').fill(value);
  await form.locator('[name="lossBasisConfirmed"]').check();
  await form.locator('[data-max-segment-temperature]').check();
  await form.locator('button[type="submit"]').click();
  const saved=await transformerPage.evaluate(()=>{
   const line=state.lines.find(l=>l.id==='L1');
   const raw=JSON.parse(localStorage.getItem('electropanel_web_preview'));
   const copy=raw.lines.find(l=>l.id==='L1');
   const calc=epMaximumFaultCurrentV2(state,line,catalogDevice);
   return {sourceModel:copy.maximumFaultInput?.sourceModel,
    kva:copy.maximumFaultInput?.transformer?.ratedPowerKva,
    source:copy.maximumFaultInput?.transformer?.source,
    ikMaxKa:calc.ikMaxKa,approved:calc.engineeringApproved};
  });
  assert.equal(saved.sourceModel,'TRANSFORMER_WITH_UPSTREAM');
  assert.equal(saved.kva,'1000');
  assert.equal(saved.source,'Manufacturer short-circuit data');
  assert.ok(saved.ikMaxKa>0,JSON.stringify(saved));
  assert.equal(saved.approved,false);
 }finally{await transformerPage.close();}

 // Browser-bundled unified protection decision must be consumable through
 // the actual engineering package and print path, not only a standalone module.
 const coreDecision=await page.evaluate(()=>{
  const draft=epEngineeringBundleV1(state,catalogDevice);
  const decision=draft.sections.protectionDecision;
  const html=epEngineeringPrintV1(draft);
  return {count:decision?.rows?.length??null,overall:decision?.status,
   approved:decision?.engineeringApproved,printIncludes:html.includes('Единая проверка защиты')};
 });
 assert.equal(coreDecision.count,6,JSON.stringify(coreDecision));
 assert.notEqual(coreDecision.approved,true);
 assert.equal(coreDecision.printIncludes,true);
 // Real browser: cable capacity with correction factors and conventional I2
 // must be editable, persisted and reflected in the unified protection decision.
 const cablePage=await browser.newPage({viewport:{width:1280,height:900}});
 try{
  await cablePage.goto('http://127.0.0.1:'+server.address().port);
  await cablePage.locator('#loadDemo').click();
  await cablePage.evaluate(()=>{selectedLine='L1';switchView('board');});
  await cablePage.locator('#catalogSku').selectOption('SE-A9F74116');
  const meta=await cablePage.evaluate(()=>{
   const l=state.lines.find(x=>x.id==='L1'),a=catalogDevice(l.catalogSku);
   return {sku:l.catalogSku,inA:a?.inA};
  });
  assert.ok(meta.sku&&meta.inA,JSON.stringify(meta));
  await cablePage.locator('#cableOverloadPanel [data-cable-overload-input] > summary').click();
  const form=cablePage.locator('#cableOverloadPanel [data-cable-overload]');
  const fields={overloadBaseIz:'30',overloadBaseSource:'Test manufacturer Iz reference',
   overloadI2:'35',overloadI2Source:'Test manufacturer I2 guarantee',
   overloadI2Standard:'Test IEC device standard edition',
   overloadApplicability:'Test confirmed installation factors',overloadSku:meta.sku};
  for(const [name,value] of Object.entries(fields))
   await form.locator('[name="'+name+'"]').fill(value);
  await form.locator('[data-overload-key="id"]').fill('ambient');
  await form.locator('[data-overload-key="value"]').fill('0.8');
  await form.locator('[data-overload-key="source"]').fill('Test temperature coefficient');
  await form.locator('[name="overloadApplicable"]').check();
  await form.locator('[name="overloadEnable"]').check();
  await form.locator('[data-overload-save]').click();
  const cableProof=await cablePage.evaluate(()=>{
   const line=state.lines.find(x=>x.id==='L1');
   const saved=JSON.parse(localStorage.getItem('electropanel_web_preview'));
   const stored=saved.lines.find(x=>x.id==='L1').overloadCoordinationInput;
   const result=epCableOverloadCoordinationV1(state,line,catalogDevice(line.catalogSku));
   const decision=epProtectionDecisionV1(state,catalogDevice).rows.find(x=>x.lineId==='L1');
   return {base:stored?.baseIzA,factor:stored?.factors?.[0]?.value,
    source:stored?.i2Source,check:result.i2IzStatus,
    decision:decision.overloadCoordination?.i2IzStatus,approved:decision.engineeringApproved};
  });
  assert.equal(cableProof.base,'30');
  assert.equal(cableProof.factor,'0.8');
  assert.equal(cableProof.source,'Test manufacturer I2 guarantee');
  assert.equal(cableProof.check,'FAIL');
  assert.equal(cableProof.decision,'FAIL');
  assert.equal(cableProof.approved,false);
 }finally{await cablePage.close();}

 // Real browser: thermal short-circuit withstand is entered and persisted
 // as a declared scenario and remains a blocking numerical failure.
 const thermalPage=await browser.newPage({viewport:{width:1280,height:900}});
 try{
  await thermalPage.goto('http://127.0.0.1:'+server.address().port);
  await thermalPage.locator('#loadDemo').click();
  await thermalPage.evaluate(()=>{selectedLine='L1';switchView('board');});
  await thermalPage.locator('#catalogSku').selectOption('SE-A9F74116');
  const form=thermalPage.locator('#cableThermalPanel [data-cable-thermal]');
  await form.locator('[data-cable-thermal-editor] > summary').click();
  for(const [name,value] of Object.entries({
   thermalInsulation:'PVC insulation',thermalSection:'6',thermalK:'115',
   thermalPoint:'CIRCUIT-L1-END',thermalFaultCurrent:'5000',
   thermalClearingTime:'0.1',thermalKSource:'Declared temperature basis',
   thermalTimeSource:'Declared source of maximum clearing time',
   thermalCurrentSource:'Declared source of fault current',
   thermalConductorSource:'Cu cable 6 mm2 source',
   thermalMethodSource:'Engineer reviewed adiabatic application'
  }))await form.locator('[name="'+name+'"]').fill(value);
  await form.locator('[name="thermalRole"]').selectOption('PHASE');
  await form.locator('[name="thermalMaterial"]').selectOption('Cu');
  await form.locator('[name="thermalCurrentBasis"]').selectOption('DECLARED_SCENARIO');
  await form.locator('[name="thermalFaultModel"]').selectOption('SINGLE_PHASE_L_N');
  for(const key of ['thermalTemperatureConfirmed','thermalMethodConfirmed','thermalGuaranteeConfirmed'])
   await form.locator('[name="'+key+'"]').check();
  await form.locator('button[type="submit"]').click();
  const thermalResult=await thermalPage.evaluate(()=>{
   const l=state.lines.find(x=>x.id==='L1');
   const stored=JSON.parse(localStorage.getItem('electropanel_web_preview'))
    .lines.find(x=>x.id==='L1').shortCircuitThermalInput;
   const r=epCableShortCircuitThermalV1(state,l,catalogDevice(l.catalogSku));
   const combined=epProtectionDecisionV1(state,catalogDevice).rows.find(x=>x.lineId==='L1');
   return {k:stored?.kA_SqrtS_PerMm2,time:stored?.clearingTimeS,
    source:stored?.kSource,current:r.faultCurrentA,energy:r.faultEnergyA2s,
    status:r.numericalStatus,combined:combined.shortCircuitThermal?.numericalStatus,
    approved:combined.engineeringApproved};
  });
  assert.equal(thermalResult.k,'115');
  assert.equal(thermalResult.time,'0.1');
  assert.equal(thermalResult.source,'Declared temperature basis');
  assert.equal(thermalResult.current,5000);
  assert.equal(thermalResult.energy,2500000);
  assert.equal(thermalResult.status,'FAIL');
  assert.equal(thermalResult.combined,'FAIL');
  assert.equal(thermalResult.approved,false);
 }finally{await thermalPage.close();}

 // Real browser: manufacturer let-through I2t evidence is bound to both
 // catalogue key and exact article and persisted in the project.
 const letPage=await browser.newPage({viewport:{width:1280,height:900}});
 try{
  await letPage.goto('http://127.0.0.1:'+server.address().port);
  await letPage.locator('#loadDemo').click();
  await letPage.evaluate(()=>{selectedLine='L1';switchView('board');});
  await letPage.locator('#catalogSku').selectOption('SE-A9F73110');
  const info=await letPage.evaluate(()=>{
   const l=state.lines.find(x=>x.id==='L1'),a=catalogDevice(l.catalogSku);
   return {key:l.catalogSku,sku:a?.sku,inA:a?.inA,poles:a?.poles,
    standard:a?.icnStandard,voltage:a?.icnVoltageV};
  });
  assert.equal(info.sku,'A9F73110');
  assert.equal(info.voltage,230);
  const primaryFact=await letPage.evaluate(()=>{
   const line=state.lines.find(x=>x.id==='L1');
   const audit=epManufacturerFactsReconciliationV1(state,catalogDevice);
   const row=audit.rows.find(x=>x.lineId===line.id);
   const bundle=epEngineeringBundleV1(state,catalogDevice);
   return {status:row?.status,url:row?.sourceUrl,missingI2t:row?.unavailableClaims?.includes('I2T_LET_THROUGH_BANDS'),
    bundleStatus:bundle.sections.manufacturerFacts?.rows?.find(x=>x.lineId===line.id)?.status};
  });
  assert.equal(primaryFact.status,'FACTS_MATCH');
  assert.equal(primaryFact.bundleStatus,'FACTS_MATCH');
  assert.equal(primaryFact.missingI2t,true);
  assert.ok(primaryFact.url?.startsWith('https://eshop.se.com/'));
  await letPage.locator('#manufacturerFactsPanel [data-manufacturer-facts] > summary').click();
  assert.equal(await letPage.locator('#manufacturerFactsPanel').getByText('Открыть источник производителя').count(),1);

  const form=letPage.locator('#breakerLetThroughPanel [data-let-through]');
  await form.locator('[data-let-through-editor] > summary').click();
  for(const [name,value] of Object.entries({
   letCatalogKey:info.key,letArticleSku:info.sku,
   letArticleInA:String(info.inA),letStandard:info.standard,
   letVoltage:'230',letFrequency:'50',
   letApplicationVoltage:'230',letApplicationFrequency:'50',
   letPoles:String(info.poles),letPoint:'L1-END',
   letCurrent:'5000',letProspectiveSource:'Independent short-circuit calculation',
   letSection:'6',letK:'115',
   letManufacturerSource:'Declared manufacturer upper I2t curve',
   letConditionSource:'Manufacturer test voltage/frequency',
   letCableSource:'Declared 6mm2 copper cable',
   letKSource:'Declared Cu/PVC temperature conditions'
  }))await form.locator('[name="'+name+'"]').fill(value);
  for(const [name,value] of Object.entries({
   letModel:'SINGLE_PHASE_L_N',letCurrentBasis:'DECLARED_SCENARIO',
   letRole:'PHASE',letMaterial:'Cu'
  }))await form.locator('[name="'+name+'"]').selectOption(value);
  for(const [key,value] of Object.entries({
   minProspectiveA:'1000',maxProspectiveA:'6000',
   maxLetThroughA2s:'700000',source:'Manufacturer guaranteed test interval'
  }))await form.locator('[data-let-through-band-field="'+key+'"]').fill(value);
  for(const key of ['letEnvelopeConfirmed','letCableReviewed','letTemperatureConfirmed'])
   await form.locator('[name="'+key+'"]').check();
  await form.locator('button[type="submit"]').click();
  const result=await letPage.evaluate(()=>{
   const l=state.lines.find(x=>x.id==='L1');
   const saved=JSON.parse(localStorage.getItem('electropanel_web_preview'))
    .lines.find(x=>x.id==='L1').letThroughInput;
   const direct=epBreakerLetThroughV1(state,l,catalogDevice(l.catalogSku));
   const r=epProtectionDecisionV1(state,catalogDevice).rows.find(x=>x.lineId==='L1');
   return {key:saved?.catalogKey,sku:saved?.articleSku,
    prospective:direct.prospectiveCurrentA,energy:direct.letThroughUpperBoundA2s,
    numeric:direct.numericalStatus,
    combined:r.breakerLetThrough?.numericalStatus,approved:r.engineeringApproved};
  });
  assert.equal(result.key,'SE-A9F73110');
  assert.equal(result.sku,'A9F73110');
  assert.equal(result.prospective,5000);
  assert.equal(result.energy,700000);
  assert.equal(result.numeric,'NOT_DEMONSTRATED');
  assert.equal(result.combined,'NOT_DEMONSTRATED');
  assert.equal(result.approved,false);
  // A named document and exact graph scope can be registered as project-local
  // evidence without suggesting manufacturer authentication or certification.
  const evidence=letPage.locator('#manufacturerEvidencePanel [data-evidence-record]');
  await letPage.locator('#manufacturerEvidencePanel [data-evidence-editor] > summary').click();
  for(const [name,value] of Object.entries({
   evidenceId:'BROWSER-DOC-1',
   evidenceManufacturer:'Schneider Electric',
   evidenceSeries:'Acti9 iC60N',
   evidenceTitle:'Illustrative manufacturer graph reference (test only)',
   evidenceUrl:'https://example.org/demo-document.pdf',
   evidenceRevision:'test-edition-1',
   evidenceLocation:'page 5, graph 2',
   evidenceDate:'2026-11-15',
   evidenceReviewer:'browser-test'
  }))await evidence.locator('[name="'+name+'"]').fill(value);
  await evidence.locator('[name="evidenceSourceType"]').selectOption('MANUFACTURER_DOCUMENT');
  await evidence.locator('[name="evidenceChecked"]').check();
  await evidence.locator('button[type="submit"]').click();
  const evidenceResult=await letPage.evaluate(()=>{
   const raw=JSON.parse(localStorage.getItem('electropanel_web_preview'));
   const l=raw.lines.find(x=>x.id==='L1');
   const article=catalogDevice(l.catalogSku);
   const binding=epLetThroughEvidenceBindingV1(raw,l,article,l.letThroughInput);
   return {count:raw.manufacturerEvidenceRecords?.length,
    recordId:l.letThroughInput?.evidenceRecordId,
    documentPage:binding.documentLocation,matched:binding.matched,
    approved:binding.engineeringApproved};
  });
  assert.equal(evidenceResult.count,1);
  assert.equal(evidenceResult.recordId,'BROWSER-DOC-1');
  assert.equal(evidenceResult.documentPage,'page 5, graph 2');
  assert.equal(evidenceResult.matched,true);
  assert.equal(evidenceResult.approved,false);
 }finally{await letPage.close();}

 // Browser calculation: original maker-source conflicts must disqualify an
 // apparently arithmetic-compatible breaker, without modifying the catalogue.
 const sourceScreen=await page.evaluate(()=>{
  const l={id:'L-PROVENANCE',phase:'L1',
   overloadInput:{ibA:10,izA:20},faultInput:{ikKa:2,voltageV:230}};
  const device=epCatalogSku('SE-A9F74116');
  const good=epProtectiveDeviceShortlistV1(l,[{id:'SE-A9F74116',device}]).candidates[0];
  const bad=epProtectiveDeviceShortlistV1(l,[{id:'SE-A9F74116',device:{...device,sku:'INCORRECT'}}]).candidates[0];
  return {good:good.status,bad:bad.status,
   goodSource:good.manufacturerEvidence?.status,
   wrong:bad.reasons.includes('MANUFACTURER_SOURCE_CONFLICT'),
   missingI2t:good.caution.includes('MANUFACTURER_SOURCE_I2T_UNDOCUMENTED')};
 });
 assert.equal(sourceScreen.good,'POTENTIAL');
 assert.equal(sourceScreen.goodSource,'FACTS_MATCH');
 assert.equal(sourceScreen.bad,'REJECTED');
 assert.equal(sourceScreen.wrong,true);
 assert.equal(sourceScreen.missingI2t,true);
 const rankingScreen=await page.evaluate(()=>{
  const l={id:'L-RANK',phase:'L1',
   overloadInput:{ibA:10,izA:20},faultInput:{ikKa:2,voltageV:230}};
  const key='SE-A9F74116',device=epCatalogSku(key);
  const c=epProtectiveDeviceShortlistV1(l,[{id:key,device}]);
  const good=epProtectiveCandidateRankingV1(l,c).rows[0];
  const unresolved={...l,faultInput:{ikKa:2}};
  const missing=epProtectiveCandidateRankingV1(unresolved,
   epProtectiveDeviceShortlistV1(unresolved,[{id:key,device}])).rows[0];
  const contaminated=epProtectiveCandidateRankingV1(l,
   epProtectiveDeviceShortlistV1(l,[{id:key,device:{...device,sku:'OTHER'}}])).rows[0];
  return {good:good.classification,inHeadroom:good.currentHeadroomA,
   icnHeadroom:good.breakingHeadroomKa,
   missing:missing.classification,wrong:contaminated.classification,
   approved:good.engineeringApproved};
 });
 assert.equal(rankingScreen.good,'PRELIMINARY_CANDIDATE');
 assert.equal(rankingScreen.inHeadroom,6);
 assert.equal(rankingScreen.icnHeadroom,4);
 assert.equal(rankingScreen.missing,'INCOMPLETE');
 assert.equal(rankingScreen.wrong,'EXCLUDED');
 assert.equal(rankingScreen.approved,false);
 const scopedIkScreen=await page.evaluate(()=>{
  const key='SE-A9F74116',device=epCatalogSku(key);
  const line={id:'L-SCOPED',catalogSku:key,phase:'L1',modules:1,
   device:device.label,overloadInput:{ibA:10,izA:20},
   faultInput:{ikKa:2,voltageV:230},
   maximumFaultInput:{model:'SINGLE_PHASE_L_N',comparisonPoint:'END-L-SCOPED',
    u0V:230,cmax:1.1,sourceROhm:.033,sourceXOhm:.008,
    networkSource:'declared network equivalent',
    segments:[{lengthM:20,phaseROhmKm:.05,neutralROhmKm:.05,
     phaseXOhmKm:.02,neutralXOhmKm:.02,
     source:'declared conductor R/X',temperatureBasisConfirmed:true}]}};
  const project={earthing:'TN-S',lines:[line]};
  const entries=[{id:key,device}];
  const result=epProtectionWorkbenchV1(project,epCatalogSku,entries,'L-SCOPED');
  const row=result.selected.ranking.rows[0],r=epProtectiveDeviceProjectAuditV1(project,epCatalogSku,entries);
  return {source:row.ikComparisonSource,point:row.calculatedFaultPoint,
   ik:row.ikComparedKa,classification:row.classification,
   auditPotential:r.results[0].potential,approved:row.engineeringApproved};
 });
 assert.equal(scopedIkScreen.source,'CALCULATED_MAXIMUM');
 assert.equal(scopedIkScreen.point,'END-L-SCOPED');
 assert.ok(scopedIkScreen.ik>6);
 assert.equal(scopedIkScreen.classification,'EXCLUDED');
 assert.deepEqual(scopedIkScreen.auditPotential,[]);
 assert.equal(scopedIkScreen.approved,false);



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
    sku:'D16-30',label:'D16 30mA',modules:'2',widthMm:'36',poles:'2',inA:'16',
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
    projectCurrent:lookup(data.id)?.residualCurrentMa,selectedPoles:lookup(data.id)?.poles,
    filterAccepts:catalogBranchPolesCompatible('L1',lookup(data.id)),
    rejectsTwoPoleMCB:!catalogBranchPolesCompatible('L1',{...lookup(data.id),kind:'MCB'}),
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
   projectCurrent:30,selectedPoles:2,filterAccepts:true,rejectsTwoPoleMCB:true,
   schematicCurrent:30,schematicType:'A',
   protectionCurrent:30,protectionType:'A',bomCurrent:30,bomType:'A',
   printResidual:true,catalogueStatus:'UNVERIFIED'
  },'User-declared RCBO residual parameters must survive form -> storage -> selection -> schematic -> protection -> BOM -> print');
 }finally{await residualContext.close();}


 // Complete browser path: engineer records manufacturer source and Icn rating
 // before assigning an explicitly configured 1P+N protective apparatus.
 const sourceContext=await browser.newContext();
 try{
  const sourcePage=await sourceContext.newPage();
  await sourcePage.goto('http://127.0.0.1:'+server.address().port);
  await sourcePage.locator('#loadDemo').click();
  const sourceFlow=await sourcePage.evaluate(()=>{
   const form=document.getElementById('catalogArticleForm');
   if(!form)return {error:'Catalog form unavailable'};
   const fields={id:'BROWSER-MCB-1PN',maker:'Illustrative Maker',series:'Declared 1P+N',
    sku:'B16-1PN-TEST',label:'MCB B16 1P+N',modules:'2',widthMm:'36',poles:'2',
    poleConfiguration:'1P+N',inA:'16',curve:'B',icnKa:'6',
    icnVoltageV:'230',icnStandard:'IEC/EN 60898-1',kind:'MCB',
    source:'https://example.org/technical-sheet',
    productSource:'https://example.org/manufacturer-product',
    sourceReviewedAt:'2026-11-14'};
   for(const [key,value] of Object.entries(fields)){
    const input=form.elements.namedItem(key);
    if(!input)return {error:'Missing catalog field '+key};
    input.value=value;
   }
   form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
   const saved=state.catalogArticles.find(a=>a.id===fields.id);
   if(!saved)return {error:'Manufacturer article did not save'};
   const reopened=normalizeImport(JSON.parse(localStorage.getItem('electropanel_web_preview')));
   const restored=reopened.catalogArticles?.find(a=>a.id===fields.id);
   const p=structuredCloneCompat(state),line=p.lines.find(l=>['L1','L2','L3'].includes(l.phase))||p.lines[0];
   if(!line)return {error:'No demo circuit'};
   line.phase='L1';
   try{applyCatalogueSku(p,line.id,fields.id);}
   catch(err){return {error:'Cannot assign 1P+N MCB: '+err.message};}
   const lookup=epProjectCatalogV1(p,EP_CATALOG).lookup,selected=lookup(fields.id);
   const assigned=p.lines.find(l=>l.id===line.id);
   assigned.faultInput={ikKa:3,voltageV:400,source:'Engineer declaration'};
   assigned.overloadInput={ibA:10,izA:25};
   const candidateHigh=epProtectiveDeviceShortlistV1(assigned,[{id:fields.id,device:selected}]).candidates[0];
   const workHigh=epProtectionWorkbenchV1(p,lookup,[{id:fields.id,device:selected}],line.id);
   const highReasons=workHigh.selected?.reasons||[];
   const printHigh=epEngineeringPrintV1(epEngineeringBundleV1(p,lookup));
   assigned.faultInput.voltageV=230;
   const candidateLow=epProtectiveDeviceShortlistV1(assigned,[{id:fields.id,device:selected}]).candidates[0];
   const workLow=epProtectionWorkbenchV1(p,lookup,[{id:fields.id,device:selected}],line.id);
   const schematic=epSingleLineDraftV1(p,lookup);
   const evidence=epCatalogEvidenceAuditV1(p,lookup);
   const html=epEngineeringPrintV1(epEngineeringBundleV1(p,lookup));
   const node=schematic.nodes.find(n=>n.id==='CIRCUIT:'+line.id);
   return {savedPoles:saved.poleConfiguration,savedIcnVoltage:saved.icnVoltageV,
    restoredPoles:restored?.poleConfiguration,restoredDate:restored?.sourceReviewedAt,
    restoredProductUrl:restored?.productSource,assignedModules:assigned.modules,
    candidateHigh:candidateHigh?.status,
    blockedHigh:highReasons.includes('ARTICLE_ICN_VOLTAGE_LT_DECLARED'),
    reportHighVoltage:printHigh.includes('400'),
    candidateLow:candidateLow?.status,blockedLow:workLow.selected?.status==='BLOCKED',
    schematicPoleConfiguration:node?.article?.poleConfiguration,
    schematicVoltage:node?.design?.voltageV,
    evidenceDate:evidence.items.some(x=>x.articleId===fields.id&&x.sourceReviewedAt==='2026-11-14'),
    evidenceUnverified:evidence.items.some(x=>x.articleId===fields.id&&x.verificationStatus==='UNVERIFIED'),
    printHasProduct:html.includes('https://example.org/manufacturer-product'),
    printHasPoleConfiguration:html.includes('1P+N'),
    seedCatalogUnaffected:epCatalogSku(fields.id)===null,
    sourceApproved:epEngineeringBundleV1(p,lookup).engineeringApproved===true};
  });
  assert.deepEqual(sourceFlow,{
   savedPoles:'1P+N',savedIcnVoltage:230,
   restoredPoles:'1P+N',restoredDate:'2026-11-14',
   restoredProductUrl:'https://example.org/manufacturer-product',
   assignedModules:2,candidateHigh:'REJECTED',blockedHigh:true,
   reportHighVoltage:true,candidateLow:'POTENTIAL',blockedLow:false,
   schematicPoleConfiguration:'1P+N',schematicVoltage:230,
   evidenceDate:true,evidenceUnverified:true,
   printHasProduct:true,printHasPoleConfiguration:true,
   seedCatalogUnaffected:true,sourceApproved:false
  },'Source-backed 1P+N article must remain unverified and block insufficient Icn rated voltage');
 }finally{await sourceContext.close();}

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
 // Exact-article front, nominal DIN slot and declared body must agree in the live UI.
 const face=await page.evaluate(()=>{
  const row=document.querySelector('#boardCanvas [data-line="L1"]');
  const p=epDinPhysicalEnvelopeV1(epDraftBoardPlanV1(state,catalogDevice),catalogDevice);
  const d=p.rows.find(r=>r.deviceId===row?.dataset.apparatusId);
  return {asset:row?.dataset.frontAssetStatus,bodyWidth:row?.dataset.bodyWidthMm,
   slotWidth:row?.dataset.nominalSlotWidthMm,hasSvg:!!row?.querySelector('.ep-front-viewport svg'),
   hasPhoto:!!row?.querySelector('.ep-front-viewport img'),hasSelectedFront:
    !!document.querySelector('#selectedDevice .ep-preview-article-front svg'),
   geometryStatus:p.status,declaredWidth:d?.bodyWidthMm,
   approval:p.engineeringApproved};
 });
 assert.equal(face.asset,'STYLIZED_ONLY',JSON.stringify(face));
 assert.equal(face.hasSvg,true,JSON.stringify(face));
 assert.equal(face.hasPhoto,false,JSON.stringify(face));
 assert.equal(face.hasSelectedFront,true,JSON.stringify(face));
 assert.equal(face.declaredWidth,18,JSON.stringify(face));
 assert.equal(face.bodyWidth,'18');
 assert.equal(face.slotWidth,'18');
 assert.equal(face.approval,false);
 const manufacturerGallery=await page.evaluate(()=>{
  const gallery=document.querySelector('.ep-front-gallery');
  const cards=gallery?[...gallery.querySelectorAll('.ep-front-gallery-card')]:[];
  return {gallery:!!gallery,cards:cards.length,
   vectorFaces:gallery?.querySelectorAll('svg.ep-manufacturer-front').length||0,
   imageFaces:gallery?.querySelectorAll('img.ep-manufacturer-front-image').length||0};
 });
 assert.equal(manufacturerGallery.gallery,true,JSON.stringify(manufacturerGallery));
 assert.ok(manufacturerGallery.cards>0,JSON.stringify(manufacturerGallery));
 assert.ok(manufacturerGallery.vectorFaces>0,JSON.stringify(manufacturerGallery));
 assert.equal(manufacturerGallery.imageFaces,0,JSON.stringify(manufacturerGallery));
 const galleryAudit=await page.locator('.ep-front-gallery-audit').first().evaluate(el=>({
  status:el.dataset.frontAuditStatus,text:el.textContent
 }));
 assert.ok(['REVIEW_REQUIRED','BLOCKED'].includes(galleryAudit.status),JSON.stringify(galleryAudit));
 assert.match(galleryAudit.text,/аппаратов/);
 assert.match(galleryAudit.text,/габариты неизвестны/);
 await page.getByText('Фасады аппаратов в проекте',{exact:false}).first().click();
 const frontFilter=page.locator('.ep-front-gallery-controls input[type="search"]');
 assert.equal(await frontFilter.count(),1);
 await frontFilter.fill('no-such-article-9999');
 assert.match(await page.locator('.ep-front-gallery-count').textContent(),/Показано 0 из 0/);
 await frontFilter.fill('');
 assert.ok(await page.locator('.ep-front-gallery-card').count()>0);
 const makerOptions=await page.locator('.ep-front-gallery-controls select option').allTextContents();
 assert.ok(makerOptions.includes('Все производители'));
 const geometryFilter=page.locator('.ep-front-gallery-controls select[aria-label="Фильтр по габаритам аппарата"]');
 assert.equal(await geometryFilter.count(),1);
 await geometryFilter.selectOption('EXCEEDS_DIN_SLOT');
 assert.match(await page.locator('.ep-front-gallery-count').textContent(),/Показано /);
 await geometryFilter.selectOption('');
 const evidencePicker=page.locator('.ep-front-gallery-controls select[aria-label="Фильтр по подтверждению изображения"]');
 assert.equal(await evidencePicker.count(),1);
 await evidencePicker.selectOption('REVIEWED_IMAGE');
 assert.match(await page.locator('.ep-front-gallery-count').textContent(),/Показано 0 из 0/);
 await evidencePicker.selectOption('');
 assert.ok(await page.locator('.ep-front-gallery-card').count()>0);
 const inventoryExport=page.waitForEvent('download');
 await page.getByRole('button',{name:'Скачать ведомость фасадов CSV'}).click();
 const inventoryDownload=await inventoryExport;
 assert.match(inventoryDownload.suggestedFilename(),/_front_inventory\.csv$/);
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.locator('.ep-front-gallery-controls input[type="search"]').isVisible(),true);
 assert.equal(await page.locator('.ep-front-gallery-controls select[aria-label="Фильтр по подтверждению изображения"]').isVisible(),true);
 await page.setViewportSize({width:1440,height:1000});
 // Full cabinet model workflow through actual form, undo/redo, JSON persistence and DIN export.
 assert.equal(await page.locator('#cabinetGeometryPanel [data-cabinet-autoplan]').count(),1);
 const cabinetInputs={interiorWidthMm:'2000',interiorHeightMm:'1500',interiorDepthMm:'300',
  marginMm:'50',firstRowYMm:'40',zoneHeightMm:'120',rowGapMm:'35'};
 for(const [name,value] of Object.entries(cabinetInputs))
  await page.locator('#cabinetGeometryPanel [data-cabinet-autoplan] [name="'+name+'"]').fill(value);
 await page.locator('#cabinetGeometryPanel [data-cabinet-autoplan] button[type="submit"]').click();
 const cabinetSaved=await page.evaluate(()=>{
  const r=epCabinetFitAuditV1(state,catalogDevice);
  const saved=JSON.parse(localStorage.getItem('electropanel_web_preview'));
  const pack=epEngineeringBundleV1(state,catalogDevice);
  return {source:state.cabinetGeometryV1?.source,zones:state.cabinetGeometryV1?.zones.length,
   persisted:saved.cabinetGeometryV1?.interior.widthMm,
   dimensions:state.cabinetGeometryV1?.interior.depthMm,
   status:r.status,reported:pack.statuses.cabinetFit,
   approved:r.engineeringApproved};
 });
 assert.equal(cabinetSaved.source,'USER_DECLARED',JSON.stringify(cabinetSaved));
 assert.ok(cabinetSaved.zones>=1);
 assert.equal(cabinetSaved.persisted,2000);
 assert.equal(cabinetSaved.dimensions,300);
 assert.equal(cabinetSaved.status,'REVIEW_REQUIRED');
 assert.equal(cabinetSaved.reported,'REVIEW_REQUIRED');
 assert.equal(cabinetSaved.approved,false);
 assert.ok(await page.locator('#cabinetGeometryPanel .ep-cabinet-schematic svg').count());
 await page.locator('#undoBtn').click();
 assert.equal(await page.evaluate(()=>state.cabinetGeometryV1===undefined),true);
 await page.locator('#redoBtn').click();
 assert.equal(await page.evaluate(()=>state.cabinetGeometryV1?.interior.widthMm),2000);
 await page.locator('#cabinetGeometryPanel details:has(form[data-cabinet-obstacle]) > summary').click();
 const reserved=page.locator('#cabinetGeometryPanel form[data-cabinet-obstacle]');
 await reserved.locator('[name="id"]').fill('WD_CI');
 await reserved.locator('[name="kind"]').selectOption('WIRE_DUCT');
 for(const [name,value] of Object.entries({xMm:'50',yMm:'170',widthMm:'1900',heightMm:'20'}))
  await reserved.locator('[name="'+name+'"]').fill(value);
 await reserved.locator('button[type="submit"]').click();
 assert.equal(await page.evaluate(()=>state.cabinetGeometryV1.obstacles?.[0]?.id),'WD_CI');
 assert.equal(await page.locator('#cabinetGeometryPanel .ep-cabinet-obstacle').count(),1);
 const cabinetBefore=await page.evaluate(()=>JSON.stringify(state.cabinetGeometryV1));
 const firstZone=page.locator('#cabinetGeometryPanel [data-cabinet-zone="0"]');
 await page.locator('#cabinetGeometryPanel details:has(form[data-cabinet-zone="0"]) > summary').click();
 await firstZone.locator('[name="xMm"]').fill('60');
 await firstZone.locator('[name="yMm"]').fill('50');
 await firstZone.locator('button[type="submit"]').click();
 assert.equal(await page.evaluate(()=>state.cabinetGeometryV1?.zones[0].xMm),60);
 assert.equal(await page.evaluate(()=>state.cabinetGeometryV1?.planning),undefined);
 await page.locator('#undoBtn').click();
 assert.equal(await page.evaluate(()=>JSON.stringify(state.cabinetGeometryV1)),cabinetBefore);
 const cabinetCsvDownload=page.waitForEvent('download');
 await page.locator('#boardPlacementCsvBtn').click();
 const cabinetCsv=await cabinetCsvDownload;
 assert.match(cabinetCsv.suggestedFilename(),/din-placement\.csv$/);
 const cabinetCsvText=fs.readFileSync(await cabinetCsv.path(),'utf8');
 assert.match(cabinetCsvText,/cabinet_zone_x_mm/);
 assert.match(cabinetCsvText,/cabinet_usable_depth_mm/);
 assert.match(cabinetCsvText,/REVIEW_REQUIRED/);
 const cabinetSvgPromise=page.waitForEvent('download');
 await page.locator('#cabinetExportSvgBtn').click();
 const cabinetSvg=await cabinetSvgPromise;
 assert.match(cabinetSvg.suggestedFilename(),/-cabinet-plan-DRAFT\.svg$/);
 const svgText=fs.readFileSync(await cabinetSvg.path(),'utf8');
 assert.match(svgText,/data-factory-cad="false"/);
 assert.match(svgText,/НЕ ПРОИЗВОДСТВЕННЫЙ ЧЕРТЁЖ/);
 assert.match(svgText,/viewBox="0 0 2000 1500"/);
 assert.match(svgText,/data-obstacle="WD_CI"/);
 await page.locator('#cabinetGeometryPanel details:has(form[data-cabinet-obstacle]) > summary').click();
 await page.locator('#cabinetGeometryPanel [data-cabinet-obstacle-remove="WD_CI"]').click();
 assert.equal(await page.evaluate(()=>state.cabinetGeometryV1?.obstacles?.length),0);
 await page.locator('#undoBtn').click();
 assert.equal(await page.evaluate(()=>state.cabinetGeometryV1?.obstacles?.[0]?.id),'WD_CI');
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
 await page.locator('#faultRoutePanel > details > summary').click();
 const route=page.locator('[data-fault-route="L1"]');
 for(const [name,value] of Object.entries({u0V:'230',cmin:'0.95',sourceROhm:'0.1',sourceXOhm:'0.05',networkSource:'Test network study',iaA:'160',requiredTimeS:'0.4',tripSource:'Test curve reference',timeSource:'Test project scope'}))await route.locator('[name="'+name+'"]').fill(value);
 for(const [key,value] of Object.entries({lengthM:'25',phaseROhmKm:'8',peROhmKm:'8',phaseXOhmKm:'0.08',peXOhmKm:'0.08',source:'Test conductor datasheet at design temperature'}))await route.locator('[data-segment-field="'+key+'"]').fill(value);
 await route.locator('[data-segment-temperature]').check();
 await route.locator('button[type="submit"]').click();
 assert.equal(await page.evaluate(()=>epFaultRouteReviewV2(state,state.lines[0],catalogDevice).thresholdStatus),'PRELIMINARY_PASS');
 assert.equal(await page.evaluate(()=>state.lines[0].faultInput?.ikKa??null),null);
 // Real browser: explicitly declared trip-envelope points are optional,
 // persisted, and never interpreted as a normative approval.
 await page.locator('#faultRoutePanel > details > summary').click();
 await route.locator('[data-trip-envelope-panel] > summary').click();
 const chosen=await page.evaluate(()=>({sku:state.lines[0].catalogSku,
  inA:catalogDevice(state.lines[0].catalogSku)?.inA}));
 assert.ok(chosen.sku&&chosen.inA);
 await route.locator('[name="tripArticleSku"]').fill(chosen.sku);
 await route.locator('[name="tripArticleRatingA"]').fill(String(chosen.inA));
 await route.locator('[name="tripSourceEvidence"]').fill('Test declared upper trip-time limit');
 await route.locator('[data-trip-point-field="currentA"]').fill('160');
 await route.locator('[data-trip-point-field="maxTimeS"]').fill('0.4');
 await route.locator('[name="tripGuaranteeBasis"]').check();
 await route.locator('[name="tripEnvelopeEnabled"]').check();
 await route.locator('button[type="submit"]').click();
 const tripState=await page.evaluate(()=>{
  const l=state.lines.find(x=>x.id==='L1');
  const r=epFaultRouteReviewV2(state,l,catalogDevice);
  const saved=JSON.parse(localStorage.getItem('electropanel_web_preview')).lines.find(x=>x.id==='L1');
  return {points:saved.faultRouteInput?.tripEnvelope?.points?.length,
   source:saved.faultRouteInput?.tripEnvelope?.source,
   numeric:r.tripEnvelope?.numericalStatus,approved:r.engineeringApproved};
 });
 assert.equal(tripState.points,1);
 assert.equal(tripState.source,'Test declared upper trip-time limit');
 assert.equal(tripState.numeric,'PRELIMINARY_WITHIN_ENVELOPE');
 assert.equal(tripState.approved,false);
 // Real browser: the engineer declares ADS applicability explicitly, and
 // a too-long requested clearing time remains a correctable BLOCKED review.
 await page.locator('#faultRoutePanel > details > summary').click();
 await route.locator('[data-disconnection-context-panel] > summary').click();
 await route.locator('[name="adsCircuitClass"]').selectOption('FINAL_CIRCUIT');
 for(const [name,value] of Object.entries({
  adsMaxAllowedTimeS:'0.2',adsU0V:'230',
  adsStandardReference:'Engineer selected standard edition and clause',
  adsTimeBasisSource:'Declared time from applicable context',
  adsCircuitClassSource:'Documented final circuit classification'
 }))await route.locator('[name="'+name+'"]').fill(value);
 await route.locator('[name="adsApplicabilityReviewed"]').check();
 await route.locator('[name="adsContextEnabled"]').check();
 await route.locator('button[type="submit"]').click();
 const ads=await page.evaluate(()=>{
  const line=state.lines.find(l=>l.id==='L1');
  const report=epFaultRouteReviewV2(state,line,catalogDevice);
  const stored=JSON.parse(localStorage.getItem('electropanel_web_preview')).lines.find(l=>l.id==='L1');
  return {limit:stored.faultRouteInput?.disconnectionContext?.maxAllowedTimeS,
   failure:report.disconnectionContext?.numericalStatus,route:report.status,
   approved:report.engineeringApproved};
 });
 assert.equal(ads.limit,'0.2');
 assert.equal(ads.failure,'FAIL');
 assert.equal(ads.route,'BLOCKED');
 assert.equal(ads.approved,false);
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
 await page.locator('#faultRoutePanel > details > summary').click();
 await page.locator('#faultRoutePanel').screenshot({path:'browser-fault-route.png'});
 await page.screenshot({path:'browser-integration.png',fullPage:true});
 // Browser: real opt-in consumer group split from a design with NO apparatus
 // or electrical links. No name-driven regrouping and no implicit cable data.
 const originalGroupedState=await page.evaluate(()=>{
  state=initial();
  state.schema=PROJECT_SCHEMA;
  state.earthing='TN-S';
  state.railCapacity=12;state.railCount=2;
  state.lines=[{id:'L1',name:'Office sockets',phase:'L1',
   power:8,modules:1,device:'',source:'manual',sourceRef:''}];
  state.loads=[
   {id:'LD1',name:'Desk 1',circuitId:'L1',powerKw:3,source:'manual',sourceRef:''},
   {id:'LD2',name:'Desk 2',circuitId:'L1',powerKw:3,source:'manual',sourceRef:''},
   {id:'LD3',name:'Desk 3',circuitId:'L1',powerKw:2,source:'manual',sourceRef:''}];
  state.sharedDevices=[];state.branchDevices=[];state.branchModelVersion=1;
  syncBranchDevices(state);lastDesignSnapshot=null;changed();
  return JSON.stringify({lines:state.lines,loads:state.loads});
 });
 await page.evaluate(()=>switchView('loads'));
 assert.equal(await page.locator('.ep-group-split summary').count(),1);
 await page.locator('.ep-group-split summary').click();
 await page.locator('#groupSplitMaxKw').fill('5');
 await page.locator('#groupSplitPreviewBtn').click();
 const previewSplits=await page.evaluate(()=>({
  rows:state.lines.length,loads:state.loads.length,
  plan:workflowSplitPlan?.proposals?.length,
  groups:workflowSplitPlan?.proposals?.[0]?.groups.length}));
 assert.deepEqual(previewSplits,{rows:1,loads:3,plan:1,groups:2});
 await page.locator('#groupSplitApplyBtn').click();
 const grouped=await page.evaluate(()=>{
  const saved=normalizeImport(JSON.parse(localStorage.getItem('electropanel_web_preview')));
  return {circuits:state.lines.length,
   consumers:state.loads.length,
   groups:state.lines.map(x=>x.power),
   ids:new Set(state.loads.map(x=>x.id)).size,
   savedCircuits:saved.lines.length,
   savedRule:saved.consumerGroupSplitRulesV1?.maxGroupPowerKw,
   selected:state.lines.some(x=>x.catalogSku),
   branches:state.branchDevices.length};
 });
 assert.equal(grouped.circuits,2);
 assert.equal(grouped.consumers,3);
 assert.deepEqual(grouped.groups,[5,3]);
 assert.equal(grouped.ids,3);
 assert.equal(grouped.savedCircuits,2);
 assert.equal(grouped.savedRule,5);
 assert.equal(grouped.selected,false);
 assert.equal(grouped.branches,2);
 await page.locator('#undoBtn').click();
 assert.equal(await page.evaluate(()=>state.lines.length),1);
 await page.locator('#redoBtn').click();
 assert.equal(await page.evaluate(()=>state.lines.length),2);

 // Separate real-browser acceptance for explicit category-based merging.
 // The original group split scenario above must not be reused as a shortcut.
 await page.evaluate(()=>{
  state=initial();state.schema=PROJECT_SCHEMA;state.earthing='TN-S';
  state.railCount=2;state.railCapacity=12;
  state.lines=[
   {id:'L1',name:'Desk power A',phase:'L1',power:2,modules:1,
    device:'',source:'manual',sourceRef:''},
   {id:'L2',name:'Desk power B',phase:'L1',power:3,modules:1,
    device:'',source:'manual',sourceRef:''}
  ];
  state.loads=[
   {id:'LD1',name:'Desk 1',circuitId:'L1',powerKw:2,source:'manual',sourceRef:''},
   {id:'LD2',name:'Desk 2',circuitId:'L2',powerKw:3,source:'manual',sourceRef:''}
  ];
  state.sharedDevices=[];state.branchDevices=[];state.branchModelVersion=1;
  syncBranchDevices(state);lastDesignSnapshot=null;changed();
 });
 await page.evaluate(()=>switchView('loads'));
 assert.equal(await page.locator('.ep-group-merge summary').count(),1);
 await page.locator('.ep-group-merge summary').click();
 await page.locator('#groupMergeMaxKw').fill('6');
 await page.locator('#groupMergeCategories').fill('L1;Розетки\nL2;Розетки');
 await page.locator('#groupMergeSeparateIds').fill('L2');
 await page.locator('#groupMergePreviewBtn').click();
 assert.equal(await page.evaluate(()=>workflowMergePlan?.proposals.length),0,
  'Dedicated line exclusion must prevent the merge even for matching categories');
 await page.locator('#groupMergeSeparateIds').fill('');
 await page.locator('#groupMergePreviewBtn').click();
 const mergePreview=await page.evaluate(()=>({
  oldLines:state.lines.length,loads:state.loads.length,
  candidates:workflowMergePlan?.proposals?.length,
  target:workflowMergePlan?.proposals?.[0]?.targetCircuitId,
  status:workflowMergePlan?.status}));
 assert.deepEqual(mergePreview,{oldLines:2,loads:2,candidates:1,target:'L1',status:'DRAFT'});
 await page.locator('#groupMergeApplyBtn').click();
 const merged=await page.evaluate(()=>{
  const imported=normalizeImport(JSON.parse(localStorage.getItem('electropanel_web_preview')));
  return {circuits:state.lines.length,loads:state.loads.length,
   groupPower:state.lines[0].power,allAssigned:state.loads.every(x=>x.circuitId==='L1'),
   persisted:imported.consumerGroupMergeRulesV1?.categories?.length,
   branches:state.branchDevices.length,approved:false};
 });
 assert.deepEqual(merged,{circuits:1,loads:2,groupPower:5,allAssigned:true,
  persisted:1,branches:1,approved:false});
 await page.locator('#undoBtn').click();
 assert.equal(await page.evaluate(()=>state.lines.length),2);
 await page.locator('#redoBtn').click();
 assert.equal(await page.evaluate(()=>state.lines.length),1);

 // End-to-end market-pattern cabinet sizing: five one-module appliances
 // should offer six positions; choosing must preserve engineering lines,
 // persist manual positions and allow undo/redo with the four-module floor.
 await page.evaluate(()=>{
  state=initial();state.schema=PROJECT_SCHEMA;state.earthing='TN-S';
  state.lines=Array.from({length:5},(_,i)=>({
   id:'L'+(i+1),name:'Circuit '+(i+1),power:1,phase:'L1',
   device:'B10',modules:1,source:'manual',sourceRef:''
  }));
  state.sharedDevices=[];state.branchDevices=[];state.branchModelVersion=1;
  state.railCount=2;state.railCapacity=12;syncBranchDevices(state);
  lastDesignSnapshot=null;changed();switchView('board');
 });
 const capacityChoice=page.locator('[data-apply-cabinet-option="1x6"]');
 assert.equal(await capacityChoice.count(),1,'small cabinet form factor should be offered');
 assert.equal(await page.locator('#exportCabinetCapacityCsvBtn').count(),1);
 const capacityCsvEvidence=await page.evaluate(()=>{
  const p=epCabinetCapacityCsvV1(cabinetCapacityReportV1(),{});
  return {status:p.status,hasHeading:p.csv.includes('terminal_height_reserve_mm'),
   notCertified:p.csv.includes('PRELIMINARY_NOT_MANUFACTURER_FIT')};
 });
 assert.deepEqual(capacityCsvEvidence,{status:'REVIEW_REQUIRED',hasHeading:true,notCertified:true});
 assert.equal(await page.locator('#cabinetSpaceDiagram svg').count(),1,
  'Preliminary interior-space diagram must be visible');
 assert.match(await page.locator('#cabinetSpaceDiagram').innerText(),/Зелёный|клемм/);
 await page.locator('#cabinetTerminalReserve').fill('60');
 await page.locator('#cabinetTerminalReserve').blur();
 const sizingModel=await page.evaluate(()=>{
  const r=cabinetCapacityReportV1(),o=r.options.find(x=>x.id==='1x6');
  const saved=normalizeImport(JSON.parse(snapshot()));
  return {terminal:o.envelope.spacePlan.terminalReserveMm,
   stored:saved.cabinetSizingPreferencesV1.terminalReserveMm,
   height:o.envelope.preliminaryUsableHeightMm};
 });
 assert.deepEqual(sizingModel,{terminal:60,stored:60,height:410});

 assert.match(await page.locator('#cabinetConnectionAdvisory').innerText(),/Условная близость/);
 const advisory=await page.evaluate(()=>{
  const report=epEngineeringBundleV1(state,catalogDevice);
  return {status:report.sections.cabinetConnectionProximity.status,
   physical:report.sections.cabinetConnectionProximity.physicalWiringVerified,
   pairs:report.sections.cabinetConnectionProximity.pairs.length,
   printed:epEngineeringPrintV1(report).includes('Группировка по заявленным электрическим связям')};
 });
 assert.deepEqual(advisory,{status:'REVIEW_REQUIRED',physical:false,pairs:0,printed:true});
 assert.equal(await page.locator('#cabinetGroupReflowBtn').count(),1);
 const beforeNoLinks=await page.evaluate(()=>JSON.stringify(state.lines));
 await page.locator('#cabinetGroupReflowBtn').click();
 assert.equal(await page.evaluate(()=>JSON.stringify(state.lines)),beforeNoLinks);

 const beforeCabinet=await page.evaluate(()=>JSON.stringify(state.lines));
 await capacityChoice.click();
 const appliedCabinet=await page.evaluate(()=>{
  const imported=normalizeImport(JSON.parse(snapshot()));
  return {rails:state.railCount,modules:state.railCapacity,
   savedRails:imported.railCount,savedModules:imported.railCapacity,
   positions:imported.manualLayoutV1?.length,lines:JSON.stringify(state.lines)};
 });
 assert.equal(appliedCabinet.rails,1);
 assert.equal(appliedCabinet.modules,6);
 assert.equal(appliedCabinet.savedRails,1);
 assert.equal(appliedCabinet.savedModules,6);
 assert.equal(appliedCabinet.positions,5);
 assert.equal(appliedCabinet.lines,beforeCabinet);
 await page.locator('#undoBtn').click();
 assert.equal(await page.evaluate(()=>state.railCapacity),12);
 await page.locator('#redoBtn').click();
 assert.equal(await page.evaluate(()=>state.railCapacity),6);
 assert.equal(await page.locator('#exportCabinetCapacityBtn').count(),1);
 await page.locator('#cabinetWidthLimit').fill('200');
 await page.locator('#cabinetWidthLimit').blur();
 assert.equal(await page.locator('[data-apply-cabinet-option="1x6"]').count(),0);
 const constrained=await page.evaluate(()=>{
  const saved=normalizeImport(JSON.parse(snapshot()));
  return {limit:saved.cabinetSizingPreferencesV1?.maxUsableWidthMm,
   appliances:state.lines.length};
 });
 assert.deepEqual(constrained,{limit:200,appliances:5});
 await page.locator('#cabinetWidthLimit').fill('');
 await page.locator('#cabinetWidthLimit').blur();
 assert.equal(await page.locator('[data-apply-cabinet-option="1x6"]').count(),1);
 await page.locator('#cabinetReservePercent').fill('50');
 await page.locator('#cabinetReservePercent').blur();
 assert.equal(await page.locator('[data-apply-cabinet-option="1x6"]').count(),0);
 assert.equal(await page.locator('[data-apply-cabinet-option="1x8"]').count(),1);
 const persistedReserve=await page.evaluate(()=>normalizeImport(JSON.parse(snapshot())).cabinetSizingPreferencesV1.reservePercent);
 assert.equal(persistedReserve,50);
 await page.locator('#cabinetReservePercent').fill('20');
 await page.locator('#cabinetReservePercent').blur();
 assert.equal(await page.locator('[data-apply-cabinet-option="1x6"]').count(),1);
 const sizingEvidence=await page.evaluate(()=>{
  const b=epEngineeringBundleV1(state,catalogDevice);
  const html=epEngineeringPrintV1(b);
  return {status:b.sections.cabinetCapacity?.status,
   selected:b.sections.cabinetCapacity?.selectedLayout.modulesPerRail,
   print:html.includes('Варианты вместимости и предварительной компоновки корпуса')};
 });
 assert.equal(sizingEvidence.status,'REVIEW_REQUIRED');
 assert.equal(sizingEvidence.selected,6);
 assert.equal(sizingEvidence.print,true);

 // Existing declared cabinet geometry is never silently kept across different
 // DIN shape. Cancellation leaves state untouched; acceptance is undoable.
 await page.evaluate(()=>{
  state.cabinetGeometryV1={
   version:1,source:'USER_DECLARED',
   interior:{widthMm:360,heightMm:320,depthMm:180},
   zones:[{railIndex:0,xMm:50,yMm:50,widthMm:260,heightMm:100}],
   planning:{marginMm:50,firstRowYMm:50,zoneHeightMm:100,rowGapMm:20}
  };
  changed();
 });
 await page.evaluate(()=>window.confirm=()=>false);
 await page.locator('#cabinetCapacityTotal').selectOption('8');
 const alternative=page.locator('[data-apply-cabinet-option="1x8"]');
 assert.equal(await alternative.count(),1);
 await alternative.click();
 assert.equal(await page.evaluate(()=>state.railCapacity),6);
 assert.equal(await page.evaluate(()=>!!state.cabinetGeometryV1),true);
 await page.evaluate(()=>window.confirm=()=>true);
 await alternative.click();
 assert.equal(await page.evaluate(()=>state.railCapacity),8);
 assert.equal(await page.evaluate(()=>!!state.cabinetGeometryV1),false);
 await page.locator('#undoBtn').click();
 assert.equal(await page.evaluate(()=>state.railCapacity),6);
 assert.equal(await page.evaluate(()=>!!state.cabinetGeometryV1),true);
 // Same nominal 36-place enclosure capacity has both tall and wide
 // module distributions; options must be discoverable by capacity, not
 // arbitrarily cut off by the first twelve globally sorted shapes.
 await page.evaluate(()=>{
  state=initial();state.schema=PROJECT_SCHEMA;state.earthing='TN-S';
  state.railCount=4;state.railCapacity=12;
  state.lines=Array.from({length:8},(_,i)=>({
   id:'L'+(i+1),name:'Load '+i,power:1,phase:'L1',
   device:'C16',modules:4,source:'manual',sourceRef:''
  }));
  state.sharedDevices=[];state.branchDevices=[];state.branchModelVersion=1;
  state.cabinetSizingPreferencesV1={reservePercent:10,maxUsableWidthMm:null,maxUsableHeightMm:null};
  syncBranchDevices(state);lastDesignSnapshot=null;changed();switchView('board');
 });
 assert.equal(await page.locator('#cabinetCapacityTotal').inputValue(),'36');
 assert.equal(await page.locator('[data-apply-cabinet-option="2x18"]').count(),1);
 assert.equal(await page.locator('[data-apply-cabinet-option="3x12"]').count(),1);
 await page.locator('#cabinetCapacityTotal').selectOption('48');
 assert.equal(await page.locator('#cabinetCapacityTotal').inputValue(),'48');
 assert.equal(await page.locator('[data-apply-cabinet-option="2x18"]').count(),0);
 assert.ok((await page.locator('#cabinetCapacityOptions button').count())>=1);
 // A re-render must not attach duplicate reserve-change listeners.
 await page.evaluate(()=>{renderBoard();renderBoard();renderBoard();});
 const undoBefore=await page.evaluate(()=>historyUndo.length);
 await page.locator('#cabinetReservePercent').fill('15');
 await page.locator('#cabinetReservePercent').blur();
 const undoAfter=await page.evaluate(()=>({
  count:historyUndo.length,maxCount:MAX_HISTORY,lastReserve:JSON.parse(historyUndo.at(-1)).cabinetSizingPreferencesV1.reservePercent,
  currentReserve:state.cabinetSizingPreferencesV1.reservePercent
 }));
 assert.equal(undoAfter.count,Math.min(undoAfter.maxCount,undoBefore+1),
  'reserve edit must create one checkpoint without duplicate subscriptions');
 assert.equal(undoAfter.lastReserve,10,'undo must restore reserve immediately before editing');
 assert.equal(undoAfter.currentReserve,15);

 // Explicitly improve declared connections on the same DIN without
 // modifying the protective topology or catalogue assignments.
 await page.evaluate(()=>{
  state=initial();state.schema=PROJECT_SCHEMA;state.earthing='TN-S';
  state.railCount=1;state.railCapacity=8;
  state.lines=Array.from({length:4},(_,i)=>({
   id:'L'+(i+1),name:'Line '+(i+1),phase:'L1',power:1,modules:1,
   device:'B10',source:'manual',sourceRef:''
  }));
  state.sharedDevices=[];state.branchDevices=[];state.branchModelVersion=1;
  syncBranchDevices(state);
  state.protectionLinks=[{upstreamLineId:'L1',downstreamLineId:'L4'}];
  state.protectionLinksVersion=1;
  delete state.cabinetGeometryV1;
  lastDesignSnapshot=null;changed();switchView('board');
 });
 const beforeGroupReflow=await page.evaluate(()=>{
  const b=epDraftBoardPlanV1(state,catalogDevice);
  return {summary:epCabinetConnectionProximityV1(state,b.placements).summary,
   lines:JSON.stringify(state.lines),topology:JSON.stringify(state.protectionLinks),
   positions:JSON.stringify(normalizeImport(JSON.parse(snapshot())).manualLayoutV1||[])};
 });
 await page.locator('#cabinetGroupReflowBtn').click();
 const afterGroupReflow=await page.evaluate(()=>{
  const b=epDraftBoardPlanV1(state,catalogDevice);
  return {summary:epCabinetConnectionProximityV1(state,b.placements).summary,
   lines:JSON.stringify(state.lines),topology:JSON.stringify(state.protectionLinks),
   positions:state.manualLayoutV1?.length};
 });
 assert.ok(afterGroupReflow.summary.nominalDistanceModules<
  beforeGroupReflow.summary.nominalDistanceModules);
 assert.equal(afterGroupReflow.lines,beforeGroupReflow.lines);
 assert.equal(afterGroupReflow.topology,beforeGroupReflow.topology);
 assert.equal(afterGroupReflow.positions,4);
 await page.locator('#undoBtn').click();
 assert.equal(await page.evaluate(()=>JSON.stringify(state.manualLayoutV1||[])),beforeGroupReflow.positions);
 await page.locator('#redoBtn').click();
 assert.equal(await page.evaluate(()=>state.manualLayoutV1.length),4);

 // Terminal and duct rectangles must be user declared, never inferred by the
 // planner. Check bundle, print, export and board on a real browser project.
 await page.evaluate(()=>{
  state=initial();state.schema=PROJECT_SCHEMA;state.earthing='TN-S';
  state.lines=[{id:'L1',name:'Socket circuit',power:1,phase:'L1',modules:2,
   device:'B16',source:'manual',sourceRef:''}];
  state.railCount=1;state.railCapacity=6;
  state.sharedDevices=[];state.branchDevices=[];state.branchModelVersion=1;
  syncBranchDevices(state);delete state.protectionLinks;
  delete state.protectionLinksVersion;
  state.cabinetGeometryV1={
   version:1,source:'USER_DECLARED',
   interior:{widthMm:260,heightMm:280,depthMm:140},
   zones:[{railIndex:0,xMm:50,yMm:85,widthMm:120,heightMm:100}],
   obstacles:[
    {id:'ductB',kind:'WIRE_DUCT',xMm:50,yMm:195,widthMm:120,heightMm:30},
    {id:'terminalA',kind:'TERMINAL_REGION',xMm:185,yMm:85,widthMm:50,heightMm:90}
   ]};
  lastDesignSnapshot=null;changed();switchView('board');
 });
 const connectionSpaceEvidence=await page.evaluate(()=>{
  const report=epCabinetConnectionSpaceV1(state,catalogDevice);
  const bundle=epEngineeringBundleV1(state,catalogDevice);
  const csv=epBoardPlacementCsvV1(state,catalogDevice);
  return {status:report.status,count:report.rows.length,
   duct:report.rows[0]?.nearestWireDuct?.regionId,
   ductGap:report.rows[0]?.nearestWireDuct?.verticalGapMm,
   terminal:report.rows[0]?.nearestTerminalRegion?.regionId,
   sameInBundle:bundle.sections.cabinetConnectionSpace.rows[0]?.nearestWireDuct?.regionId,
   inPrint:epEngineeringPrintV1(bundle).includes('Зоны подключения и кабельные каналы'),
   inCsv:csv.csv.includes('nearest_declared_terminal_region')&&
    csv.csv.includes('terminalA')&&csv.csv.includes('ductB'),
   verified:report.terminalConnectionsVerified};
 });
 assert.deepEqual(connectionSpaceEvidence,{status:'REVIEW_REQUIRED',count:1,
  duct:'ductB',ductGap:10,terminal:'terminalA',sameInBundle:'ductB',
  inPrint:true,inCsv:true,verified:false});
 assert.match(await page.locator('#cabinetAccessReview').innerText(),/объявленной зоной клемм/);
 const accessDetail=page.locator('#cabinetAccessReview details');
 assert.equal(await accessDetail.count(),1);
 await accessDetail.locator('summary').click();
 assert.match(await accessDetail.innerText(),/terminalA/);
 assert.match(await accessDetail.innerText(),/ductB/);
 assert.match(await accessDetail.innerText(),/Не проверен/);

 const serialGeometry=await page.evaluate(()=>{
  const copy=normalizeImport(JSON.parse(snapshot()));
  return copy.cabinetGeometryV1.obstacles.map(x=>x.id);
 });
 assert.deepEqual(serialGeometry,['ductB','terminalA']);

 // If declared terminal-region distances worsen, application must offer
 // cancellation; accepted changes still remain a single undoable placement.
 await page.evaluate(()=>{
  state=initial();state.schema=PROJECT_SCHEMA;state.earthing='TN-S';
  state.railCount=1;state.railCapacity=8;
  state.lines=Array.from({length:4},(_,i)=>({
   id:'L'+(i+1),name:'Circuit '+i,phase:'L1',power:1,
   modules:1,device:'B10',source:'manual',sourceRef:''
  }));
  state.sharedDevices=[];state.branchDevices=[];state.branchModelVersion=1;
  syncBranchDevices(state);
  state.protectionLinks=[{upstreamLineId:'L1',downstreamLineId:'L4'}];
  state.protectionLinksVersion=1;
  state.cabinetGeometryV1={
   version:1,source:'USER_DECLARED',
   interior:{widthMm:280,heightMm:280,depthMm:160},
   zones:[{railIndex:0,xMm:40,yMm:85,widthMm:160,heightMm:100}],
   obstacles:[
    {id:'duct',kind:'WIRE_DUCT',xMm:40,yMm:195,widthMm:160,heightMm:30},
    {id:'terminal',kind:'TERMINAL_REGION',xMm:215,yMm:85,widthMm:40,heightMm:90}
   ]};
  lastDesignSnapshot=null;changed();switchView('board');
 });
 const baseline=await page.evaluate(()=>JSON.stringify(normalizeImport(JSON.parse(snapshot())).manualLayoutV1||[]));
 const proposalEvidence=await page.evaluate(()=>{
  const p=epCabinetGroupReflowV1(state,catalogDevice);
  return {status:p.status,changes:p.changes?.length,
   increasing:p.connectionSpaceDelta?.increases?.length,
   hasPhysicalApproval:p.connectionSpaceDelta?.actualConnectionsVerified};
 });
 assert.equal(proposalEvidence.status,'REVIEW_REQUIRED');
 assert.ok(proposalEvidence.changes>0);
 assert.ok(proposalEvidence.increasing>0);
 assert.equal(proposalEvidence.hasPhysicalApproval,false);
 await page.evaluate(()=>window.confirm=()=>false);
 await page.locator('#cabinetGroupReflowBtn').click();
 assert.equal(await page.evaluate(()=>JSON.stringify(normalizeImport(JSON.parse(snapshot())).manualLayoutV1||[])),baseline);
 await page.evaluate(()=>window.confirm=()=>true);
 await page.locator('#cabinetGroupReflowBtn').click();
 assert.ok((await page.evaluate(()=>state.manualLayoutV1?.length))===4);
 await page.locator('#undoBtn').click();
 assert.equal(await page.evaluate(()=>JSON.stringify(state.manualLayoutV1||[])),baseline);

 // Selected product article and incomplete catalogue geometry propagate into
 // board review, engineering evidence, print and CSV without invented measures.
 await page.evaluate(()=>{
  state=initial();state.schema=PROJECT_SCHEMA;state.earthing='TN-S';
  state.railCount=1;state.railCapacity=6;
  state.lines=[
   {id:'L1',name:'Schneider',power:1,phase:'L1',modules:1,device:'B10',
    catalogSku:'SE-A9F73110',source:'manual',sourceRef:''},
   {id:'L2',name:'ABB',power:1,phase:'L1',modules:1,device:'B16',
    catalogSku:'ABB-2CDS251001R0164',source:'manual',sourceRef:''}
  ];
  state.sharedDevices=[];state.branchDevices=[];state.branchModelVersion=1;
  syncBranchDevices(state);
  // Sync may bind catalogue selections to the branch inventory.
  const first=state.branchDevices.find(x=>x.circuitId==='L1');
  const second=state.branchDevices.find(x=>x.circuitId==='L2');
  first.catalogSku='SE-A9F73110';second.catalogSku='ABB-2CDS251001R0164';
  delete state.cabinetGeometryV1;
  lastDesignSnapshot=null;changed();switchView('board');
 });
 const articleEvidence=await page.evaluate(()=>{
  const r=epCabinetApparatusEvidenceV1(state,catalogDevice);
  const report=epEngineeringBundleV1(state,catalogDevice);
  const csv=epBoardPlacementCsvV1(state,catalogDevice);
  return {status:r.status,count:r.rows.length,width:r.knownDimensions.width,
   height:r.knownDimensions.height,depth:r.knownDimensions.depth,
   article:r.rows[0]?.articleId,secondHeight:r.rows[1]?.bodyHeightMm,
   knownHeightSource:r.rows[0]?.sourceType,verified:r.actualTerminalCoordinatesVerified,
   inBundle:report.sections.cabinetApparatusEvidence.rows.length,
   inPrint:epEngineeringPrintV1(report).includes('Габариты выбранных аппаратов и источники'),
   inCsv:csv.csv.includes('body_dimension_source_type')&&
    csv.csv.includes('MANUFACTURER_DATASHEET_MIRROR')};
 });
 assert.equal(articleEvidence.status,'REVIEW_REQUIRED');
 assert.equal(articleEvidence.count,2);
 assert.equal(articleEvidence.width,2);
 assert.equal(articleEvidence.height,1);
 assert.equal(articleEvidence.depth,1);
 assert.equal(articleEvidence.article,'SE-A9F73110');
 assert.equal(articleEvidence.secondHeight,null);
 assert.equal(articleEvidence.knownHeightSource,'MANUFACTURER_DATASHEET_MIRROR');
 assert.equal(articleEvidence.verified,false);
 assert.equal(articleEvidence.inBundle,2);
 assert.equal(articleEvidence.inPrint,true);
 assert.equal(articleEvidence.inCsv,true);
 const missingGeometryEvidence=await page.evaluate(()=>{
  const result=epCabinetMissingGeometryCsvV1(state,catalogDevice);
  return {status:result.status,count:result.rows,
   missing:result.csv.includes('BODY_HEIGHT|BODY_DEPTH'),
   mounting:result.csv.includes('DIN_MOUNT_OFFSET|TERMINAL_POSITIONS'),
   approved:result.engineeringApproved};
 });
 assert.deepEqual(missingGeometryEvidence,{
  status:'REVIEW_REQUIRED',count:2,missing:true,mounting:true,approved:false});
 assert.equal(await page.locator('#exportCabinetMissingDimensionsBtn').count(),1);
 const evidenceDetails=page.locator('#cabinetArticleEvidence details');
 assert.equal(await evidenceDetails.count(),1);
 await evidenceDetails.locator('summary').click();
 assert.match(await evidenceDetails.innerText(),/SE-A9F73110/);
 assert.match(await evidenceDetails.innerText(),/Неизвестна/);


 // Independent current-layout enclosure comparison (no proposed DIN movement).
 await page.evaluate(()=>{
  state=initial();state.schema=PROJECT_SCHEMA;state.earthing='TN-S';
  state.railCount=1;state.railCapacity=6;
  state.lines=[{id:'CAB1',name:'Selected apparatus',power:1,phase:'L1',
   modules:1,device:'B10',catalogSku:'SE-A9F73110',source:'manual',sourceRef:''}];
  state.sharedDevices=[];state.branchDevices=[];state.branchModelVersion=1;
  syncBranchDevices(state);
  state.branchDevices[0].catalogSku='SE-A9F73110';
  lastDesignSnapshot=null;changed();switchView('board');
 });
 const currentBoardSnapshot=await page.evaluate(()=>JSON.stringify(state));
 const candidateText='LARGE; Demo; L-01; 400; 500; 200; 1\nSMALL; Demo; S-01; 90; 120; 50; 1';
 await page.locator('#cabinetEnclosureCandidatesInput').fill(candidateText);
 await page.locator('#cabinetCompareCurrentBtn').click();
 const currentText=await page.locator('#cabinetCurrentEnclosurePanel').innerText();
 assert.match(currentText,/Сравнение корпусов с текущим щитом/);
 assert.match(currentText,/LARGE — предварительно подходит/);
 assert.match(currentText,/SMALL — не подходит/);
 assert.match(currentText,/не хватает/);
 assert.match(currentText,/Перемещения аппаратов не выполнялись/);
 assert.equal(await page.evaluate(()=>JSON.stringify(state)),currentBoardSnapshot,
  'Enclosure comparison must not mutate the current board');
 assert.equal(await page.locator('#cabinetCurrentEnclosurePanel button').count(),3);
 const currentCsvDownload=page.waitForEvent('download');
 await page.locator('#cabinetCurrentEnclosurePanel button').nth(0).click();
 assert.match((await currentCsvDownload).suggestedFilename(),/_current_enclosure_checks\.csv$/);
 const supplierCsvDownload=page.waitForEvent('download');
 await page.locator('#cabinetCurrentEnclosurePanel button').nth(1).click();
 assert.match((await supplierCsvDownload).suggestedFilename(),/_current_enclosure_supplier\.csv$/);
 const currentJsonDownload=page.waitForEvent('download');
 await page.locator('#cabinetCurrentEnclosurePanel button').nth(2).click();
 assert.match((await currentJsonDownload).suggestedFilename(),/_current_enclosure_review\.json$/);
 await page.locator('#cabinetEnclosureCandidatesInput').fill('NEW; Demo; N-01; 500; 600; 250; 1');
 await page.locator('#cabinetCurrentEnclosurePanel button').first().click();
 assert.equal(await page.locator('#cabinetCurrentEnclosurePanel button').count(),0,
  'Changing candidates invalidates the prior export');
 await page.locator('#cabinetCompareCurrentBtn').click();
 assert.match(await page.locator('#cabinetCurrentEnclosurePanel').innerText(),
  /NEW — предварительно подходит/);

 assert.deepEqual(errors,[]);console.log('PASS: real Chromium load → catalogue → calculation → DIN move → undo/redo → reload → JSON roundtrip → bundle');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());

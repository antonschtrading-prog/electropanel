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
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
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
 await page.reload();
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
 await page.screenshot({path:'browser-integration.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS: real Chromium load → catalogue → calculation → DIN move → undo/redo → reload → JSON roundtrip → bundle');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.close());

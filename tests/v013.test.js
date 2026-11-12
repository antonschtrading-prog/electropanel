'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const catalog=fs.readFileSync(path.join(__dirname,'../catalog.js'),'utf8');
const app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../styles.css'),'utf8');
function env(){
 const c=vm.createContext({console,Date,Number,String,Array,Set,Map,Math,JSON,Object,BigInt});
 vm.runInContext(catalog,c);
 vm.runInContext(app.slice(0,app.indexOf("$('loadRows').addEventListener")),c);
 vm.runInContext(app.slice(app.indexOf('function escapeXml(s){'),app.indexOf('function parseCSV(text){')),c);
 vm.runInContext('state=normalizeImport(demo())',c);
 return c;
}
const run=(c,s)=>vm.runInContext(s,c);
test('catalog ships three traceable manufacturer SKUs',()=>{const c=env();assert.deepEqual(JSON.parse(run(c,'JSON.stringify(Object.values(EP_CATALOG).map(x=>x.maker))')),['Schneider Electric','ABB','IEK']);});
test('catalog references concrete documents and physical width, no fake generated safety approval',()=>{const c=env();assert.equal(run(c,"Object.values(EP_CATALOG).every(d=>d.source.startsWith('https://')&&d.widthMm>0&&d.modules===1&&d.inA===16)"),true);});
test('a catalogue device can be attached only to a single phase circuit',()=>{const c=env();assert.throws(()=>run(c,"applyCatalogueSku(state,'L6','SE-A9F74116')"),/1P/);});
test('documented model populates the corresponding branch without changing other lines',()=>{const c=env();run(c,"applyCatalogueSku(state,'L1','ABB-2CDS251001R0164')");assert.equal(run(c,'state.lines[0].catalogSku'),'ABB-2CDS251001R0164');assert.equal(run(c,'state.branchDevices[0].label'),'S201-C16');assert.equal(run(c,'state.lines[1].catalogSku'),undefined);});
test('catalogue SKU survives JSON export/import roundtrip',()=>{const c=env();run(c,"applyCatalogueSku(state,'L1','IEK-MVA20-1-016-C');copy=normalizeImport(JSON.parse(JSON.stringify(state)))");assert.equal(run(c,'copy.lines[0].catalogSku'),'IEK-MVA20-1-016-C');});
test('every manufacturer has distinct facade class',()=>{const c=env();const a=JSON.parse(run(c,"JSON.stringify(Object.keys(EP_CATALOG).map(id=>{const d=EP_CATALOG[id];return deviceAppearance({catalogSku:id}).type}))"));assert.deepEqual(a,['schneider','abb','iek']);});
test('unknown catalogue SKU is refused without modifying the model',()=>{const c=env();const prior=run(c,'JSON.stringify(state)');assert.throws(()=>run(c,"applyCatalogueSku(state,'L1','FAKE-SKU')"),/артикул/);assert.equal(run(c,'JSON.stringify(state)'),prior);});
test('catalogue mismatch is detected after phase change and not silently rewritten',()=>{const c=env();run(c,"applyCatalogueSku(state,'L1','SE-A9F74116');state.lines[0].phase='3Ф'");assert.equal(run(c,"catalogAudit(state).issues[0].code"),'CATALOG_MISMATCH');});
test('catalogue mismatch is a readiness blocker',()=>{const c=env();run(c,"applyCatalogueSku(state,'L1','SE-A9F74116');state.lines[0].modules=2");assert.equal(run(c,"documentReadiness(state).blockers.some(x=>x.includes('ширина'))"),true);});
test('catalogue never certifies electrical engineering correctness',()=>{const c=env();run(c,"applyCatalogueSku(state,'L1','SE-A9F74116')");assert.equal(run(c,"catalogAudit(state).engineeringApproved"),false);});
test('page loads local catalogue before app and deploy workflows ship it',()=>{const a=html.indexOf('<script src="catalog.js">'),b=html.indexOf('<script src="app.js">');assert.ok(a>0&&a<b);const workflow=fs.readFileSync(path.join(__dirname,'../.github/workflows/publish.yml'),'utf8');assert.match(workflow,/cp index\.html styles\.css app\.js catalog\.js/);});
test('manufacturer previews are local styled content, not hotlinked product photos',()=>{assert.match(css,/\.ep-schneider/);assert.match(css,/\.ep-abb/);assert.match(css,/\.ep-iek/);assert.match(app,/ep-real-device/);assert.doesNotMatch(catalog,/data:image|\.jpg|\.png/);});
test('current UI version advertises 0.13',()=>assert.match(html,/WEB \/ 0\.13/));

'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function env(){const c=vm.createContext({console,Date,Number,String,Array,Set,Map,Math,JSON,Object,BigInt});
 vm.runInContext(app.slice(0,app.indexOf("$('loadRows').addEventListener")),c);
 vm.runInContext(app.slice(app.indexOf('function escapeXml(s){'),app.indexOf('function parseCSV(text){')),c);
 return c;}
const run=(c,s)=>vm.runInContext(s,c);
function setup(){const c=env();run(c,"state=normalizeImport(demo());addSharedRCDTo(state,'RCD_2P','QD1',['L1','L2']);");return c;}
test('v0.12 interface displays correct version',()=>assert.match(html,/WEB \/ 0\.12/));
test('missing shared RCD input is visible to audit',()=>{const c=setup();assert.equal(run(c,"groupInputAudit(state).issues.filter(x=>x.code==='GROUP_INPUT_MISSING').length"),2);});
test('declaring explicit shared RCD L/N input records two edges',()=>{const c=setup();assert.equal(run(c,"declareGroupInputs(state,'RCD1').length"),2);assert.equal(run(c,"groupInputAudit(state).issues.length"),0);assert.equal(run(c,"state.groupInputLinks[0].from"),'SOURCE:MAIN/L1');});
test('duplicate or fabricated upstream input is rejected on import',()=>{const c=setup();run(c,"declareGroupInputs(state,'RCD1');");c.broken=JSON.parse(run(c,"JSON.stringify(state)"));c.broken.groupInputLinks.push({...c.broken.groupInputLinks[0]});assert.throws(()=>run(c,'normalizeImport(broken)'),/Повтор|неверный ID/);});
test('changing group assignment creates stale extra phase audit',()=>{const c=setup();run(c,"declareGroupInputs(state,'RCD1');");run(c,"state.sharedDevices[0].templateId='RCD_4P';state.sharedDevices[0].modules=4;state.sharedDevices[0].circuitIds=['L3','L4'];");assert.equal(run(c,"groupInputAudit(state).issues.some(x=>x.code==='GROUP_INPUT_EXTRA')"),true);});
test('clearing group input leaves outgoing circuit feeds unchanged',()=>{const c=setup();run(c,"declareGroupInputs(state,'RCD1');state.feedLinks=[];clearGroupInputs(state,'RCD1');");assert.equal(run(c,"state.groupInputLinks.length"),0);assert.equal(run(c,"state.feedLinks.length"),0);});
test('legacy JSON projects open with empty optional group inputs',()=>{const c=env();run(c,"state=normalizeImport(demo());");assert.equal(run(c,"state.groupInputLinks.length"),0);assert.equal(run(c,"state.groupInputVersion"),1);});
test('CSV and SVG exports show shared input declarations',()=>{const c=setup();run(c,"declareGroupInputs(state,'RCD1');");assert.equal(run(c,"feedCsv(state).includes('RCD1 (ввод УЗО)')"),true);assert.equal(run(c,"feedSvg(state).includes('RCD1 / ВВОД УЗО')"),true);});
test('deleting shared RCD removes its input declarations',()=>{const c=setup();run(c,"declareGroupInputs(state,'RCD1');removeSharedDeviceFrom(state,'RCD1');");assert.equal(run(c,"state.groupInputLinks.length"),0);});
test('inputs do not claim electrical installation approval',()=>{const c=setup();run(c,"declareGroupInputs(state,'RCD1');");assert.equal(run(c,"groupInputAudit(state).engineeringApproved"),false);});

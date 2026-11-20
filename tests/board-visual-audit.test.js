'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {epDraftBoardPlanV1}=require('../draft-board-plan-v1');
const {epDeviceVisualEvidenceV1}=require('../device-visual-evidence-v1');
const source=fs.readFileSync(path.join(__dirname,'..','board-visual-audit-v1.js'),'utf8');
const c={epDraftBoardPlanV1,epDeviceVisualEvidenceV1};vm.createContext(c);vm.runInContext(source,c);
const audit=c.epBoardVisualAuditV1;
const p=()=>({railCount:1,railCapacity:8,lines:[{id:'L1',modules:1},{id:'L2',modules:2}],sharedDevices:[]});
const d=()=>({sku:'SKU',maker:'ABB',series:'S200',label:'C16',kind:'MCB',poles:1,modules:1});
test('two rows',()=>assert.equal(audit(p()).rows.length,2));
test('two placeholders',()=>assert.equal(audit(p()).placeholders,2));
test('no verified faces',()=>assert.equal(audit(p()).verifiedCatalogueFaces,0));
test('review without catalogue',()=>assert.equal(audit(p()).status,'REVIEW_REQUIRED'));
test('no engineering approval',()=>assert.equal(audit(p()).engineeringApproved,false));
test('no verified photography',()=>assert.equal(audit(p()).photographVerified,false));
test('missing catalog issue',()=>assert.ok(audit(p()).issues.some(x=>x.code==='VISUAL_CATALOG_NOT_LINKED')));
test('first device ID',()=>assert.equal(audit(p()).rows[0].deviceId,'L1'));
test('second device width',()=>assert.equal(audit(p()).rows[1].modules,2));
test('first device rail',()=>assert.equal(audit(p()).rows[0].railIndex,0));
test('first device module',()=>assert.equal(audit(p()).rows[0].startModule,0));
test('second device module',()=>assert.equal(audit(p()).rows[1].startModule,1));
test('null project blocked',()=>assert.equal(audit(null).status,'BLOCKED'));
test('invalid layout blocked',()=>{const x=p();x.railCount=0;assert.equal(audit(x).status,'BLOCKED')});
test('catalog linked',()=>{
 const x=p();x.lines[0].catalogSku='SKU';assert.equal(audit(x,()=>d()).verifiedCatalogueFaces,1);
});
test('catalog SKU not found',()=>{
 const x=p();x.lines[0].catalogSku='SKU';assert.ok(audit(x,()=>null).issues.some(i=>i.code==='VISUAL_SKU_NOT_FOUND'));
});
test('wrong catalogue width blocked',()=>{
 const x=p();x.lines[0].catalogSku='SKU';const z=audit(x,()=>({...d(),modules:2}));assert.equal(z.status,'BLOCKED');
});
test('wrong catalogue article blocked',()=>{
 const x=p();x.lines[0].catalogSku='SKU';const z=audit(x,()=>({...d(),sku:'OTHER'}));assert.equal(z.status,'BLOCKED');
});
test('source project unchanged',()=>{const x=p(),s=JSON.stringify(x);audit(x);assert.equal(JSON.stringify(x),s)});
test('deterministic',()=>assert.equal(JSON.stringify(audit(p()).rows),JSON.stringify(audit(p()).rows)));
test('UI displays catalogue coverage',()=>assert.match(fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8'),/audit\.verifiedCatalogueFaces/));
test('UI displays placeholders',()=>assert.match(fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8'),/audit\.placeholders/));
test('UI shows blocked width warning',()=>assert.match(fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8'),/Несоответствие модели и DIN-компоновки/));
test('index loads audit before app',()=>{const s=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');assert.ok(s.indexOf('board-visual-audit-v1.js')<s.indexOf('app.js'))});

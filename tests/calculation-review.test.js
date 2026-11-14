'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const catalog=fs.readFileSync(path.join(__dirname,'..','catalog.js'),'utf8');
const protection=fs.readFileSync(path.join(__dirname,'..','protection.js'),'utf8');
const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
function slice(from,to) {
 const a=app.indexOf(from),b=app.indexOf(to,a+from.length);
 assert.ok(a>=0&&b>a,'Cannot locate '+from);
 return app.slice(a,b);
}
const helpers=slice('const REVIEW_FIELDS=','function faultLineInfo(line){');
const update=slice('function updateBranchApparatus(project,circuitId,patch){','function circuitGraph(project=state){');
const context=catalog+'\n'+protection+'\nconst DEVICE_TEMPLATES={};\n'+
 'function ensureV2(p){if(!p.branchDevices)p.branchDevices=p.lines.map(l=>({circuitId:l.id,label:l.device,modules:l.modules,templateId:null}));return p;}\n'+
 'function catalogDevice(sku){return epCatalogSku(sku)}\n'+slice('function projectCatalogEntries(', 'function catalogDevice(')+helpers+update+
 '\n({markCalculationReview,clearCalculationReview,applyCatalogueSku,catalogAudit,updateBranchApparatus})';
const api=vm.runInNewContext(context);
const line=()=>({id:'L1',phase:'L1',device:'iC60N C16',modules:1,
 catalogSku:'SE-A9F74116',overloadInput:{ibA:'12',inA:'16',izA:'20',i2A:'23'},
 faultInput:{ikKa:'3',source:'Расчёт 01'}});
const project=()=>{const l=line();return {lines:[l],branchDevices:[{circuitId:l.id,label:l.device,modules:1,templateId:null}]};};
test('switching apparatus retains inputs and raises review flag',()=>{
 const p=project();
 const before=JSON.stringify(p.lines[0].overloadInput);
 api.applyCatalogueSku(p,'L1','ABB-2CDS251001R0164');
 assert.equal(JSON.stringify(p.lines[0].overloadInput),before);
 assert.equal(p.lines[0].faultInput.ikKa,'3');
 assert.equal(p.lines[0].calculationReview.required,true);
 assert.ok(Array.from(api.catalogAudit(p).issues,x=>x.code).includes('CALCULATION_REVIEW_REQUIRED'));
});
test('repeating same selection does not invalidate evidence',()=>{
 const p=project();
 api.applyCatalogueSku(p,'L1','SE-A9F74116');
 assert.equal(p.lines[0].calculationReview,undefined);
});
test('changing label or module count marks prior evidence as needing review',()=>{
 const p=project();
 api.updateBranchApparatus(p,'L1',{label:'Other',modules:2,templateId:null});
 assert.equal(p.lines[0].calculationReview.required,true);
 assert.equal(p.lines[0].overloadInput.inA,'16');
 assert.equal(p.lines[0].faultInput.ikKa,'3');
});
test('review can only be cleared explicitly, never by catalog audit',()=>{
 const p=project();
 api.applyCatalogueSku(p,'L1','ABB-2CDS251001R0164');
 api.catalogAudit(p);
 assert.equal(p.lines[0].calculationReview.required,true);
 api.clearCalculationReview(p.lines[0]);
 assert.equal(p.lines[0].calculationReview,undefined);
});
test('without declarations no phantom review is created',()=>{
 const p=project();delete p.lines[0].overloadInput;delete p.lines[0].faultInput;
 api.applyCatalogueSku(p,'L1','ABB-2CDS251001R0164');
 assert.equal(p.lines[0].calculationReview,undefined);
});

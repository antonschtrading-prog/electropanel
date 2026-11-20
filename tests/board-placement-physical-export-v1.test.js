'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {epDraftBoardPlanV1}=require('../draft-board-plan-v1.js');
const {epDinPhysicalEnvelopeV1}=require('../din-physical-envelope-v1.js');
const {epManufacturerFrontResolveV1}=require('../manufacturer-visual-library-v1.js');
const context={epDraftBoardPlanV1,epDinPhysicalEnvelopeV1,epManufacturerFrontResolveV1};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'..','board-placement-export-v1.js'),'utf8'),context);
const csv=context.epBoardPlacementCsvV1;
const project=()=>({railCount:1,railCapacity:4,lines:[{id:'L1',modules:1,catalogSku:'SKU'}]});
const device=()=>({sku:'SKU',maker:'ABB',series:'S200',kind:'MCB',poles:1,
 modules:1,widthMm:17.5,heightMm:85,depthMm:75});
test('placement export distinguishes nominal slot and actual dimensions',()=>{
 const res=csv(project(),()=>device()),lines=res.csv.trim().split('\r\n');
 assert.match(lines[0],/nominal_slot_width_mm/);
 assert.match(lines[0],/body_width_mm/);
 assert.match(lines[0],/nominal_remaining_mm/);
 assert.match(lines[1],/"18";"17.5";"85";"75";"0.5"/);
 assert.match(lines[1],/"DECLARED_WITHIN_SLOT"/);
 assert.match(lines[1],/"STYLIZED_ONLY"/);
 assert.equal(res.engineeringApproved,false);
});
test('missing body dimensions remain empty, not zero or nominal',()=>{
 const d=device();delete d.widthMm;delete d.heightMm;delete d.depthMm;
 const row=csv(project(),()=>d).csv.split('\r\n')[1];
 assert.match(row,/"18";"";"";"";"";"UNKNOWN"/);
});
test('body overflow is surfaced as blocked',()=>{
 const p=project(),before=JSON.stringify(p);
 const r=csv(p,()=>({...device(),widthMm:19}));
 assert.equal(r.status,'BLOCKED');
 assert.ok(r.issues.some(x=>x.code==='DIN_ENVELOPE_BODY_OVERFLOW'));
 assert.equal(JSON.stringify(p),before);
});
test('CSV status reports catalogue placeholders, not product photography',()=>{
 const r=csv(project(),()=>device());
 assert.match(r.csv,/visual_asset_status/);
 assert.match(r.csv,/STYLIZED_ONLY/);
});
test('legacy unbound runtime can export safely without pretending dimensions',()=>{
 const c={epDraftBoardPlanV1};vm.createContext(c);
 vm.runInContext(fs.readFileSync(path.join(__dirname,'..','board-placement-export-v1.js'),'utf8'),c);
 const r=c.epBoardPlacementCsvV1(project(),()=>device());
 assert.match(r.csv,/"NOT_CHECKED"/);
 assert.doesNotMatch(r.csv,/"17.5"/);
});

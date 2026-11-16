'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {epDinPhysicalEnvelopeV1:check}=require('../din-physical-envelope-v1');
const plan=()=>({rails:1,capacityPerRail:4,placements:[
 {deviceId:'A',railIndex:0,startModule:0,modules:1,article:'A1'},
 {deviceId:'B',railIndex:0,startModule:1,modules:2,article:'B1'}]});
const lookup=sku=>sku==='A1'?{modules:1,widthMm:17.5,heightMm:85,depthMm:75}:
 {modules:2,widthMm:35,heightMm:90,depthMm:72};
test('body width is not fabricated from a DIN module',()=>{
 const r=check(plan(),lookup);assert.equal(r.status,'UNKNOWN');
 assert.equal(r.rows[0].slotWidthMm,18);assert.equal(r.rows[0].bodyWidthMm,17.5);
 assert.equal(r.rows[0].nominalFreeWidthMm,.5);assert.equal(r.rows[1].startMm,18);
 assert.equal(r.checkedWidths,2);
});
test('oversize body blocks but does not mutate project',()=>{
 const p=plan(),before=JSON.stringify(p);
 const r=check(p,s=>s==='A1'?{modules:1,widthMm:18.4}:lookup(s));
 assert.equal(r.status,'BLOCKED');assert.ok(r.issues.some(x=>x.code==='DIN_ENVELOPE_BODY_OVERFLOW'));
 assert.equal(JSON.stringify(p),before);
});
test('article modules mismatch is blocked',()=>{
 const r=check(plan(),s=>s==='A1'?{modules:2,widthMm:17.5}:lookup(s));
 assert.ok(r.issues.some(x=>x.code==='DIN_ENVELOPE_MODULE_MISMATCH'));
});
test('unknown width, height and depth are explicit',()=>{
 const r=check(plan(),s=>s==='A1'?{modules:1}:lookup(s));
 assert.equal(r.missingWidths,1);assert.equal(r.rows[0].bodyWidthMm,null);
 assert.ok(r.issues.some(x=>x.code==='DIN_ENVELOPE_HEIGHT_UNKNOWN'));
 assert.ok(r.issues.some(x=>x.code==='DIN_ENVELOPE_DEPTH_UNKNOWN'));
});
test('invalid inputs, overflow and bodies overlapping are blocked',()=>{
 assert.equal(check(null).status,'BLOCKED');
 const p=plan();p.placements[1].startModule=3;
 assert.ok(check(p,lookup).issues.some(x=>x.code==='DIN_ENVELOPE_SLOT_OVERFLOW'));
 p.placements[1].startModule=0;
 assert.ok(check(p,lookup).issues.some(x=>x.code==='DIN_ENVELOPE_BODY_OVERLAP'));
});
test('missing catalogue record is blocked',()=>{
 const r=check(plan(),()=>null);assert.equal(r.status,'BLOCKED');
 assert.equal(r.checkedWidths,0);
});
test('even complete dimensions do not establish enclosure suitability',()=>{
 const r=check(plan(),lookup);
 assert.equal(r.engineeringApproved,false);assert.equal(r.ready_for_installation,false);
 assert.ok(r.issues.some(x=>x.code==='DIN_ENCLOSURE_CLEARANCES_NOT_CHECKED'));
});
test('model loads before the preview',()=>{
 const s=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 assert.ok(s.indexOf('din-physical-envelope-v1.js')<s.indexOf('draft-board-preview-v1.js'));
});

test('physical overlap marks the affected device row, not only the summary',()=>{
 const p=plan();p.placements[1].startModule=0;
 const r=check(p,lookup);
 assert.equal(r.status,'BLOCKED');
 assert.equal(r.rows.find(x=>x.deviceId==='B').status,'BLOCKED');
});

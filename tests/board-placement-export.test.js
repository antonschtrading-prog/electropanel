'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {epDraftBoardPlanV1}=require('../draft-board-plan-v1');
const src=fs.readFileSync(path.join(__dirname,'..','board-placement-export-v1.js'),'utf8');
const c={epDraftBoardPlanV1};vm.createContext(c);vm.runInContext(src,c);
const csv=c.epBoardPlacementCsvV1;
const p=()=>({railCount:2,railCapacity:6,lines:[{id:'L1',modules:1},{id:'L2',modules:2}],sharedDevices:[{id:'R1',modules:2}]});
test('header present',()=>assert.match(csv(p()).csv,/device_id/));
test('rail column present',()=>assert.match(csv(p()).csv,/rail_number/));
test('start module present',()=>assert.match(csv(p()).csv,/start_module_number/));
test('width column present',()=>assert.match(csv(p()).csv,/width_modules/));
test('end module column present',()=>assert.match(csv(p()).csv,/end_module_number/));
test('contains line 1',()=>assert.match(csv(p()).csv,/"L1"/));
test('contains line 2',()=>assert.match(csv(p()).csv,/"L2"/));
test('contains shared RCD',()=>assert.match(csv(p()).csv,/"R1"/));
test('one-based rail index',()=>assert.match(csv(p()).csv,/"1"/));
test('one-based module index',()=>assert.match(csv(p()).csv,/"1"/));
test('three placement rows',()=>assert.equal(csv(p()).csv.trim().split('\r\n').length,4));
test('CSV uses semicolon',()=>assert.match(csv(p()).csv,/";"/));
test('CSV has CRLF',()=>assert.ok(csv(p()).csv.includes('\r\n')));
test('CSV does not approve engineering',()=>assert.equal(csv(p()).engineeringApproved,false));
test('CSV does not approve installation',()=>assert.equal(csv(p()).ready_for_installation,false));
test('null project blocked',()=>assert.equal(csv(null).status,'BLOCKED'));
test('bad layout blocked',()=>{const q=p();q.railCount=0;assert.equal(csv(q).status,'BLOCKED')});
test('unrecognized article blocked',()=>{const q=p();q.lines[0].catalogSku='SKU';assert.equal(csv(q).status,'BLOCKED')});
test('formula injection prevented',()=>{const q=p();q.lines[0].id='=HYPERLINK(1)';assert.match(csv(q).csv,/"'=HYPERLINK\(1\)"/)});
test('quoted ID escaped',()=>{const q=p();q.lines[0].id='L"1';assert.match(csv(q).csv,/L""1/)});
test('formula with leading spaces prevented',()=>{const q=p();q.lines[0].id='  +1';assert.match(csv(q).csv,/"'  \+1"/)});
test('project not mutated',()=>{const q=p(),before=JSON.stringify(q);csv(q);assert.equal(JSON.stringify(q),before)});
test('deterministic',()=>assert.equal(csv(p()).csv,csv(p()).csv));
test('exports manual position',()=>{
 const q=p();q.manualLayoutV1=[{deviceId:'L1',railIndex:1,startModule:3}];
 assert.match(csv(q).csv,/"L1";"branch";"";"2";"4"/);
});
test('exports catalogue article',()=>{
 const q=p();q.lines[0].catalogSku='SKU';assert.match(csv(q,()=>({modules:1})).csv,/SKU/);
});
test('app has export button',()=>assert.match(fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8'),/boardPlacementCsvBtn/));
test('app calls export engine',()=>assert.match(fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8'),/epBoardPlacementCsvV1\(state,catalogDevice\)/));
test('app names file',()=>assert.match(fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8'),/din-placement\.csv/));
test('index loads before app',()=>{const s=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');assert.ok(s.indexOf('board-placement-export-v1.js')<s.indexOf('app.js'))});

test('DIN schedule includes provenance columns without claiming verified terminals',()=>{
 const out=csv(p());
 assert.match(out.csv,/body_dimension_source_type/);
 assert.match(out.csv,/body_dimension_source_reviewed_at/);
 assert.match(out.csv,/actual_terminal_coordinates_verified/);
 assert.equal(out.ready_for_installation,false);
});

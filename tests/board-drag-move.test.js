'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epDraftBoardPlanV1,epMoveBoardDeviceV1}=require('../draft-board-plan-v1');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'..','board-drag-move-v1.js'),'utf8');
const context={epDraftBoardPlanV1,epMoveBoardDeviceV1};vm.createContext(context);vm.runInContext(source,context);
const move=context.epBoardDragMoveV1;
const project=()=>({railCount:2,railCapacity:6,lines:[
 {id:'L1',modules:1},{id:'L2',modules:1},{id:'L3',modules:2}],
 sharedDevices:[{id:'R1',modules:2}]});
test('swaps equal width devices',()=>assert.equal(move(project(),'L1','L2').code,'BOARD_DRAG_SWAPPED'));
test('swap is not approved',()=>assert.equal(move(project(),'L1','L2').engineeringApproved,false));
test('swap not ready for installation',()=>assert.equal(move(project(),'L1','L2').ready_for_installation,false));
test('swapped positions reversed',()=>{
 const p=project(),before=epDraftBoardPlanV1(p),after=epDraftBoardPlanV1(move(p,'L1','L2').project);
 assert.equal(after.placements.find(x=>x.deviceId==='L1').startModule,before.placements.find(x=>x.deviceId==='L2').startModule);
});
test('target moves to source slot',()=>{
 const p=project(),before=epDraftBoardPlanV1(p),after=epDraftBoardPlanV1(move(p,'L1','L2').project);
 assert.equal(after.placements.find(x=>x.deviceId==='L2').startModule,before.placements.find(x=>x.deviceId==='L1').startModule);
});
test('other device remains in place',()=>{
 const p=project(),before=epDraftBoardPlanV1(p),after=epDraftBoardPlanV1(move(p,'L1','L2').project);
 assert.equal(after.placements.find(x=>x.deviceId==='L3').startModule,before.placements.find(x=>x.deviceId==='L3').startModule);
});
test('source project unchanged',()=>{const p=project(),before=JSON.stringify(p);move(p,'L1','L2');assert.equal(JSON.stringify(p),before)});
test('line order unchanged',()=>{const p=project(),r=move(p,'L1','L2');assert.deepEqual(r.project.lines.map(x=>x.id),p.lines.map(x=>x.id))});
test('source shared device supported',()=>assert.equal(move(project(),'L3','R1').code,'BOARD_DRAG_SWAPPED'));
test('shared apparatus can be target',()=>assert.equal(move(project(),'R1','L3').code,'BOARD_DRAG_SWAPPED'));
test('different widths rejected',()=>assert.equal(move(project(),'L1','L3').code,'BOARD_DRAG_WIDTH_MISMATCH'));
test('missing source rejected',()=>assert.equal(move(project(),'MISSING','L2').code,'BOARD_DRAG_DEVICE_NOT_PLACED'));
test('missing target rejected',()=>assert.equal(move(project(),'L1','MISSING').code,'BOARD_DRAG_DEVICE_NOT_PLACED'));
test('same source and target rejected',()=>assert.equal(move(project(),'L1','L1').code,'BOARD_DRAG_SAME_DEVICE'));
test('empty source rejected',()=>assert.equal(move(project(),'','L1').code,'BOARD_DRAG_INVALID'));
test('empty target rejected',()=>assert.equal(move(project(),'L1','').code,'BOARD_DRAG_INVALID'));
test('nonstring source rejected',()=>assert.equal(move(project(),1,'L1').code,'BOARD_DRAG_INVALID'));
test('nonstring target rejected',()=>assert.equal(move(project(),'L1',1).code,'BOARD_DRAG_INVALID'));
test('null project rejected',()=>assert.equal(move(null,'L1','L2').code,'BOARD_DRAG_INVALID'));
test('invalid layout rejected',()=>{const p=project();p.railCount=0;assert.equal(move(p,'L1','L2').code,'BOARD_DRAG_LAYOUT_BLOCKED')});
test('catalogue mismatch rejected',()=>{const lookup=id=>({modules:5});const p=project();p.lines[0].catalogSku='SKU';assert.equal(move(p,'L1','L2',lookup).code,'BOARD_DRAG_LAYOUT_BLOCKED')});
test('move preserves rail capacity',()=>assert.equal(move(project(),'L1','L2').project.railCapacity,6));
test('move preserves rail count',()=>assert.equal(move(project(),'L1','L2').project.railCount,2));
test('move preserves shared devices',()=>assert.equal(move(project(),'L1','L2').project.sharedDevices.length,1));
test('move creates fixed positions',()=>assert.equal(move(project(),'L1','L2').project.manualLayoutV1.length,4));
test('move fixed positions unique',()=>{const r=move(project(),'L1','L2');assert.equal(new Set(r.project.manualLayoutV1.map(x=>x.deviceId)).size,4)});
test('move does not invent SKU',()=>assert.equal(move(project(),'L1','L2').project.lines[0].catalogSku,undefined));
test('move with fixed layout',()=>{
 const p=project();p.manualLayoutV1=epDraftBoardPlanV1(p).placements.map(x=>({deviceId:x.deviceId,railIndex:x.railIndex,startModule:x.startModule}));
 assert.equal(move(p,'L1','L2').code,'BOARD_DRAG_SWAPPED');
});
test('move does not remove fixed layout on failure',()=>{
 const p=project();p.manualLayoutV1=[{deviceId:'L1',railIndex:0,startModule:0}];
 const before=JSON.stringify(p);move(p,'L1','L3');assert.equal(JSON.stringify(p),before);
});
test('swap twice restores positions',()=>{
 const p=project(),a=move(p,'L1','L2').project,b=move(a,'L1','L2').project;
 const initial=epDraftBoardPlanV1(p).placements,final=epDraftBoardPlanV1(b).placements;
 assert.deepEqual(final.map(x=>[x.deviceId,x.railIndex,x.startModule]),initial.map(x=>[x.deviceId,x.railIndex,x.startModule]));
});
test('index loads drag engine before app',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 assert.ok(html.indexOf('board-drag-move-v1.js')<html.indexOf('app.js'));
});
test('app calls DIN swap',()=>{
 const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
 assert.match(app,/epBoardDragMoveV1\(state,sourceDevice,targetDevice,catalogDevice\)/);
});
test('app no longer reorders on drop',()=>{
 const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
 assert.ok(!app.includes('reorderLine(id,b.dataset.line)'));
});

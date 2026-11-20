'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {epDraftBoardPlanV1}=require('../draft-board-plan-v1');
const src=fs.readFileSync(path.join(__dirname,'..','board-rail-count-v1.js'),'utf8');
const c={epDraftBoardPlanV1};vm.createContext(c);vm.runInContext(src,c);
const change=c.epBoardRailCountChangeV1;
const p=()=>({railCount:2,railCapacity:4,lines:[{id:'L1',modules:1},{id:'L2',modules:2},{id:'L3',modules:1}],sharedDevices:[]});
test('add rail succeeds',()=>assert.equal(change(p(),3).code,'RAIL_COUNT_UPDATED'));
test('add rail changes count',()=>assert.equal(change(p(),3).project.railCount,3));
test('add rail retains devices',()=>assert.equal(change(p(),3).placements.length,3));
test('add rail retains original positions',()=>{
 const original=epDraftBoardPlanV1(p()).placements,actual=change(p(),3).placements;
 assert.equal(JSON.stringify(original.map(x=>[x.deviceId,x.railIndex,x.startModule])),JSON.stringify(actual.map(x=>[x.deviceId,x.railIndex,x.startModule])));
});
test('remove empty rail succeeds',()=>assert.equal(change(p(),1).code,'RAIL_COUNT_UPDATED'));
test('remove empty rail changes count',()=>assert.equal(change(p(),1).project.railCount,1));
test('remove occupied rail rejected',()=>{
 const project=p();project.manualLayoutV1=[{deviceId:'L3',railIndex:1,startModule:0}];
 assert.equal(change(project,1).code,'RAIL_CHANGE_NOT_FIT');
});
test('explicit repack can remove occupied rail',()=>{
 const project=p();project.manualLayoutV1=[{deviceId:'L3',railIndex:1,startModule:0}];
 assert.equal(change(project,1,null,{preserve:false}).code,'RAIL_COUNT_UPDATED');
});
test('reject zero rails',()=>assert.equal(change(p(),0).code,'RAIL_CHANGE_INVALID'));
test('reject negative rails',()=>assert.equal(change(p(),-1).code,'RAIL_CHANGE_INVALID'));
test('reject fractional rails',()=>assert.equal(change(p(),1.5).code,'RAIL_CHANGE_INVALID'));
test('reject too many rails',()=>assert.equal(change(p(),101).code,'RAIL_CHANGE_INVALID'));
test('reject null project',()=>assert.equal(change(null,1).code,'RAIL_CHANGE_INVALID'));
test('reject invalid source count',()=>{const project=p();project.railCount=0;assert.equal(change(project,2).code,'RAIL_CHANGE_INVALID')});
test('reject invalid source capacity',()=>{const project=p();project.railCapacity=0;assert.equal(change(project,2).code,'RAIL_CHANGE_INVALID')});
test('reject baseline overlap',()=>{
 const project=p();project.manualLayoutV1=[{deviceId:'L1',railIndex:0,startModule:0},{deviceId:'L2',railIndex:0,startModule:0}];
 assert.equal(change(project,3).code,'RAIL_CHANGE_BASELINE_BLOCKED');
});
test('reject unknown article',()=>{const project=p();project.lines[0].catalogSku='SKU';assert.equal(change(project,3).code,'RAIL_CHANGE_BASELINE_BLOCKED')});
test('does not mutate source',()=>{const project=p(),before=JSON.stringify(project);change(project,3);assert.equal(JSON.stringify(project),before)});
test('does not change lines',()=>assert.equal(JSON.stringify(change(p(),3).project.lines),JSON.stringify(p().lines)));
test('does not invent articles',()=>assert.equal(change(p(),3).project.lines[0].catalogSku,undefined));
test('always review',()=>assert.equal(change(p(),3).status,'REVIEW_REQUIRED'));
test('no engineering approval',()=>assert.equal(change(p(),3).engineeringApproved,false));
test('no installation approval',()=>assert.equal(change(p(),3).ready_for_installation,false));
test('repeat same count valid',()=>assert.equal(change(p(),2).code,'RAIL_COUNT_UPDATED'));
test('app add button',()=>assert.match(fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8'),/boardAddRailBtn/));
test('app remove button',()=>assert.match(fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8'),/boardRemoveRailBtn/));
test('app uses rail engine',()=>assert.match(fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8'),/epBoardRailCountChangeV1\(state,nextCount,catalogDevice,\{preserve:true\}\)/));
test('app saves history',()=>assert.match(fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8'),/checkpoint\(\);state=result\.project;changed\(\);notify\('Количество DIN-реек/));
test('script loaded before app',()=>{const s=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');assert.ok(s.indexOf('board-rail-count-v1.js')<s.indexOf('app.js'))});

'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {epDraftBoardPlanV1,epMoveBoardDeviceV1}=require('../draft-board-plan-v1');
const project=()=>({railCount:2,railCapacity:6,lines:[{id:'L1',modules:1},{id:'L2',modules:2},{id:'L3',modules:1}],sharedDevices:[]});
test('move to free slot on same rail',()=>{
 const p=project(),r=epMoveBoardDeviceV1(p,'L1',0,5);assert.equal(r.code,'POSITION_UPDATED');
 assert.equal(epDraftBoardPlanV1(r.project).placements.find(x=>x.deviceId==='L1').startModule,5);
});
test('move to free slot on another rail',()=>{
 const p=project(),r=epMoveBoardDeviceV1(p,'L1',1,0);assert.equal(r.code,'POSITION_UPDATED');
 assert.equal(epDraftBoardPlanV1(r.project).placements.find(x=>x.deviceId==='L1').railIndex,1);
});
test('reject overlapping placement',()=>assert.equal(epMoveBoardDeviceV1(project(),'L1',0,1).project,null));
test('reject out of bounds',()=>assert.equal(epMoveBoardDeviceV1(project(),'L2',0,5).project,null));
test('reject nonexistent rail',()=>assert.equal(epMoveBoardDeviceV1(project(),'L1',3,0).project,null));
test('reject negative rail',()=>assert.equal(epMoveBoardDeviceV1(project(),'L1',-1,0).project,null));
test('reject negative module',()=>assert.equal(epMoveBoardDeviceV1(project(),'L1',0,-1).project,null));
test('reject fractional rail',()=>assert.equal(epMoveBoardDeviceV1(project(),'L1',0.5,0).project,null));
test('reject fractional module',()=>assert.equal(epMoveBoardDeviceV1(project(),'L1',0,1.5).project,null));
test('reject unknown device',()=>assert.equal(epMoveBoardDeviceV1(project(),'UNKNOWN',0,0).project,null));
test('preserve line order',()=>{
 const p=project(),r=epMoveBoardDeviceV1(p,'L1',1,0);assert.deepEqual(r.project.lines,p.lines);
});
test('preserve original state',()=>{
 const p=project(),before=JSON.stringify(p);epMoveBoardDeviceV1(p,'L1',1,0);assert.equal(JSON.stringify(p),before);
});
test('preserve all other device positions',()=>{
 const p=project(),before=epDraftBoardPlanV1(p).placements,after=epDraftBoardPlanV1(epMoveBoardDeviceV1(p,'L1',1,0).project).placements;
 for(const b of before.filter(x=>x.deviceId!=='L1')){
  const a=after.find(x=>x.deviceId===b.deviceId);assert.equal(a.startModule,b.startModule);assert.equal(a.railIndex,b.railIndex);
 }
});
test('app marks empty slots with rail',()=>{
 const s=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
 assert.match(s,/empty\.dataset\.railIndex=String\(r\)/);
});
test('app marks empty slots with start module',()=>{
 const s=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
 assert.match(s,/empty\.dataset\.startModule=String\(col\)/);
});
test('app handles drop on empty slot',()=>{
 const s=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
 assert.match(s,/epMoveBoardDeviceV1\(state,sourceDevice,Number\(target\.dataset\.railIndex\)/);
});
test('app handles drop on apparatus',()=>{
 const s=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
 assert.match(s,/epBoardDragMoveV1\(state,sourceDevice,targetDevice,catalogDevice\)/);
});
test('app checkpoints successful drop',()=>{
 const s=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
 assert.match(s,/checkpoint\(\);state=result\.project;changed\(\);notify\('Позиция DIN сохранена/);
});
test('app does not reorder circuits on drop',()=>{
 const s=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
 assert.ok(!s.includes('reorderLine(id,b.dataset.line)'));
});
test('app explains fixed position behavior',()=>{
 const s=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
 assert.match(s,/остальные аппараты не перемещены/);
});

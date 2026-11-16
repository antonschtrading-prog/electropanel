'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const g=require('../cabinet-geometry-v1.js');
const data=()=>({version:1,source:'USER_DECLARED',
 interior:{widthMm:400,heightMm:400,depthMm:120},
 zones:[{railIndex:0,xMm:20,yMm:20,widthMm:360,heightMm:100},
 {railIndex:1,xMm:20,yMm:180,widthMm:360,heightMm:100}],
 planning:{marginMm:20,firstRowYMm:20,zoneHeightMm:100,rowGapMm:60},
 obstacles:[{id:'WD1',kind:'WIRE_DUCT',xMm:20,yMm:130,widthMm:360,heightMm:30}]});
test('reserved ducts between mounting bands remain explicit user declarations',()=>{
 const x=g.epCabinetGeometryNormalizeV1(data());
 assert.equal(x.obstacles[0].kind,'WIRE_DUCT');
 assert.equal(g.epCabinetGeometryCheckV1(x,2,12).status,'REVIEW_REQUIRED');
});
test('duct touching band edge is not flagged as overlap',()=>{
 const x=data();x.obstacles[0].yMm=120;
 assert.equal(g.epCabinetGeometryCheckV1(x,2,12).status,'REVIEW_REQUIRED');
});
test('duct intersecting any rail zone is blocking',()=>{
 const x=data();x.obstacles[0].yMm=100;
 const a=g.epCabinetGeometryCheckV1(x,2,12);
 assert.ok(a.issues.some(i=>i.code==='CABINET_OBSTACLE_ZONE_OVERLAP'));
 assert.equal(a.status,'BLOCKED');
});
test('duct extending outside inner cabinet is blocked',()=>{
 const x=data();x.obstacles[0].xMm=300;
 assert.ok(g.epCabinetGeometryCheckV1(x,2,12).issues.some(i=>i.code==='CABINET_OBSTACLE_OUTSIDE_INTERIOR'));
});
test('overlap of two reserved rectangles is blocked',()=>{
 const x=data();x.obstacles.push({id:'WD2',kind:'TERMINAL_REGION',
 xMm:25,yMm:135,widthMm:100,heightMm:20});
 assert.ok(g.epCabinetGeometryCheckV1(x,2,12).issues.some(i=>i.code==='CABINET_OBSTACLES_OVERLAP'));
});
test('duplicate IDs, malicious objects, negative and fractional dimensions rejected',()=>{
 const base=data(),invalid=[
  [{...base.obstacles[0]},{...base.obstacles[0]}],
  [{...base.obstacles[0],id:'<img>'}],
  [{...base.obstacles[0],kind:'CERTIFIED'}],
  [{...base.obstacles[0],widthMm:-1}],
  [{...base.obstacles[0],heightMm:Infinity}],
  [{...base.obstacles[0],xMm:'20'}],
  [{...base.obstacles[0],constructor:'alert'}],
 ];
 for(const obstacles of invalid)assert.throws(()=>g.epCabinetGeometryNormalizeV1({...base,obstacles}));
});
test('automatic re-spacing retains obstacles and rejects collisions',()=>{
 const x=data();
 const good=g.epCabinetAutoZonesV1({interiorWidthMm:400,interiorHeightMm:400,
 interiorDepthMm:120,...x.planning,obstacles:x.obstacles},2,12);
 assert.equal(good.status,'REVIEW_REQUIRED');
 assert.equal(good.geometry.obstacles[0].id,'WD1');
 const bad=g.epCabinetAutoZonesV1({interiorWidthMm:400,interiorHeightMm:400,
 interiorDepthMm:120,marginMm:20,firstRowYMm:20,zoneHeightMm:100,rowGapMm:10,
 obstacles:x.obstacles},2,12);
 assert.equal(bad.status,'BLOCKED');
});
test('no obstacles remains valid legacy cabinet geometry',()=>{
 const x=data();delete x.obstacles;
 assert.equal(g.epCabinetGeometryNormalizeV1(x).obstacles,undefined);
 assert.equal(g.epCabinetGeometryCheckV1(x,2,12).status,'REVIEW_REQUIRED');
});
test('invalid reserved zone edits do not mutate the project',()=>{
 const project={railCount:2,railCapacity:12,lines:[],cabinetGeometryV1:data()};
 const original=JSON.stringify(project);
 const next=data();next.obstacles[0].yMm=70;
 assert.equal(g.epCabinetGeometryApplyV1(project,next).project,null);
 assert.equal(JSON.stringify(project),original);
});

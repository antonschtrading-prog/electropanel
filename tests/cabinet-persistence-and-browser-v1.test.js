'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const g=require('../cabinet-geometry-v1.js');
const stateSource=fs.readFileSync(path.join(__dirname,'..','project-state-v2.js'),'utf8');
const c={epCabinetGeometryNormalizeV1:g.epCabinetGeometryNormalizeV1};
vm.createContext(c);vm.runInContext(stateSource,c);
const fixture=()=>({version:1,source:'USER_DECLARED',interior:{widthMm:500,heightMm:500,depthMm:120},
 zones:[{railIndex:0,xMm:20,yMm:20,widthMm:450,heightMm:90}]});
test('JSON extension restores declared dimensions without trusting computed fit',()=>{
 const geometry=fixture(),project={lines:[]};
 c.epRestoreProjectExtensionsV2({lines:[],cabinetGeometryV1:geometry},project);
 assert.equal(project.cabinetGeometryV1.interior.widthMm,500);
 assert.equal(project.cabinetGeometryV1.zones.length,1);
 assert.equal(project.cabinetGeometryV1.engineeringApproved,undefined);
 assert.equal(project.cabinetGeometryV1.confirmedCabinetFit,undefined);
});
test('saved geometry is cloned and is independent of serialized source',()=>{
 const geometry=fixture(),p={lines:[]};
 c.epRestoreProjectExtensionsV2({lines:[],cabinetGeometryV1:geometry},p);
 geometry.interior.depthMm=1;
 assert.equal(p.cabinetGeometryV1.interior.depthMm,120);
});
test('reject unsupported imported schema and fake approval fields',()=>{
 for(const input of [{...fixture(),version:42},{...fixture(),engineeringApproved:true},
  {...fixture(),interior:{widthMm:'500',heightMm:500,depthMm:120}},
  {...fixture(),zones:[{...fixture().zones[0],railIndex:0},fixture().zones[0]]}]){
  assert.throws(()=>c.epRestoreProjectExtensionsV2({lines:[],cabinetGeometryV1:input},{lines:[]}));
 }
});
test('older projects without cabinet remain import-compatible',()=>{
 const p={lines:[]};
 c.epRestoreProjectExtensionsV2({lines:[]},p);
 assert.equal(p.cabinetGeometryV1,undefined);
});
test('published scripts load cabinet geometry before persistence and UI app',()=>{
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 assert.ok(html.indexOf('cabinet-geometry-v1.js')<html.indexOf('project-state-v2.js'));
 assert.ok(html.indexOf('cabinet-geometry-ui-v1.js')<html.indexOf('app.js'));
});
test('actual browser regression covers saving dimensions, undo, redo and printed schedule',()=>{
 const script=fs.readFileSync(path.join(__dirname,'..','scripts/browser-integration.cjs'),'utf8');
 assert.match(script,/cabinetGeometryPanel \[data-cabinet-autoplan\]/);
 assert.match(script,/epEngineeringBundleV1\(state,catalogDevice\)/);
 assert.match(script,/cabinet_zone_x_mm/);
 assert.match(script,/cabinetBefore/);
});

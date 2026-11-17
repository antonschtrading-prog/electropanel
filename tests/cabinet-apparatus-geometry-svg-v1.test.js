'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epCabinetApparatusGeometrySvgV1:svg}=require('../cabinet-apparatus-geometry-svg-v1');
const report=()=>({status:'UNKNOWN',summary:{assumedModulePitchMm:18,
 railWidths:[{railIndex:0,nominalSpanMm:108},{railIndex:1,nominalSpanMm:108}]},
 rows:[{deviceId:'A',railIndex:0,startModule:0,modules:2,nominalWidthMm:36,
 widthMm:35,heightMm:85,depthMm:68,dimensionsKnown:true},
 {deviceId:'B',railIndex:1,startModule:1,modules:1,nominalWidthMm:18,
 widthMm:null,heightMm:null,depthMm:null,dimensionsKnown:false}]});
test('SVG renders',()=>assert.match(svg(report()),/^<svg/));
test('SVG has accessible role',()=>assert.match(svg(report()),/role="img"/));
test('SVG has both rails',()=>{assert.match(svg(report()),/DIN 1/);assert.match(svg(report()),/DIN 2/)});
test('SVG shows apparatus',()=>{assert.match(svg(report()),/>A</);assert.match(svg(report()),/>B</)});
test('SVG reports known dimensions',()=>assert.match(svg(report()),/35 мм/));
test('SVG reports unknown dimensions',()=>assert.match(svg(report()),/ширина н\/д/));
test('SVG marks complete geometry',()=>assert.match(svg(report()),/#d1fae5/));
test('SVG marks unknown geometry',()=>assert.match(svg(report()),/#fef3c7/));
test('SVG escapes device ID',()=>{const p=report();p.rows[0].deviceId='<script>alert(1)</script>';assert.doesNotMatch(svg(p),/<script>/);assert.match(svg(p),/&lt;script&gt;/)});
test('SVG null blocked',()=>assert.equal(svg(null),''));
test('SVG blocked report empty',()=>assert.equal(svg({...report(),status:'BLOCKED'}),''));
test('SVG no rails empty',()=>{const p=report();p.summary.railWidths=[];assert.equal(svg(p),'')});
test('SVG bad width empty',()=>{const p=report();p.summary.railWidths[0].nominalSpanMm=Infinity;assert.equal(svg(p),'')});
test('SVG too many rails empty',()=>{const p=report();p.summary.railWidths=Array.from({length:101},(_,i)=>({railIndex:i,nominalSpanMm:108}));assert.equal(svg(p),'')});
test('SVG deterministic',()=>assert.equal(svg(report()),svg(report())));
test('SVG no embedded image',()=>assert.doesNotMatch(svg(report()),/<image/));
test('SVG does not mutate input',()=>{const p=report(),s=JSON.stringify(p);svg(p);assert.equal(JSON.stringify(p),s)});
test('SVG includes noninstallation note',()=>assert.match(svg(report()),/не для монтажа/));

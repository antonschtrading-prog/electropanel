'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'..','styles.css'),'utf8');
test('main DIN board resolves exact article and shared rendering boundary',()=>{
 assert.match(app,/function epBoardArticleFaceHtmlV2\(line,id\)/);
 assert.match(app,/epManufacturerVisualHtmlV1\(c,id\|\|line.id\)/);
 assert.match(app,/epBoardArticleFaceHtmlV2\(l,boardId\|\|l.id\)/);
 assert.match(app,/epBoardArticleFaceHtmlV2\(line,line.id\)/);
});
test('board keeps nominal modules distinct from body width',()=>{
 assert.match(app,/let width=0;while\(col\+width<slots\.length/);
 assert.match(app,/d\.dataset\.nominalSlotWidthMm=String\(width\*18\)/);
 assert.match(app,/d\.dataset\.bodyWidthMm=bodyWidth===null\?'unknown'/);
 assert.match(app,/d\.dataset\.geometryWidthConflict/);
});
test('board exposes image status and geometry warnings',()=>{
 assert.match(app,/d\.dataset\.frontAssetStatus=asset\?\.status/);
 assert.match(app,/epDinPhysicalEnvelopeV1\(epDraftBoardPlanV1\(state,catalogDevice\),catalogDevice\)/);
 assert.match(app,/Расхождения геометрии/);
});
test('no invented manufacturer image when article is absent',()=>{
 assert.match(app,/if\(!c\|\|typeof epManufacturerVisualHtmlV1!=='function'\)return ''/);
});
test('selected device captions distinguish SVG and licensed image',()=>{
 assert.match(app,/Оригинальный стилизованный фасад; не фотография и не CAD производителя/);
});
test('image layout is responsive and conflicts are visible',()=>{
 assert.match(css,/\.din-apparatus:has\(\.ep-board-front\)/);
 assert.match(css,/data-geometry-width-conflict/);
 assert.match(css,/@media\(max-width:760px\)/);
});
test('front helper cannot change the engineering state',()=>{
 const i=app.indexOf('function epBoardArticleFaceHtmlV2'),j=app.indexOf('function deviceAppearance(',i);
 assert.doesNotMatch(app.slice(i,j),/checkpoint|changed\(|calculate|state\s*=/);
});

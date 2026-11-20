'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
test('cabinet depth limit is exposed in the existing layout editor',()=>{
 assert.match(html,/id="cabinetDepthLimit"/);
 assert.match(html,/Макс\. полезная глубина/);
 assert.match(html,/cabinet-option-constraints-v1\.js/);
 assert.ok(html.indexOf('cabinet-option-constraints-v1.js')<html.indexOf('app.js'));
});
test('depth limit participates in project preferences, rerender and input events',()=>{
 assert.match(app,/\['cabinetDepthLimit','maxUsableDepthMm'\]/);
 assert.match(app,/limits\.maxUsableDepthMm\?\?null/);
 assert.match(app,/cabinetCapacityInputSignatureV1/);
});
test('the same constraint engine protects both preview and apply',()=>{
 assert.ok((app.match(/epCabinetOptionConstraintsV1\(report,/g)||[]).length>=3);
 assert.match(app,/constraints\?\.eligible\.some\(x=>x\.optionId===id\)/);
 assert.match(app,/const eligibleIds=new Set\(constraintReport\?\.eligible/);
});
test('supplier CSV uses dimension-only limits and exported JSON records constraint decisions',()=>{
 assert.match(app,/epCabinetCapacityCsvV1\(report,\{/);
 assert.match(app,/constraintReview:typeof epCabinetOptionConstraintsV1/);
 assert.match(app,/maxUsableDepthMm:state\.cabinetSizingPreferencesV1\?\.maxUsableDepthMm\?\?null/);
});
test('when no candidate fits the layout UI clears stale diagrams',()=>{
 assert.match(app,/if\(!shown\.length\)\{/);
 assert.match(app,/diagram\.replaceChildren\(\)/);
 assert.match(app,/Неизвестная глубина аппаратов требует уточнения/);
});

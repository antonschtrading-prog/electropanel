'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {epFireControlHtmlV1}=require('../fire-control-ui-v1');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
test('editor escapes unsafe project text',()=>{
 const html=epFireControlHtmlV1({fireControlV1:{version:1,signals:[],actions:[],note:'<script>alert(1)</script>'}});
 assert.ok(html.includes('&lt;script&gt;'));
 assert.ok(!html.includes('<script>'));
});
test('editor has usable save and clear controls',()=>{
 const html=epFireControlHtmlV1({fireControlV1:{version:1,signals:[],actions:[]}});
 assert.match(html,/id="fireControlApplyBtn"/);
 assert.match(html,/id="fireControlClearBtn"/);
 assert.match(html,/id="fireControlJson"/);
});
test('editor is loaded before app',()=>{
 const html=read('index.html');
 assert.ok(html.indexOf('fire-control-ui-v1.js')<html.indexOf('app.js'));
});
test('workflow renders editor',()=>{
 assert.match(read('app.js'),/epFireControlHtmlV1\(state\)/);
});
test('editor events are delegated to workflow panel',()=>{
 assert.match(read('app.js'),/addEventListener\('click',epFireControlEditorEventV1\)/);
});
test('fire control project updates use undo checkpoints',()=>{
 const src=read('app.js');
 assert.match(src,/function epFireControlSetProjectV1[\s\S]*?checkpoint\(\);state\.fireControlV1=/);
});
test('consumer deletion is guarded',()=>{
 assert.match(read('app.js'),/epFireControlConsumerDeleteV1\(project,id\)/);
});
test('circuit deletion is guarded',()=>{
 assert.match(read('app.js'),/epFireControlCircuitDeleteV1\(state,id\)/);
});
test('merge guard remains linked to fire control',()=>{
 assert.match(read('consumer-group-merge-v1.js'),/GROUP_MERGE_FIRE_CONTROL_LINKED/);
});
test('split guard remains linked to fire control',()=>{
 assert.match(read('consumer-group-split-v1.js'),/GROUP_SPLIT_FIRE_CONTROL_LINKED/);
});

test('fire report export is visible in workflow',()=>{
 const html=epFireControlHtmlV1({fireControlV1:{version:1,signals:[],actions:[]}});
 assert.match(html,/id="fireControlExportBtn"/);
});
test('report export includes audit trace design and schedule',()=>{
 const src=read('app.js');
 assert.match(src,/fireControlExportBtn/);
 assert.match(src,/trace:epFireControlTraceV1\(state\)/);
 assert.match(src,/design:epFireControlDesignV1\(state\)/);
 assert.match(src,/schedule:epFireControlScheduleV1\(state\)/);
});
test('invalid actuator design is rejected before state mutation',()=>{
 const src=read('app.js');
 const i=src.indexOf('function epFireControlSetProjectV1');
 const section=src.slice(i,src.indexOf('function epFireControlClearProjectV1',i));
 assert.ok(section.indexOf('epFireControlDesignV1')<section.indexOf('checkpoint()'));
});

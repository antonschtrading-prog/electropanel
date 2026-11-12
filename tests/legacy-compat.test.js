'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','legacy-compat.js'),'utf8');
const {epInspectLegacyPanel}=vm.runInNewContext(source+'\n({epInspectLegacyPanel})');
const legacy=()=>({catalog:{'MODEL-C16':{modules:1},'MODEL-C10':{modules:2}},panel:{rails:[{id:'DIN-1',modules:12}],
 devices:[{id:'QF1',model_sku:'MODEL-C16',rail_id:'DIN-1',start_module:0},
 {id:'QF2',model_sku:'MODEL-C10',rail_id:'DIN-1',start_module:2}],
 wires:[{wire_id:'W-L',source_device:'QF1',target_device:'QF2',
 source_port:'L_OUT',target_port:'L_IN'}]}});
test('existing Web model is not mistaken for old Studio',()=>{
 assert.equal(epInspectLegacyPanel({schema:'electropanel.web.preview.1',lines:[]}).recognized,false);
});
test('old project can be inspected without auto-import or approval',()=>{
 const report=epInspectLegacyPanel(legacy());
 assert.equal(report.recognized,true);
 assert.equal(report.status,'READ_ONLY_COMPATIBLE');
 assert.equal(report.automaticMigrationSafe,false);
 assert.equal(report.engineeringApproved,false);
 assert.equal(report.counts.devices,2);
 assert.equal(report.counts.wires,1);
});
test('dangling wires are not transformed into fabricated valid topology',()=>{
 const project=legacy();project.panel.wires[0].target_device='UNKNOWN';
 const report=epInspectLegacyPanel(project);
 assert.equal(report.status,'REVIEW_REQUIRED');
 assert.ok(Array.from(report.issues,x=>x).some(x=>x.includes('неизвестным аппаратом')));
});
test('duplicate device IDs are flagged',()=>{
 const project=legacy();project.panel.devices[1].id='QF1';
 assert.equal(epInspectLegacyPanel(project).status,'REVIEW_REQUIRED');
});
test('malformed legacy structures are not accepted',()=>{
 assert.equal(epInspectLegacyPanel({panel:{devices:[],rails:'not-array'}}).recognized,false);
});

test('old Studio geometrical collision is reported',()=>{
 const project=legacy();project.panel.devices[1].start_module=0;
 const report=epInspectLegacyPanel(project);
 assert.equal(report.status,'REVIEW_REQUIRED');
 assert.ok(Array.from(report.issues,x=>x).some(x=>x.includes('Пересечение аппаратов')));
});
test('old Studio model with unknown width cannot be automatically accepted',()=>{
 const project=legacy();delete project.catalog['MODEL-C10'];
 const report=epInspectLegacyPanel(project);
 assert.equal(report.status,'REVIEW_REQUIRED');
 assert.ok(Array.from(report.issues,x=>x).some(x=>x.includes('Неизвестная ширина')));
});

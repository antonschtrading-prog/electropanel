'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {epMaximumFaultHtmlV2,epMaximumFaultSegmentHtmlV2}=require('../maximum-fault-ui-v2.js');
global.epMaximumFaultCurrentV2=require('../fault-route-design-v2.js').epMaximumFaultCurrentV2;
const p=()=>({earthing:'TN-S',lines:[{id:'L1',phase:'3Ф',catalogSku:'A',
 maximumFaultInput:{model:'THREE_PHASE_POSITIVE_SEQUENCE',uLLV:400,cmax:1.1,
 sourceROhm:0.01,sourceXOhm:0.02,networkSource:'engineering calculation',
 segments:[{lengthM:10,r1OhmKm:0.5,x1OhmKm:0.09,source:'catalogue R/X',
 temperatureBasisConfirmed:true}]}}]});
test('separate forms never conflate 3ph and L-N conductor impedance fields',()=>{
 const html=epMaximumFaultHtmlV2(p(),'L1',()=>({kind:'MCB',poles:3,icnKa:10,icnVoltageV:400,icnStandard:'IEC 60898-1',verificationStatus:'UNVERIFIED'}));
 assert.match(html,/data-max-fault-model="THREE_PHASE_POSITIVE_SEQUENCE"/);
 assert.match(html,/data-max-fault-model="SINGLE_PHASE_L_N"/);
 assert.match(html,/data-max-segment-field="r1OhmKm"/);
 assert.match(html,/data-max-segment-field="neutralROhmKm"/);
 assert.match(html,/Ik,max:/);
 assert.match(html,/engineering calculation/);
});
test('UI never proposes numeric defaults or engineering approval',()=>{
 const project={lines:[{id:'L1',phase:'L1'}]};
 const html=epMaximumFaultHtmlV2(project,'L1',()=>null);
 assert.match(html,/name="cmax" required value=""/);
 assert.match(html,/name="sourceROhm" required value=""/);
 assert.doesNotMatch(html,/engineeringApproved=true/);
 assert.match(html,/не подтверждает селективность/);
});
test('untrusted conductor text is escaped in visualisation',()=>{
 const html=epMaximumFaultSegmentHtmlV2({source:'<img src=x onerror=alert(1)>'},true,0);
 assert.doesNotMatch(html,/<img/);
 assert.match(html,/&lt;img/);
});
test('page loads max-fault UI before app, and real editor handlers are attached',()=>{
 const root=path.resolve(__dirname,'..');
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.ok(html.indexOf('maximum-fault-ui-v2.js')<html.indexOf('app.js'));
 assert.match(html,/id="maximumFaultPanel"/);
 assert.match(app,/epMaximumFaultHtmlV2/);
 assert.match(app,/epApplyMaximumFaultV2\(state,form.dataset.maxFault,input,catalogDevice\)/);
});

test('transformer mode displays separate rated values, upstream R/X and evidence without defaults',()=>{
 const project={lines:[{id:'L1',phase:'3Ф',maximumFaultInput:{
  model:'THREE_PHASE_POSITIVE_SEQUENCE',sourceModel:'TRANSFORMER_WITH_UPSTREAM',
  uLLV:400,cmax:1.1,transformer:{ratedPowerKva:1000,ratedVoltageV:400,
   ukPercent:6,loadLossW:9000,upstreamROhm:0,upstreamXOhm:0,
   source:'manufacturer data',upstreamSource:'grid study',lossBasisConfirmed:true},
  segments:[{lengthM:10,r1OhmKm:0.4,x1OhmKm:0.08,source:'cable',
   temperatureBasisConfirmed:true}]}}]};
 global.epTransformerSourceV1=require('../transformer-source-v1.js').epTransformerSourceV1;
 const h=epMaximumFaultHtmlV2(project,'L1',()=>null);
 assert.match(h,/data-max-fault-source-model="TRANSFORMER_WITH_UPSTREAM"/);
 assert.match(h,/name="ratedPowerKva" required value="1000"/);
 assert.match(h,/name="upstreamROhm" required value="0"/);
 assert.match(h,/name="lossBasisConfirmed" checked/);
 assert.match(h,/manufacturer data/);
 const blank=epMaximumFaultHtmlV2({lines:[{id:'L1',phase:'3Ф'}]},'L1',()=>null);
 assert.match(blank,/name="ukPercent" required value=""/);
 assert.match(blank,/name="ratedPowerKva" required value=""/);
});
test('production page loads transformer arithmetic before maximum fault route and UI',()=>{
 const root=path.resolve(__dirname,'..');
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.ok(html.indexOf('transformer-source-v1.js')<html.indexOf('fault-route-design-v2.js'));
 assert.match(app,/dataset\.maxFaultSourceModel/);
 assert.match(app,/input\.transformer=/);
});

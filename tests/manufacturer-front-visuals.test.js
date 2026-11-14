'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epCatalogFrontSvgV1}=require('../catalog-front-svg-v1.js');
const article={id:'ABC-1',sku:'A16',maker:'Schneider Electric',series:'Example Series',
 kind:'MCB',poles:2,modules:2,widthMm:36,inA:16,curve:'B',icnKa:6,verificationStatus:'UNVERIFIED'};
test("MCB has rocker switches",()=>{
 const svg=epCatalogFrontSvgV1({...article,kind:"MCB"});
 assert.equal(svg.includes("data-lever="),true);
 assert.match(svg,/data-device-kind=\"MCB\"/);
});
test("MCB has no test control",()=>{
 const svg=epCatalogFrontSvgV1({...article,kind:"MCB"});
 assert.equal(svg.includes("data-test-control="),false);
 assert.match(svg,/data-device-kind=\"MCB\"/);
});
test("RCD has rocker switches",()=>{
 const svg=epCatalogFrontSvgV1({...article,kind:"RCD"});
 assert.equal(svg.includes("data-lever="),true);
 assert.match(svg,/data-device-kind=\"RCD\"/);
});
test("RCD has test control",()=>{
 const svg=epCatalogFrontSvgV1({...article,kind:"RCD"});
 assert.equal(svg.includes("data-test-control="),true);
 assert.match(svg,/data-device-kind=\"RCD\"/);
});
test("RCBO has rocker switches",()=>{
 const svg=epCatalogFrontSvgV1({...article,kind:"RCBO"});
 assert.equal(svg.includes("data-lever="),true);
 assert.match(svg,/data-device-kind=\"RCBO\"/);
});
test("RCBO has test control",()=>{
 const svg=epCatalogFrontSvgV1({...article,kind:"RCBO"});
 assert.equal(svg.includes("data-test-control="),true);
 assert.match(svg,/data-device-kind=\"RCBO\"/);
});
test("isolator switch has rocker",()=>{
 const svg=epCatalogFrontSvgV1({...article,kind:"SWITCH"});
 assert.equal(svg.includes("data-lever="),true);
 assert.match(svg,/data-device-kind=\"SWITCH\"/);
});
test("isolator has no RCD test control",()=>{
 const svg=epCatalogFrontSvgV1({...article,kind:"SWITCH"});
 assert.equal(svg.includes("data-test-control="),false);
 assert.match(svg,/data-device-kind=\"SWITCH\"/);
});
test("contactor has coil face",()=>{
 const svg=epCatalogFrontSvgV1({...article,kind:"CONTACTOR"});
 assert.equal(svg.includes("data-coil="),true);
 assert.match(svg,/data-device-kind=\"CONTACTOR\"/);
});
test("contactor has no breaker rocker",()=>{
 const svg=epCatalogFrontSvgV1({...article,kind:"CONTACTOR"});
 assert.equal(svg.includes("data-lever="),false);
 assert.match(svg,/data-device-kind=\"CONTACTOR\"/);
});
test("relay has coil face",()=>{
 const svg=epCatalogFrontSvgV1({...article,kind:"RELAY"});
 assert.equal(svg.includes("data-coil="),true);
 assert.match(svg,/data-device-kind=\"RELAY\"/);
});
test("relay has no breaker rocker",()=>{
 const svg=epCatalogFrontSvgV1({...article,kind:"RELAY"});
 assert.equal(svg.includes("data-lever="),false);
 assert.match(svg,/data-device-kind=\"RELAY\"/);
});
test("meter has LCD illustration",()=>{
 const svg=epCatalogFrontSvgV1({...article,kind:"METER"});
 assert.equal(svg.includes("data-display="),true);
 assert.match(svg,/data-device-kind=\"METER\"/);
});
test("meter has no breaker rocker",()=>{
 const svg=epCatalogFrontSvgV1({...article,kind:"METER"});
 assert.equal(svg.includes("data-lever="),false);
 assert.match(svg,/data-device-kind=\"METER\"/);
});
test("meter has no invented numeric reading",()=>{
 const svg=epCatalogFrontSvgV1({...article,kind:"METER"});
 assert.equal(svg.includes("— — —"),true);
 assert.match(svg,/data-device-kind=\"METER\"/);
});
test("DIN supply has ventilation",()=>{
 const svg=epCatalogFrontSvgV1({...article,kind:"DIN_PSU"});
 assert.equal(svg.includes("data-vent="),true);
 assert.match(svg,/data-device-kind=\"DIN_PSU\"/);
});
test("DIN supply has no breaker rocker",()=>{
 const svg=epCatalogFrontSvgV1({...article,kind:"DIN_PSU"});
 assert.equal(svg.includes("data-lever="),false);
 assert.match(svg,/data-device-kind=\"DIN_PSU\"/);
});
test("DIN supply has no invented output voltage",()=>{
 const svg=epCatalogFrontSvgV1({...article,kind:"DIN_PSU"});
 assert.equal(svg.includes("DC OUT · not rated"),true);
 assert.match(svg,/data-device-kind=\"DIN_PSU\"/);
});
test("other devices have neutral face",()=>{
 const svg=epCatalogFrontSvgV1({...article,kind:"OTHER"});
 assert.equal(svg.includes("data-generic-face="),true);
 assert.match(svg,/data-device-kind=\"OTHER\"/);
});
test("other devices have no breaker rocker",()=>{
 const svg=epCatalogFrontSvgV1({...article,kind:"OTHER"});
 assert.equal(svg.includes("data-lever="),false);
 assert.match(svg,/data-device-kind=\"OTHER\"/);
});

test('manufacturer and series shown from selected article rather than invented brand line',()=>{
 const svg=epCatalogFrontSvgV1(article);
 assert.match(svg,/Schneider Electric/);
 assert.match(svg,/Example Series/);
 assert.doesNotMatch(svg,/Acti9/);
 assert.match(svg,/data-appearance-family="schneider"/);
});
test('ABB and IEK facades use distinct visual families',()=>{
 assert.match(epCatalogFrontSvgV1({...article,maker:'ABB'}),/data-appearance-family="abb"/);
 assert.match(epCatalogFrontSvgV1({...article,maker:'IEK'}),/data-appearance-family="iek"/);
});
test('neutral manufacturer does not impersonate a real brand',()=>{
 const svg=epCatalogFrontSvgV1({...article,maker:'Unknown'});
 assert.match(svg,/data-appearance-family="neutral"/);
 assert.doesNotMatch(svg,/Acti9/);
});
test('unverified manufacturer data is explicitly labelled illustration',()=>{
 const svg=epCatalogFrontSvgV1(article);
 assert.match(svg,/Условный эскиз/);
 assert.match(svg,/не подтверждены/);
});
test('verified dimensions still do not claim an official photograph',()=>{
 const svg=epCatalogFrontSvgV1({...article,verificationStatus:'VERIFIED'});
 assert.match(svg,/Эскиз, не официальный фасад/);
});
test('invalid dimensions cannot look like confirmed product geometry',()=>{
 const svg=epCatalogFrontSvgV1({...article,widthMm:1000,verificationStatus:'VERIFIED'});
 assert.match(svg,/не подтверждены/);
});
test('missing manufacturer preserves neutral explicit disclosure',()=>{
 const svg=epCatalogFrontSvgV1({...article,maker:null});
 assert.match(svg,/Условный вид/);
});
test('unknown or unlisted kind falls back to plain neutral face',()=>{
 const svg=epCatalogFrontSvgV1({...article,kind:'INVENTED'});
 assert.match(svg,/data-generic-face/);
 assert.doesNotMatch(svg,/data-lever/);
});
test('missing kind falls back to neutral device rather than pretending to be a breaker',()=>{
 const svg=epCatalogFrontSvgV1({...article,kind:null});
 assert.match(svg,/data-device-kind="OTHER"/);
 assert.match(svg,/data-generic-face/);
});
test('untrusted manufacturer and series text is escaped in SVG',()=>{
 const svg=epCatalogFrontSvgV1({...article,maker:'<svg onload=alert(1)>',series:'<script>bad</script>'});
 assert.doesNotMatch(svg,/<script>/);
 assert.doesNotMatch(svg,/<svg onload=/);
 assert.match(svg,/&lt;script&gt;/);
 assert.match(svg,/&lt;svg onload=alert\(1\)&gt;/);
});
test('SVG aria-label cannot be injected through device SKU',()=>{
 const svg=epCatalogFrontSvgV1({...article,sku:'" onmouseover="run()'});
 assert.doesNotMatch(svg,/aria-label="[^"]*" onmouseover=/);
 assert.match(svg,/&quot; onmouseover=&quot;run\(\)/);
});
test('number of illustrated terminals matches both ends of declared pole count',()=>{
 const svg=epCatalogFrontSvgV1({...article,poles:4,modules:4,widthMm:72});
 assert.equal((svg.match(/data-terminal="true"/g)||[]).length,8);
});
test('illustration scales levers without overlap for eight poles',()=>{
 const svg=epCatalogFrontSvgV1({...article,poles:8,modules:1,widthMm:18});
 const widths=[...svg.matchAll(/data-lever="true" x="[^"]+" y="127" width="([^"]+)"/g)].map(x=>Number(x[1]));
 assert.equal(widths.length,8);
 assert.ok(widths.every(x=>x>0&&x<92/8));
});
test('all styles remain valid SVG fragments with finite view box',()=>{
 for(const kind of ['MCB','RCBO','RCD','SWITCH','CONTACTOR','RELAY','METER','DIN_PSU','OTHER']){
  const svg=epCatalogFrontSvgV1({...article,kind});
  assert.match(svg,/^<svg /);
  assert.match(svg,/<\/svg>$/);
  assert.doesNotMatch(svg,/NaN|Infinity/);
 }
});
test('rated current does not turn into a simulated measurement',()=>{
 const svg=epCatalogFrontSvgV1({...article,kind:'METER',inA:40});
 assert.match(svg,/>B40<\/text>/);
 assert.match(svg,/— — —/);
});

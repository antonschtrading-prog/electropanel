'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {epCatalogFrontSvgV1}=require('../catalog-front-svg-v1');
test('brand and series alter vector facade',()=>{
 const a=epCatalogFrontSvgV1({maker:'ABB',series:'S200',sku:'S201',poles:1,inA:16,curve:'C',widthMm:17.5});
 const b=epCatalogFrontSvgV1({maker:'IEK',series:'KARAT',sku:'A',poles:2,inA:25,widthMm:36});
 assert.match(a,/ABB/);assert.match(b,/IEK/);assert.notEqual(a,b);
 assert.match(b,/viewBox="0 0 184 240"/);
});
test('untrusted catalog text is escaped',()=>assert.doesNotMatch(epCatalogFrontSvgV1({maker:'<script>',sku:'"><img>'}),/<script>|<img>/));
test('unavailable article uses neutral appearance',()=>assert.match(epCatalogFrontSvgV1(null),/Условный вид/));

test('SVG gradients do not collide for different apparatus',()=>{
 const a=epCatalogFrontSvgV1({maker:'ABB',widthMm:18},'BR-01');
 const b=epCatalogFrontSvgV1({maker:'ABB',widthMm:18},'BR-02');
 const idA=a.match(/linearGradient id="([^"]+)"/)[1],idB=b.match(/linearGradient id="([^"]+)"/)[1];
 assert.notEqual(idA,idB);assert.ok(a.includes('url(#'+idA+')'));assert.ok(b.includes('url(#'+idB+')'));
});

test('facade announces unverified geometry instead of presenting a passport drawing',()=>{
 const svg=epCatalogFrontSvgV1({maker:'ABB',series:'S200',sku:'A',modules:1,poles:1,widthMm:36,verificationStatus:'VERIFIED'});
 assert.match(svg,/геометрия\/паспорт не подтверждены/);
});
test('verified article geometry still remains an original illustrative SVG',()=>{
 const svg=epCatalogFrontSvgV1({maker:'ABB',series:'S200',sku:'A',modules:1,poles:1,widthMm:17.5,verificationStatus:'VERIFIED'});
 assert.match(svg,/Эскиз, не официальный фасад/);
 assert.match(svg,/viewBox="0 0 92 240"/);
});

test('SVG gradients change with article and series even when DIN device ID stays the same',()=>{
 const base={maker:'ABB',series:'S200',sku:'A1',kind:'MCB',modules:1,poles:1,widthMm:18};
 const ids=[base,{...base,sku:'A2'},{...base,series:'S300'},{...base,kind:'RCBO'},
  {...base,modules:2,widthMm:36}].map(x=>
   epCatalogFrontSvgV1(x,'SAME-ID').match(/linearGradient id="([^"]+)"/)[1]);
 assert.equal(new Set(ids).size,ids.length);
});
test('SVG gradient reference matches its unique definition',()=>{
 const svg=epCatalogFrontSvgV1({maker:'Hager',series:'MBS',sku:'A',modules:2,poles:2},'ID');
 const id=svg.match(/linearGradient id="([^"]+)"/)[1];
 assert.match(svg,new RegExp('url\\(#'+id+'\\)'));
});

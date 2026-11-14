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

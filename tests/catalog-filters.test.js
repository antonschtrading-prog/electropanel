'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'..','catalog.js'),'utf8');
const api=vm.runInNewContext(source+'\n({epCatalogMakers,epCatalogSeries,epCatalogFilter,epCatalogSku,epCatalogCompatible})');

test('catalog makers and series are deduplicated and scoped',()=>{
 const makers=Array.from(api.epCatalogMakers());
 assert.deepEqual(makers,['ABB','IEK','Schneider Electric']);
 assert.deepEqual(Array.from(api.epCatalogSeries('IEK')),['KARAT ВА47-29']);
 assert.deepEqual(Array.from(api.epCatalogSeries('missing')),[]);
});
test('manufacturer and series filter retains only matching SKUs',()=>{
 const filtered=Array.from(api.epCatalogFilter('ABB','System pro M S200'));
 assert.equal(filtered.length,1);
 assert.equal(filtered[0][1].sku,'2CDS251001R0164');
 assert.equal(api.epCatalogFilter('IEK','Acti9 iC60N').length,0);
 assert.equal(api.epCatalogFilter().length,3);
});
test('unknown product is never filled with invented catalogue values',()=>{
 assert.equal(api.epCatalogSku('UNKNOWN'),null);
});

test('phase filtering rejects wrong pole counts, without electrical approval',()=>{
 assert.equal(api.epCatalogCompatible('SE-A9F74116','L1'),true);
 assert.equal(api.epCatalogCompatible('SE-A9F74116','3Ф'),false);
 assert.equal(api.epCatalogCompatible('SE-A9F74116',''),false);
 assert.equal(api.epCatalogCompatible('UNKNOWN','L1'),false);
 assert.equal(api.epCatalogFilter('','', '3Ф').length,0);
 assert.equal(api.epCatalogFilter('','', 'L1').length,3);
});

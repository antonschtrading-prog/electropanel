'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../styles.css'),'utf8');
const section=app.slice(app.indexOf('function renderCabinetArticleReconciliationV1()'),
 app.indexOf('function renderBoard(){'));
test('gallery is derived from actual board article identities',()=>{
 assert.match(section,/new Set\(report\.rows\.map\(x=>x\.boardSku\)/);
 assert.match(section,/Фасады аппаратов в проекте/);
 assert.match(section,/epCabinetFrontGalleryModelV1\(report\.rows,catalogDevice/);
 assert.match(section,/for\(const entry of result\.items\)/);
});
test('gallery uses rights-aware images and safe original SVG rendering',()=>{
 assert.match(section,/epCatalogFrontSvgV1\(item,'gallery-'\+sku\)/);
 assert.match(section,/epManufacturerFrontResolveV1\(item\)/);
 assert.match(section,/new DOMParser\(\)\.parseFromString\(svg,'image\/svg\+xml'\)/);
 assert.match(section,/document\.importNode\(parsed\.documentElement,true\)/);
 assert.doesNotMatch(section,/innerHTML/);
});
test('gallery does not claim generated SVG is manufacturer photography',()=>{
 assert.match(section,/Каталожные SVG — авторские эскизы, не фотографии/);
 assert.match(section,/Авторский эскиз/);
 assert.match(section,/Изображение отклонено/);
});
test('gallery uses textContent for catalogue metadata and limits card count',()=>{
 assert.match(section,/title\.textContent=/);
 assert.match(section,/code\.textContent=sku/);
 assert.match(section,/status\.textContent=/);
 assert.match(section,/Показано /);
 assert.match(section,/more\.hidden=!result\.hasMore/);
});
test('gallery is responsive on narrow mobile screens',()=>{
 assert.match(css,/\.ep-front-gallery\{/);
 assert.match(css,/@media\(max-width:520px\)\{\.ep-front-gallery/);
});

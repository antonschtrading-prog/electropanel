'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
test('review queue script is loaded after evidence ledger before app',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.ok(html.indexOf('front-review-queue-v1.js')>html.indexOf('front-evidence-ledger-v1.js'));
 assert.ok(html.indexOf('front-review-queue-v1.js')<html.indexOf('src="app.js"'));
});
test('review queue is loaded once',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert.equal(html.split('src="front-review-queue-v1.js"').length-1,1);
});
test('review queue UI builds from live cabinet reconciliation',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/epCabinetArticleReconciliationV1\(state,catalogDevice\)/);
 assert.match(app,/epFrontEvidenceLedgerV1\(fresh.rows,catalogDevice,epManufacturerFrontResolveV1\)/);
});
test('review queue UI offers issue filtering',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/Очередь проверки фасадов и габаритов/);
 assert.match(app,/Требуют действий/);
 assert.match(app,/Изображение отклонено/);
 assert.match(app,/Шире DIN-места/);
});
test('review queue UI offers CSV with all filtered pages',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/Скачать очередь проверки CSV/);
 assert.match(app,/epFrontReviewQueueCsvV1/);
 assert.match(app,/page\*100<all.total/);
});
test('review queue renders item text safely',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/li.textContent=item.maker/);
 assert.doesNotMatch(app,/li.innerHTML=item.maker/);
});
test('review queue disclaims installation approval',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.match(app,/Это не разрешение на монтаж/);
});

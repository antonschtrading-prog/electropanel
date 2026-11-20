'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epCabinetOptionCompareCsvV1:csv}=require('../cabinet-option-compare-csv-v1');
const report={preference:'balanced',rows:[{id:'2x12',eligible:true,reason:'PRELIMINARY_ONLY',railCount:2,
 modulesPerRail:12,capacityModules:24,usedModules:17,reserveModules:7,freePct:29.2,
 widthMm:420,heightMm:500,areaMm2:210000,aspectRatio:0.84,crossRailLinks:2,
 unresolvedLinks:0,packingMethod:'PACKED',score:241.8}]};
test('CSV starts with BOM for Excel',()=>assert.ok(csv(report).startsWith('\uFEFF')));
test('CSV uses semicolon delimiter',()=>assert.ok(csv(report).includes(';')));
test('CSV uses CRLF',()=>assert.ok(csv(report).includes('\r\n')));
test('CSV terminates with CRLF',()=>assert.ok(csv(report).endsWith('\r\n')));
test('CSV preserves option ID',()=>assert.ok(csv(report).includes('2x12')));
test('CSV preserves priority',()=>assert.ok(csv(report).includes('balanced')));
test('CSV preserves capacity',()=>assert.ok(csv(report).includes('24')));
test('CSV preserves occupied modules',()=>assert.ok(csv(report).includes('17')));
test('CSV preserves reserve',()=>assert.ok(csv(report).includes('7')));
test('CSV preserves width',()=>assert.ok(csv(report).includes('420')));
test('CSV preserves height',()=>assert.ok(csv(report).includes('500')));
test('CSV preserves area',()=>assert.ok(csv(report).includes('210000')));
test('CSV preserves crossings',()=>assert.ok(csv(report).includes('PACKED')));
test('CSV explicitly denies approval',()=>assert.ok(csv(report).includes('"Нет"')));
test('CSV marks eligible',()=>assert.ok(csv(report).includes('"Да"')));
test('CSV includes rank',()=>assert.ok(csv(report).includes('"1"')));
test('CSV escapes spreadsheet formulas',()=>assert.ok(csv({...report,rows:[{...report.rows[0],id:'=1+1'}]}).includes("'=1+1")));
test('CSV escapes quotes',()=>assert.ok(csv({...report,rows:[{...report.rows[0],id:'a"b'}]}).includes('a""b')));
test('CSV quotes every cell',()=>assert.ok(csv(report).includes('"Ранг";"Вариант"')));
test('CSV tolerates empty report',()=>assert.equal(csv(null).split('\r\n').length,2));
test('CSV tolerates empty rows',()=>assert.equal(csv({rows:[]}).split('\r\n').length,2));
test('CSV is deterministic',()=>assert.equal(csv(report),csv(report)));
test('CSV does not mutate report',()=>{const before=JSON.stringify(report);csv(report);assert.equal(JSON.stringify(report),before)});
test('CSV includes every row',()=>assert.ok(csv({...report,rows:[...report.rows,{...report.rows[0],id:'3x12'}]}).includes('3x12')));
test('CSV ranks multiple rows sequentially',()=>assert.ok(csv({...report,rows:[...report.rows,{...report.rows[0],id:'3x12'}]}).includes('"2";"3x12"')));

test('CSV has moved apparatus column',()=>assert.ok(csv(report).includes('Перемещено аппаратов')));
test('CSV has changed DIN rail column',()=>assert.ok(csv(report).includes('Смена DIN-рейки')));
test('CSV exports actual movement count',()=>assert.ok(csv({...report,rows:[{...report.rows[0],movedDevices:3,changedRailDevices:1}]}).includes('"3";"1"')));
test('CSV does not invent unavailable movement count',()=>assert.ok(csv(report).includes('"н/д"')));

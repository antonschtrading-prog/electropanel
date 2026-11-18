'use strict';
(function(root){
 const MAX_BYTES=5*1024*1024,MAX_ROWS=10000;
 function clean(value,max=500){return String(value??'').slice(0,max)}
 function parseReport(value){
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Ожидается объект JSON');
  if(!Array.isArray(value.sourceRecords))throw Error('В файле нет sourceRecords');
  if(value.sourceRecords.length>MAX_ROWS)throw Error('Слишком много записей');
  if(value.mode!=='STAGING_ONLY'||value.engineeringApproved!==false||value.autoImportAllowed!==false)
   throw Error('Файл не является изолированным отчётом STAGING_ONLY');
  return value.sourceRecords.map((row,i)=>{
   if(!row||typeof row!=='object'||Array.isArray(row))throw Error('Некорректная запись '+i);
   if(typeof row.sku!=='string'||!row.sku.trim())throw Error('Отсутствует артикул в записи '+i);
   return {sku:clean(row.sku,100),maker:clean(row.maker,100),series:clean(row.series,100),
    kind:clean(row.kind,40),batch:clean(row.batch,80),reviewStatus:clean(row.reviewStatus,60),
    dimensionsKnown:row.dimensionsKnown===true,source:typeof row.source==='string'&&/^https:\/\//i.test(row.source)?row.source:null,
    problems:Array.isArray(row.problems)?row.problems.map(x=>clean(x,250)).slice(0,100):[],
    engineeringApproved:false,selectable:false};
  });
 }
 function filterRows(rows,{search='',kind='',maker='',blocked=false}={}){
  const q=clean(search,150).toLocaleLowerCase();
  return rows.filter(r=>(!kind||r.kind===kind)&&(!maker||r.maker===maker)&&
   (!blocked||r.reviewStatus==='BLOCKED'||r.problems.length>0)&&
   (!q||[r.sku,r.maker,r.series,r.kind,r.batch].join(' ').toLocaleLowerCase().includes(q)));
 }
 function csvCell(v){const s=String(v??'');const guarded=/^[=+@\-\t\r]/.test(s)?"'"+s:s;return '"'+guarded.replace(/"/g,'""')+'"'}
 function exportCsv(rows){return [['sku','maker','series','kind','reviewStatus','dimensionsKnown','problems','source'],
  ...rows.map(r=>[r.sku,r.maker,r.series,r.kind,r.reviewStatus,r.dimensionsKnown,r.problems.join('; '),r.source])]
  .map(r=>r.map(csvCell).join(',')).join('\r\n')+'\r\n'}
 if(typeof module==='object'&&module.exports)module.exports={parseReport,filterRows,csvCell,exportCsv,MAX_BYTES};
 if(!root.document)return;
 const doc=root.document,byId=id=>doc.getElementById(id);
 let all=[],visible=[],loaded=false;
 function option(select,values){while(select.options.length>1)select.remove(1);for(const v of [...new Set(values)].filter(Boolean).sort()){const el=doc.createElement('option');el.value=v;el.textContent=v;select.appendChild(el)}}
 function td(tr,value){const el=doc.createElement('td');el.textContent=value;tr.appendChild(el);return el}
 function render(){
  visible=filterRows(all,{search:byId('search').value,kind:byId('kind').value,maker:byId('maker').value,blocked:byId('blocked').checked});
  byId('counts').textContent=loaded?'Показано '+visible.length+' из '+all.length+' · все записи не утверждены':'Данные не загружены.';
  byId('export').disabled=!loaded;
  const body=byId('rows');body.replaceChildren();
  for(const r of visible.slice(0,500)){
   const tr=doc.createElement('tr');td(tr,r.sku);td(tr,r.maker);td(tr,r.series);td(tr,r.kind);
   td(tr,r.reviewStatus);td(tr,r.dimensionsKnown?'Указаны':'Неполные');
   const linkCell=doc.createElement('td');
   if(r.source){const a=doc.createElement('a');a.textContent='Документ';a.href=r.source;a.target='_blank';a.rel='noopener noreferrer';linkCell.appendChild(a)}
   tr.appendChild(linkCell);
   const action=doc.createElement('td'),button=doc.createElement('button');button.textContent='Открыть';button.type='button';
   button.addEventListener('click',()=>{byId('detail').textContent=['Артикул: '+r.sku,'Изготовитель: '+r.maker,'Серия: '+r.series,
    'Тип: '+r.kind,'Партия: '+r.batch,'Статус: '+r.reviewStatus,'Габариты: '+(r.dimensionsKnown?'указаны':'неполные'),
    'Причины: '+(r.problems.join(', ')||'не указаны'),'Допуск к проектированию: НЕТ'].join('\n')});
   action.appendChild(button);tr.appendChild(action);body.appendChild(tr);
  }
  if(visible.length>500)byId('counts').textContent+=' · отображены первые 500; экспорт содержит все отфильтрованные';
 }
 byId('file').addEventListener('change',async e=>{
  const file=e.target.files&&e.target.files[0];if(!file)return;
  loaded=false;all=[];byId('detail').textContent='';byId('status').textContent='';render();
  try{if(file.size>MAX_BYTES)throw Error('Размер файла превышает 5 МБ');
   const data=JSON.parse(await file.text());all=parseReport(data);loaded=true;
   option(byId('kind'),all.map(x=>x.kind));option(byId('maker'),all.map(x=>x.maker));
   byId('search').value='';byId('kind').value='';byId('maker').value='';byId('blocked').checked=false;
   byId('status').textContent='Отчёт загружен локально';render();
  }catch(err){byId('status').textContent='Ошибка: '+err.message;render()}
 });
 for(const id of ['search','kind','maker','blocked'])byId(id).addEventListener('input',render);
 byId('export').addEventListener('click',()=>{
  if(!loaded)return;const blob=new Blob(['\ufeff'+exportCsv(visible)],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=doc.createElement('a');a.href=url;a.download='electropanel-staging-review.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
})(typeof globalThis==='object'?globalThis:this);
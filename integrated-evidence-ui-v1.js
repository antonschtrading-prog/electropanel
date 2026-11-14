'use strict';
function epIntegratedEvidenceHtmlV1(review){
 const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 if(!review||!Array.isArray(review.issues))return '<section class="panel compact"><h3>Инженерный контроль недоступен</h3></section>';
 const blocked=review.issues.filter(i=>i.status==='BLOCKED');
 const unknown=review.issues.filter(i=>i.status!=='BLOCKED');
 const items=review.issues.slice(0,80).map(i=>'<li><strong>'+escape(i.scope||'project')+'</strong> · '+escape(i.id||i.entity||'—')+' · '+escape(i.code||'UNKNOWN')+'</li>').join('');
 return '<section class="panel compact" aria-label="Интегрированный инженерный контроль">'+
  '<h3>Инженерная проверка проекта · черновик</h3>'+
  '<p>Блокирующих замечаний: <b>'+blocked.length+'</b>; недостаточно данных: <b>'+unknown.length+'</b>. '+
  'Это предварительный контроль, не подтверждение нормативного соответствия.</p>'+
  '<details><summary>Замечания ('+review.issues.length+')</summary><ul>'+items+'</ul></details>'+
  '</section>';
}
if(typeof module!=='undefined'&&module.exports)module.exports={epIntegratedEvidenceHtmlV1};

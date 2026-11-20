'use strict';
// Read-only UI panel. Never changes project state or grants installation approval.
function epEngineeringDiagnosticsPanelV1(project, lookupSku){
 const gate=typeof epEngineeringGateV1==='function'
  ?epEngineeringGateV1(project,lookupSku)
  :{status:'UNKNOWN',issues:[{origin:'runtime',code:'ENGINEERING_GATE_MISSING',level:'UNKNOWN'}],
    engineeringApproved:false,ready_for_installation:false};
 const safe=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const rows=gate.issues.slice(0,100).map(i=>
  '<li><strong>'+safe(i.level)+'</strong> · '+safe(i.origin)+' · '+safe(i.code)+'</li>').join('');
 return '<section class="ep-engineering-diagnostics" role="region" aria-label="Инженерная диагностика">'
  +'<h3>Инженерная диагностика · черновик</h3>'
  +'<p>Статус: <strong>'+safe(gate.status)+'</strong>. Монтаж не подтверждён.</p>'
  +'<p>Проверка только объявленных данных; не заменяет расчёты и нормативную экспертизу.</p>'
  +'<ul>'+rows+'</ul>'
  +(gate.issues.length>100?'<p>Показаны первые 100 замечаний.</p>':'')
  +'</section>';
}
if(typeof module!=='undefined'&&module.exports)module.exports={epEngineeringDiagnosticsPanelV1};

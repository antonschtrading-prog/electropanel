'use strict';
// Draft wire-connection diagram: draws only explicit engineer-supplied endpoints and wires.
const epFireWiringModuleV1=typeof module!=='undefined'&&typeof require==='function'?require('./fire-control-wiring-v1'):null;
function epFireControlWiringDiagramV1(project){
 const engine=typeof epFireControlWiringV1==='function'?epFireControlWiringV1:epFireWiringModuleV1?.epFireControlWiringV1;
 if(typeof engine!=='function')throw Error('FIRE_WIRING_DIAGRAM_ENGINE_MISSING');
 const report=engine(project);
 if(report.status==='NOT_CONFIGURED')return {schema:'electropanel.fire.wiring-diagram.1',status:'NOT_CONFIGURED',svg:'',engineeringApproved:false,ready_for_installation:false};
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
 const connections=report.connections.filter(c=>c.from&&c.to);
 const max=100;
 const shown=connections.slice(0,max);
 const height=135+shown.length*72;
 const rows=shown.map((c,i)=>{
  const y=105+i*72;
  return '<g><rect x="15" y="'+(y-27)+'" width="290" height="47" rx="4" fill="#f1f5f9" stroke="#94a3b8"/>'+
   '<rect x="690" y="'+(y-27)+'" width="290" height="47" rx="4" fill="#f1f5f9" stroke="#94a3b8"/>'+
   '<text x="24" y="'+y+'" font-size="12" fill="#0f172a">'+esc(c.from.slice(0,42))+'</text>'+
   '<text x="700" y="'+y+'" font-size="12" fill="#0f172a">'+esc(c.to.slice(0,42))+'</text>'+
   '<path d="M305 '+(y-4)+' L690 '+(y-4)+'" stroke="#2563eb" stroke-width="2"/>'+
   '<text x="355" y="'+(y-12)+'" font-size="12" fill="#0f172a">'+esc(c.wireReference)+' · '+esc(c.purpose)+'</text>'+
   '<title>'+esc(c.id+' '+c.verifiedSource)+'</title></g>';
 });
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="'+height+'" viewBox="0 0 1000 '+height+'" role="img" aria-label="Черновая ведомость электрических соединений">'+
  '<rect width="100%" height="100%" fill="#fff"/>'+
  '<text x="16" y="27" font-size="18" font-weight="bold" fill="#0f172a">CONTROL WIRING · DECLARED CONNECTIONS</text>'+
  '<text x="16" y="48" font-size="12" fill="#b42318">DRAFT ONLY · NOT FOR INSTALLATION · CONTINUITY UNVERIFIED</text>'+
  '<text x="16" y="65" font-size="11" fill="#475569">Shown '+shown.length+' of '+connections.length+' valid endpoint pairs</text>'+
  rows.join('')+'</svg>';
 return {schema:'electropanel.fire.wiring-diagram.1',status:report.status,svg,displayed:shown.length,total:connections.length,
  truncated:connections.length>max,issues:report.issues,engineeringApproved:false,ready_for_installation:false};
}
if(typeof module!=='undefined')module.exports={epFireControlWiringDiagramV1};

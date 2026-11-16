'use strict';
// SVG logical interface diagram, deliberately not an installation-ready point-to-point wiring diagram.
function epFireControlDiagramV1(project){
 if(typeof epFireControlTopologyV1!=='function')throw Error('FIRE_DIAGRAM_TOPOLOGY_MISSING');
 const topology=epFireControlTopologyV1(project);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
 if(topology.status==='NOT_CONFIGURED')return {schema:'electropanel.fire.diagram.1',status:'NOT_CONFIGURED',svg:'',issues:[],engineeringApproved:false};
 const nodes=topology.nodes.filter(n=>['EXTERNAL_SIGNAL','COMMAND','ACTUATOR','CONSUMER','CONTROL_SUPPLY','TERMINAL'].includes(n.kind));
 const kinds=['EXTERNAL_SIGNAL','COMMAND','ACTUATOR','CONSUMER','CONTROL_SUPPLY','TERMINAL'];
 const layout=new Map(),counts=new Map();
 const width=1200,rowHeight=70,top=105;
 const positions={EXTERNAL_SIGNAL:40,COMMAND:240,ACTUATOR:450,CONSUMER:665,CONTROL_SUPPLY:875,TERMINAL:1040};
 for(const node of nodes){
  const idx=counts.get(node.kind)||0;counts.set(node.kind,idx+1);
  layout.set(node.id,{x:positions[node.kind],y:top+idx*rowHeight});
 }
 const maxRows=Math.max(1,...counts.values()),height=Math.min(150000,Math.max(280,top+maxRows*rowHeight+80));
 const lines=[];
 for(const edge of topology.edges){
  if(!layout.has(edge.from)||!layout.has(edge.to))continue;
  const a=layout.get(edge.from),b=layout.get(edge.to);
  const fromX=a.x+155,toX=b.x,fromY=a.y+20,toY=b.y+20;
  const midX=(fromX+toX)/2;
  const d='M '+fromX+' '+fromY+' L '+midX+' '+fromY+' L '+midX+' '+toY+' L '+toX+' '+toY;
  lines.push('<path d="'+d+'" fill="none" stroke="#6a8499" stroke-width="1.5" stroke-dasharray="'+(edge.kind.startsWith('LOGICAL')?'5 4':'none')+'"><title>'+esc(edge.kind+' '+edge.id)+'</title></path>');
 }
 const boxes=nodes.map(n=>{
  const p=layout.get(n.id);
  const fill=n.kind==='EXTERNAL_SIGNAL'?'#e7effa':n.kind==='ACTUATOR'?'#e6f4ea':n.kind==='CONSUMER'?'#fff1dc':'#eef0f3';
  return '<g><rect x="'+p.x+'" y="'+p.y+'" width="155" height="42" rx="5" fill="'+fill+'" stroke="#60717e"/>'+
   '<text x="'+(p.x+7)+'" y="'+(p.y+16)+'" font-size="10" fill="#334155">'+esc(n.kind)+'</text>'+
   '<text x="'+(p.x+7)+'" y="'+(p.y+31)+'" font-size="12" fill="#101827">'+esc(String(n.label).slice(0,21))+'</text>'+
   '<title>'+esc(n.id+' | '+n.label)+'</title></g>';
 });
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+'" viewBox="0 0 '+width+' '+height+'" role="img" aria-label="Черновая логическая схема пожарного интерфейса">'+
 '<rect width="100%" height="100%" fill="#fff"/><text x="24" y="30" font-size="19" font-weight="bold" fill="#101827">FIRE CONTROL · LOGICAL INTERFACE DRAFT</text>'+
 '<text x="24" y="53" font-size="12" fill="#b42318">NOT FOR INSTALLATION · NO MANUFACTURER PIN OR CONTACT WIRING IMPLIED</text>'+
 lines.join('')+boxes.join('')+'</svg>';
 return {schema:'electropanel.fire.diagram.1',status:topology.status,svg,nodes:nodes.length,edges:lines.length,
  issues:topology.issues,engineeringApproved:false,ready_for_installation:false};
}
if(typeof module!=='undefined')module.exports={epFireControlDiagramV1};

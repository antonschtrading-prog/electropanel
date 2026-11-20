'use strict';
// Exportable draft wire schedule. No terminal pin mapping or contact wiring is inferred.
function epFireControlCsvV1(project){
 if(typeof epFireControlScheduleV1!=='function')throw Error('FIRE_CSV_SCHEDULE_MISSING');
 const report=epFireControlScheduleV1(project);
 const quote=x=>'"'+String(x??'').replace(/"/g,'""').replace(/^[=+@\-]/,'\u0027$&')+'"';
 const rows=[['action_id','signal_id','zone_id','consumer_id','circuit_id','command','actuator','control_supply_id','control_voltage_v','wire_reference','state']];
 for(const row of report.circuits||[])rows.push([row.id,row.signalId,row.zoneId,row.consumerId,row.circuitId,row.command,row.actuator,row.controlSupplyId,row.controlVoltageV,row.wireReference,row.connectionState]);
 return {schema:'electropanel.fire.csv.1',status:report.status,csv:rows.map(r=>r.map(quote).join(';')).join('\r\n')+'\r\n',
  issues:report.issues,engineeringApproved:false,ready_for_installation:false};
}
function epFireControlBomCsvV1(project){
 const report=epFireControlScheduleV1(project);
 const quote=x=>'"'+String(x??'').replace(/"/g,'""').replace(/^[=+@\-]/,'\u0027$&')+'"';
 const rows=[['article_sku','actuator','quantity','engineer_reviewed_quantity']];
 for(const row of report.preliminaryBom||[])rows.push([row.articleSku,row.actuator,row.quantity,row.reviewedQuantity]);
 return {schema:'electropanel.fire.bom.csv.1',status:report.status,csv:rows.map(r=>r.map(quote).join(';')).join('\r\n')+'\r\n',
  issues:report.issues,engineeringApproved:false,ready_for_installation:false};
}

function epFireControlChecklistCsvV1(project){
 if(typeof epFireControlChecklistV1!=='function')throw Error('FIRE_CHECKLIST_ENGINE_MISSING');
 const report=epFireControlChecklistV1(project);
 const quote=x=>'"'+String(x??'').replace(/"/g,'""').replace(/^[=+@\\-]/,"'"+'$&')+'"';
 const rows=[['criterion','section','object_id','status','requirement']];
 for(const item of report.checks)rows.push([item.code,item.scope,item.objectId,item.status,item.detail]);
 return {schema:'electropanel.fire.checklist.csv.1',status:report.status,
  csv:rows.map(row=>row.map(quote).join(';')).join('\r\n')+'\r\n',
  passed:report.passed,total:report.total,engineeringApproved:false,ready_for_installation:false};
}

function epFireControlTopologyCsvV1(project){
 const engine=typeof epFireControlTopologyV1==='function'?epFireControlTopologyV1:typeof require==='function'?require('./fire-control-topology-v1').epFireControlTopologyV1:null;
 if(typeof engine!=='function')throw Error('FIRE_TOPOLOGY_ENGINE_MISSING');
 const graph=engine(project);
 const quote=x=>'"'+String(x??'').replace(/"/g,'""').replace(/^[=+@-]/,v=>"'"+v)+'"';
 const rows=[['edge_id','relation','from_node','to_node','control_voltage_v']];
 for(const edge of graph.edges)rows.push([edge.id,edge.kind,edge.from,edge.to,edge.controlVoltageV??null]);
 return {schema:'electropanel.fire.topology.csv.1',status:graph.status,
  csv:rows.map(row=>row.map(quote).join(';')).join('\r\n')+'\r\n',
  issues:graph.issues,engineeringApproved:false,ready_for_installation:false};
}

function epFireControlDeclaredWiresCsvV1(project){
 const engine=typeof epFireControlWiringV1==='function'?epFireControlWiringV1:typeof require==='function'?require('./fire-control-wiring-v1').epFireControlWiringV1:null;
 if(typeof engine!=='function')throw Error('FIRE_DECLARED_WIRING_ENGINE_MISSING');
 const report=engine(project);
 const quote=x=>'"'+String(x??'').replace(/"/g,'""').replace(/^[=+@-]/,v=>"'"+v)+'"';
 const rows=[['wire_id','wire_reference','action_id','from','to','purpose','section_mm2','material','color','evidence_source','reviewed']];
 for(const w of report.connections)rows.push([w.id,w.wireReference,w.actionId,w.from,w.to,w.purpose,w.conductor?.sectionMm2,w.conductor?.material,w.conductor?.color,w.verifiedSource,w.reviewed]);
 return {schema:'electropanel.fire.declared-wires.csv.1',status:report.status,
  csv:rows.map(r=>r.map(quote).join(';')).join('\r\n')+'\r\n',
  issues:report.issues,engineeringApproved:false,ready_for_installation:false};
}

function epFireControlContinuityCsvV1(project){
 const engine=typeof epFireControlContinuityV1==='function'?epFireControlContinuityV1:typeof require==='function'?require('./fire-control-continuity-v1').epFireControlContinuityV1:null;
 if(typeof engine!=='function')throw Error('FIRE_CONTINUITY_ENGINE_MISSING');
 const report=engine(project);
 const quote=x=>'"'+String(x??'').replace(/"/g,'""').replace(/^[=+@-]/,v=>"'"+v)+'"';
 const rows=[['action_id','wire_count','node_count','component_count','supply_ids','signal_ids','reachable_pins','unreachable_pins','dangling_nodes','declared_return','declared_protection','declared_interlock','connectivity_verified']];
 for(const a of report.actions)rows.push([a.actionId,a.wireCount,a.nodeCount,a.componentCount,a.supplies.join(','),a.signals.join(','),a.reachablePins.join(','),a.unreachablePins.join(','),a.dangling.join(','),a.hasDeclaredReturn,a.hasDeclaredProtection,a.hasDeclaredInterlock,a.connectivityVerified]);
 return {schema:'electropanel.fire.continuity.csv.1',status:report.status,
  csv:rows.map(r=>r.map(quote).join(';')).join('\r\n')+'\r\n',
  issues:report.issues,engineeringApproved:false,ready_for_installation:false};
}
if(typeof module!=='undefined')module.exports={epFireControlCsvV1,epFireControlBomCsvV1,epFireControlChecklistCsvV1,epFireControlTopologyCsvV1,epFireControlDeclaredWiresCsvV1,epFireControlContinuityCsvV1};

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
if(typeof module!=='undefined')module.exports={epFireControlCsvV1,epFireControlBomCsvV1};

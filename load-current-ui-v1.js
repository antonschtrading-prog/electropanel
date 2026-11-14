'use strict';
function epLoadCurrentHtmlV1(project,selectedId){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const line=project?.lines?.find(x=>x?.id===selectedId)||project?.lines?.[0];
 if(!line)return '<p>Выберите цепь для расчёта тока нагрузки.</p>';
 const record=line.loadCurrentCalculation||{},values=record.inputs||{};
 const value=(key,fallback)=>esc(values[key]??fallback);
 const mode=record.mode||(line.phase==='3Ф'?'three_phase':'single_phase');
 const options='<option value="single_phase"'+(mode==='single_phase'?' selected':'')+'>1 фаза · U L–N</option>'+
  '<option value="three_phase"'+(mode==='three_phase'?' selected':'')+'>3 фазы · U L–L</option>';
 return '<details class="ep-load-current"><summary>Калькулятор Ib · '+esc(line.name||line.id)+
  (record.stale?' · ТРЕБУЕТ ПЕРЕСЧЁТА':record.ibA?' · '+esc(record.roundedIbA)+' А':' · не рассчитан')+'</summary>'+
  '<p>Укажите все параметры явно. Результат сохраняется как расчётный Ib, остальные исходные токи не изменяются.</p>'+
  '<form data-load-current-form="'+esc(line.id)+'"><div class="ep-load-current-fields">'+
  '<label>Схема питания<select name="mode">'+options+'</select></label>'+
  '<label>Мощность, кВт<input name="powerKw" inputmode="decimal" required value="'+value('powerKw',line.powerKw??line.power??'')+'"></label>'+
  '<label>Напряжение, В<input name="voltageV" inputmode="decimal" required value="'+value('voltageV','')+'" placeholder="Укажите U"></label>'+
  '<label>cos φ<input name="powerFactor" inputmode="decimal" required value="'+value('powerFactor','')+'" placeholder="0…1"></label>'+
  '<label>КПД η<input name="efficiency" inputmode="decimal" required value="'+value('efficiency','')+'" placeholder="0…1"></label>'+
  '<label>Коэффициент спроса<input name="demandFactor" inputmode="decimal" required value="'+value('demandFactor','')+'" placeholder="0…1"></label>'+
  '<label><input type="checkbox" name="linkCircuitPower"'+(record.powerSource==='circuit'?' checked':'')+'> Использовать мощность цепи и автоматически пересчитывать Ib</label>'+
  '<button class="btn" type="submit">Рассчитать и записать Ib</button></div></form>'+
  (record.formula?'<p>Формула: <code>'+esc(record.formula)+'</code>. Расчётное значение: '+esc(record.ibA)+' А. Требуется проверка применимости исходных данных.</p>':'')+
  '<p>Для трёхфазного режима предполагается симметричная нагрузка. Пусковые токи, гармоники и специальные режимы учитываются отдельно.</p></details>';
}
if(typeof module!=='undefined'&&module.exports)module.exports={epLoadCurrentHtmlV1};

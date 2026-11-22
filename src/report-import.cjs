'use strict';
const {criteriaFor}=require('./evaluation.cjs');
function decodeCsv(text){
 if(typeof text!=='string'||text.length>250000)throw new Error('CSV demasiado grande');
 const rows=[];let row=[],cell='',quoted=false;
 text=text.replace(/^\uFEFF/,'');
 for(let i=0;i<text.length;i++){
  const ch=text[i];
  if(ch==='"'){
   if(quoted&&text[i+1]==='"'){cell+='"';i++}
   else quoted=!quoted;
  }else if(ch===';'&&!quoted){row.push(cell);cell=''}
  else if((ch==='\n'||ch==='\r')&&!quoted){
   if(ch==='\r'&&text[i+1]==='\n')i++;
   row.push(cell);
   if(row.some(x=>x.trim()!==''))rows.push(row);
   row=[];cell='';
  }else cell+=ch;
 }
 if(quoted)throw new Error('CSV con comillas sin cerrar');
 row.push(cell);if(row.some(x=>x.trim()!==''))rows.push(row);
 return rows.filter(r=>!(r.length===2&&r[0].toLowerCase()==='sep='&&r[1]==='')&&!/^sep=/.test(r[0]));
}
function normal(s){
 return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
}
function parseGradesCsv(text){
 const records=decodeCsv(text);
 if(records.length<2)throw new Error('CSV sin filas de calificación');
 const heads=records[0].map(normal);
 const ceIndex=heads.findIndex(x=>x==='ce'||x==='criterio');
 const scoreIndex=heads.findIndex(x=>x==='nota sobre 10'||x==='nota');
 if(ceIndex<0||scoreIndex<0)throw new Error('Formato de resultados CSV no reconocido');
 const instrument=heads.includes('puntos netos')?'prueba_objetiva':'portafolio';
 const grades=[];const visited=new Set();let ra=null;
 for(const row of records.slice(1)){
  const raw=String(row[ceIndex]||'').trim();
  if(/^total$/i.test(raw))continue;
  const m=/^(?:RA)?([1-7])\.([a-j])$/i.exec(raw);
  if(!m)throw new Error('Código de criterio desconocido: '+raw);
  const criterion='RA'+m[1]+'.'+m[2].toLowerCase();
  const currentRa='RA'+m[1];
  if(ra&&ra!==currentRa)throw new Error('CSV mezcla criterios de distintos RA');
  ra=currentRa;
  if(!criteriaFor(ra).some(c=>c.id===criterion))throw new Error('CE fuera de currículo: '+criterion);
  if(visited.has(criterion))throw new Error('CE duplicado: '+criterion);
  visited.add(criterion);
  const rawScore=String(row[scoreIndex]??'').trim();
  if(!/^\d{1,2}(?:[,.]\d{1,3})?$/.test(rawScore))throw new Error('Nota inválida para '+criterion);
  const score=Number(rawScore.replace(',','.'));
  if(!Number.isFinite(score)||score<0||score>10)throw new Error('Nota fuera de rango: '+criterion);
  grades.push({ce:criterion,score});
 }
 if(!ra||grades.length===0)throw new Error('No se han encontrado criterios');
 const expected=criteriaFor(ra).map(c=>c.id);
 if(grades.length!==expected.length||expected.some(c=>!visited.has(c)))throw new Error('Faltan notas de criterios del '+ra);
 return {ra,instrument,grades};
}
module.exports={decodeCsv,parseGradesCsv};

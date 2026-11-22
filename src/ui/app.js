'use strict';
const $=s=>document.querySelector(s);
let units=[],selection='';
const alerts=(msg,good=false)=>{const node=$('#alert');node.hidden=!msg;node.textContent=msg||'';node.style.background=good?'#e8f8ec':'#fef1e3';node.style.color=good?'#155f39':'#925c1d'};
function resources(u){return [u.portfolio,...u.exams]}
function buildSelect(u){
 const select=$('#resource');select.replaceChildren();
 for(const r of resources(u)){const o=document.createElement('option');o.value=r.id;o.textContent=(r.kind==='portfolio'?'Portafolio':'Prueba objetiva '+r.questions+' preguntas')+(r.available?'':' · sin importar');select.append(o)}
 selection=u.id;
}
function render(){
 const host=$('#units');host.replaceChildren();
 for(const u of units){
  const card=document.createElement('button');card.type='button';card.className='unit'+(selection===u.id?' selected':'');
  const id=document.createElement('span');id.className='id';id.textContent=u.id+' · '+u.ra;
  const title=document.createElement('h3');title.textContent=u.title;
  const desc=document.createElement('p');desc.textContent=u.activities+' actividades · '+u.weights.length+' criterios';
  const available=resources(u).filter(r=>r.available).length;
  const status=document.createElement('span');status.className='status'+(available===resources(u).length?' ready':'');status.textContent=available+'/'+resources(u).length+' recursos importados';
  card.append(id,title,desc,status);card.addEventListener('click',()=>{buildSelect(u);render()});host.append(card);
 }
}
async function init(){
 try{
  const data=await window.epe.catalog();units=data.units||[];
  $('#key-status').textContent=data.publicKeyConfigured?'Clave pública docente configurada.':'Falta configurar la clave pública del profesor antes de desbloquear recursos.';
  if(units.length)buildSelect(units[0]);render();
 }catch(e){alerts('No se pudo abrir el catálogo: '+e.message)}
}
$('#launch').addEventListener('click',async()=>{
 const studentId=$('#student').value.trim(),resourceId=$('#resource').value,code=$('#token').value.trim();
 alerts('');
 try{const result=await window.epe.launch({studentId,resourceId,code});alerts(result.ok?'Recurso autorizado y abierto.':result.error,!!result.ok)}
 catch(e){alerts('No se pudo abrir: '+e.message)}
});
$('#summary').addEventListener('click',async()=>{
 const id=$('#student').value.trim();const result=await window.epe.summary(id);
 if(!result.ok){alerts(result.error);return}
 $('#results').hidden=false;const target=$('#report');target.replaceChildren();
 const table=document.createElement('table');const hdr=document.createElement('tr');
 for(const name of ['RA','Calificación','Criterios pendientes','Sin evaluar']){const t=document.createElement('th');t.textContent=name;hdr.append(t)}table.append(hdr);
 for(const item of result.ra){const tr=document.createElement('tr');for(const value of [item.ra,item.grade===null?'No cerrada':item.grade.toFixed(2)+' / 10',item.pending.join(', ')||'Ninguno',item.notEvaluated.join(', ')||'Ninguno']){const td=document.createElement('td');td.textContent=value;tr.append(td)}table.append(tr)}target.append(table);
 $('#results').scrollIntoView({behavior:'smooth',block:'start'});
});
init();

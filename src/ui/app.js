'use strict';
const $=s=>document.querySelector(s);
const $id=id=>document.getElementById(id);
let units=[],selection='',teacherConfigured=false,teacherUnlocked=false;
const alertUser=(msg,good=false)=>{
 const n=$id('alert');n.hidden=!msg;n.textContent=msg||'';
 n.style.background=good?'#e8f8ec':'#fef1e3';
 n.style.color=good?'#155f39':'#925c1d';
 if(msg)n.scrollIntoView({block:'nearest'});
};
const resources=u=>[u.portfolio,...u.exams];
function fillSelect(select,options){
 select.replaceChildren();
 for(const [value,label] of options){const op=document.createElement('option');op.value=value;op.textContent=label;select.append(op)}
}
function buildResourceSelect(u){
 fillSelect($id('resource'),resources(u).map(r=>[r.id,
  (r.kind==='portfolio'?'Portafolio':'Prueba objetiva · '+r.questions+' preguntas')+(r.available?'':' · aún sin importar')]));
 selection=u.id;
}
function renderUnits(){
 const host=$id('units');host.replaceChildren();
 for(const u of units){
  const button=document.createElement('button');button.type='button';
  button.className='unit'+(selection===u.id?' selected':'');
  const id=document.createElement('span');id.className='id';id.textContent=u.id+' · '+u.ra;
  const h=document.createElement('h3');h.textContent=u.title;
  const p=document.createElement('p');p.textContent=u.activities+' actividades · '+u.weights.length+' criterios';
  const ready=resources(u).filter(r=>r.available).length;
  const status=document.createElement('span');status.className='status'+(ready===resources(u).length?' ready':'');
  status.textContent=ready+'/'+resources(u).length+' recursos importados';
  button.append(id,h,p,status);
  button.addEventListener('click',()=>{buildResourceSelect(u);renderUnits()});
  host.append(button);
 }
}
function fillCriteria(){
 const raOpts=units.map(u=>[u.ra,u.ra+' · '+u.title]);
 fillSelect($id('teacherRA'),raOpts);
 const ce=units.flatMap(u=>u.weights.map((_,i)=>[u.ra+'.'+String.fromCharCode(97+i),u.ra+'.'+String.fromCharCode(97+i)]));
 fillSelect($id('teacherCE'),ce);
}
function showTeacher(){
 $id('teacherAuthArea').hidden=teacherUnlocked;
 $id('teacherWork').hidden=!teacherUnlocked;
 $id('teacherAuth').textContent=teacherConfigured?'Acceder como profesor':'Configurar contraseña docente';
 $id('teacherAuthMsg').textContent=teacherConfigured
 ?'Introduzca la contraseña del perfil docente. Solo se almacenará una huella criptográfica.'
 :'Primer acceso: establezca una contraseña docente de 14 caracteres o más antes de entregar el programa al alumnado.';
}
async function updateTeacherStatus(){
 const status=await window.epe.teacherStatus();
 teacherConfigured=status.configured;teacherUnlocked=status.unlocked;
 showTeacher();
}
async function studentLaunch(){
 try{
  const result=await window.epe.launch({
   studentId:$id('student').value.trim(),resourceId:$id('resource').value,
   code:$id('token').value.trim()});
  alertUser(result.ok?'Recurso abierto correctamente.':result.error,!!result.ok);
 }catch(e){alertUser('Error de acceso: '+e.message)}
}
async function authenticateTeacher(){
 try{
  const password=$id('teacherPass').value;
  if(!teacherConfigured){await window.epe.teacherSetup(password);teacherConfigured=true}
  else await window.epe.teacherLogin(password);
  teacherUnlocked=true;$id('teacherPass').value='';
  showTeacher();alertUser('Sesión docente iniciada.',true);
 }catch(e){alertUser('No se pudo iniciar sesión: '+e.message)}
}
function makeCell(value,header=false){
 const el=document.createElement(header?'th':'td');
 el.textContent=String(value??'');return el;
}
function renderTeacherReport(payload){
 const host=$id('teacherResults');host.replaceChildren();
 const h=document.createElement('h3');h.textContent='Expediente de '+payload.studentId;
 host.append(h);
 const table=document.createElement('table');
 const head=document.createElement('tr');
 for(const label of ['RA','Nota vigente','CE pendientes','Sin evaluar'])head.append(makeCell(label,true));
 table.append(head);
 for(const item of payload.ra){
  const tr=document.createElement('tr');
  for(const value of [item.ra,item.grade===null?'Sin cerrar':item.grade.toFixed(2),
   item.pending.join(', ')||'Ninguno',item.notEvaluated.join(', ')||'Ninguno'])tr.append(makeCell(value));
  table.append(tr);
 }
 host.append(table);
 const title=document.createElement('h3');title.textContent='Detalle por criterio de evaluación';
 host.append(title);
 const detail=document.createElement('table');
 const dh=document.createElement('tr');
 for(const k of ['CE','Peso','Nota','Estado'])dh.append(makeCell(k,true));
 detail.append(dh);
 for(const ra of payload.ra)for(const c of ra.criteria){
  const tr=document.createElement('tr');
  for(const value of [c.id,c.weight+' %',c.score===null?'—':c.score.toFixed(2),c.status])tr.append(makeCell(value));
  detail.append(tr);
 }
 host.append(detail);
 const rec=document.createElement('p');rec.className='small';
 rec.textContent='Recuperaciones asignadas: '+payload.recoveries.length+
  ' · Evidencias calificadas conservadas en el historial: '+payload.history.length;
 host.append(rec);
}
async function refreshSummary(){
 try{
  const studentId=$id('teacherStudent').value.trim();
  const payload=await window.epe.teacherSummary(studentId);
  renderTeacherReport(payload);alertUser('Expediente actualizado.',true);
 }catch(e){alertUser('No se pudo consultar: '+e.message)}
}
async function teacherRecord(){
 try{
  const scoreText=$id('teacherGrade').value.replace(',','.');
  const response=await window.epe.teacherRecord({
   studentId:$id('teacherStudent').value.trim(),
   ce:$id('teacherCE').value,score:scoreText,
   instrument:$id('teacherInstrument').value,mode:$id('teacherMode').value,
   note:$id('teacherNote').value.trim()
  });
  alertUser('Calificación registrada y validada. Registro nº '+response.recordId,true);
  await refreshSummary();
 }catch(e){alertUser('No se pudo registrar la nota: '+e.message)}
}
async function assignRecovery(){
 try{
  const studentId=$id('teacherStudent').value.trim(),ra=$id('teacherRA').value;
  const quantity=Number($id('teacherActivities').value);
  if(!window.confirm('¿Asignar los CE evaluados y pendientes de '+ra+' al alumno '+studentId+'?'))return;
  const result=await window.epe.teacherAssign({
   studentId,ra,activitiesPerCriterion:quantity,
   teacherNote:$id('teacherRecoveryNote').value.trim()
  });
  alertUser(result.assigned+' recuperaciones nuevas asignadas. Las notas ordinarias se conservan.',true);
  await refreshSummary();
 }catch(e){alertUser('No se pudo asignar la recuperación: '+e.message)}
}
async function createCode(){
 try{
  const secret=$id('teacherKeyPass').value;
  const result=await window.epe.teacherIssue({
   studentId:$id('teacherStudent').value.trim(),
   resourceId:$id('resource').value,
   hours:Number($id('teacherHours').value),passphrase:secret
  });
  $id('teacherKeyPass').value='';
  if(result.cancelled)return;
  $id('teacherIssuedCode').value=result.code;
  alertUser('Autorización emitida hasta '+new Date(result.expiresAt).toLocaleString('es-ES')+'.',true);
 }catch(e){$id('teacherKeyPass').value='';alertUser('No se pudo emitir el código: '+e.message)}
}
async function init(){
 try{
  const data=await window.epe.catalog();units=data.units||[];
  $id('key-status').textContent=data.publicKeyConfigured
   ?'Clave pública de autorizaciones configurada.'
   :'No se ha incorporado la clave pública del profesor. Los códigos aún no se podrán validar.';
  if(units.length)buildResourceSelect(units[0]);
  renderUnits();fillCriteria();await updateTeacherStatus();
 }catch(e){alertUser('No se pudo iniciar la aplicación: '+e.message)}
}
$id('launch').addEventListener('click',studentLaunch);
$id('teacherAuth').addEventListener('click',authenticateTeacher);
$id('teacherLogout').addEventListener('click',async()=>{
 await window.epe.teacherLogout();teacherUnlocked=false;showTeacher();$id('teacherResults').replaceChildren();
 alertUser('Sesión docente cerrada.',true);
});
$id('teacherSummary').addEventListener('click',refreshSummary);
$id('teacherSaveGrade').addEventListener('click',teacherRecord);
$id('teacherAssign').addEventListener('click',assignRecovery);
$id('teacherCreateCode').addEventListener('click',createCode);
init();

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
function updateTeacherScope(){
 const id=$id('resource').value;
 const u=units.find(x=>resources(x).some(r=>r.id===id));
 const item=u?resources(u).find(r=>r.id===id):null;
 if(!u||!item)return;
 const isPortfolio=item.kind==='portfolio';
 const scope=$id('teacherScope');
 for(const option of scope.options)option.disabled=!isPortfolio&&option.value!=='recurso';
 if(!isPortfolio&&scope.value!=='recurso')scope.value='recurso';
 fillSelect($id('teacherScopeCE'),u.weights.map((_,i)=>{
  const ce=u.ra+'.'+String.fromCharCode(97+i);return [ce,ce];
 }));
 const per=u.activities/u.weights.length;
 $id('teacherScopeIndex').max=String(per);
 if(Number($id('teacherScopeIndex').value)>per)$id('teacherScopeIndex').value=String(per);
 $id('teacherScopeCE').disabled=!['criterio','actividad'].includes(scope.value);
 $id('teacherScopeIndex').disabled=scope.value!=='actividad';
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
  button.addEventListener('click',()=>{buildResourceSelect(u);updateTeacherScope();renderUnits()});
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
  showTeacher();await loadInbox();alertUser('Sesión docente iniciada.',true);
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
 for(const label of ['RA','Nota vigente','CE pendientes','Parciales','Sin evaluar'])head.append(makeCell(label,true));
 table.append(head);
 for(const item of payload.ra){
  const tr=document.createElement('tr');
  for(const value of [item.ra,item.grade===null?'Sin cerrar':item.grade.toFixed(2),
   item.pending.join(', ')||'Ninguno',item.partial.join(', ')||'Ninguno',item.notEvaluated.join(', ')||'Ninguno'])tr.append(makeCell(value));
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
 const assessment=document.createElement('p');assessment.className='small';
 assessment.textContent='Ponderación de referencia: portafolio/práctica 60 % y prueba 40 %. Si solo existe uno de los instrumentos, el CE figura como parcial. La nota final del criterio puede validarse manualmente. En RA7 se exige validación docente del desempeño.';
 host.append(assessment);
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
   hours:Number($id('teacherHours').value),passphrase:secret,
   scope:$id('teacherScope').value,ce:$id('teacherScopeCE').value,
   activity:Number($id('teacherScopeIndex').value)
  });
  $id('teacherKeyPass').value='';
  if(result.cancelled)return;
  $id('teacherIssuedCode').value=result.code;
  alertUser('Permiso '+result.scopeResource+' emitido hasta '+new Date(result.expiresAt).toLocaleString('es-ES')+'.',true);
 }catch(e){$id('teacherKeyPass').value='';alertUser('No se pudo emitir el código: '+e.message)}
}
let csvPreview=null;
async function previewTeacherCsv(){
 try{
  const studentId=$id('teacherStudent').value.trim();
  const result=await window.epe.teacherPreviewCsv(studentId);
  if(result.cancelled)return;
  csvPreview=result;
  const host=$id('teacherCsvPreviewArea');host.replaceChildren();host.hidden=false;
  const title=document.createElement('p');title.className='small';
  title.textContent='ALUMNO: '+result.studentId+' · Archivo: '+result.filename+' · '+result.ra+
   ' · '+result.instrument+'. Compruebe que el CSV corresponde realmente a ese alumno antes de validar.';
  host.append(title);
  const table=document.createElement('table');
  const head=document.createElement('tr');for(const name of ['Criterio','Nota / 10'])head.append(makeCell(name,true));table.append(head);
  for(const row of result.grades){
   const tr=document.createElement('tr');tr.append(makeCell(row.ce),makeCell(row.score.toFixed(2)));table.append(tr);
  }
  host.append(table);
  const hash=document.createElement('p');hash.className='small';hash.textContent='Huella SHA-256: '+result.sha256;
  host.append(hash);
  $id('teacherCsvApprove').disabled=false;
  alertUser('CSV leído. Las notas NO se han incorporado aún.',true);
 }catch(e){
  csvPreview=null;$id('teacherCsvApprove').disabled=true;
  alertUser('No se pudo leer el CSV: '+e.message);
 }
}
async function approveTeacherCsv(){
 if(!csvPreview)return;
 const p=csvPreview;
 if(!window.confirm('Va a incorporar '+p.grades.length+' notas del '+p.ra+' al alumno '+p.studentId+
  '. El archivo no tiene firma verificable. ¿Ha contrastado su procedencia y las calificaciones?'))return;
 try{
  const r=await window.epe.teacherApproveCsv(p.previewId);
  csvPreview=null;$id('teacherCsvApprove').disabled=true;
  $id('teacherCsvPreviewArea').hidden=true;$id('teacherCsvPreviewArea').replaceChildren();
  alertUser('Importación validada: '+r.imported+' calificaciones incorporadas al expediente.',true);
  await refreshSummary();
 }catch(e){alertUser('No se pudo incorporar el CSV: '+e.message)}
}

let inboxRecords=[], selectedReceipt=null;

async function exportStudentReceipts(){
 try{
  const studentId=$id('student').value.trim();
  const outcome=await window.epe.exportReceipts({studentId,resourceId:$id('resource').value,code:$id('token').value.trim()});
  if(outcome.cancelled)return;
  alertUser('Se han guardado '+outcome.count+' entregas para entregar al profesor.',true);
 }catch(e){alertUser('No se pudieron exportar las entregas: '+e.message)}
}

function renderInbox(){
 const host=$id('teacherInboxList');host.replaceChildren();
 if(inboxRecords.length===0){const p=document.createElement('p');p.className='small';
  p.textContent='No hay entregas para el filtro seleccionado.';host.append(p);return;}
 const table=document.createElement('table');
 const th=document.createElement('tr');
 for(const x of ['ID alumno','Unidad / recurso','Recepción','Estado','Acciones'])th.append(makeCell(x,true));
 table.append(th);
 for(const item of inboxRecords){
  const tr=document.createElement('tr');
  tr.append(makeCell(item.student_id),makeCell(item.resource_id),
    makeCell(new Date(item.received_at).toLocaleString('es-ES')),makeCell(item.status));
  const col=document.createElement('td');
  const b=document.createElement('button');b.className='subtle';b.type='button';
  b.textContent=item.status==='pendiente'?'Revisar':'Ver';
  b.addEventListener('click',()=>showInboxReceipt(item));
  col.append(b);tr.append(col);table.append(tr);
 }
 host.append(table);
}
function showInboxReceipt(item){
 selectedReceipt=item;
 $id('teacherInboxReview').hidden=false;
 $id('teacherInboxDetails').textContent='Alumno identificado en EPE: '+item.student_id+
  ' · Nombre indicado en HTML: '+(item.claimed_name||'No consta')+
  ' · Código declarado: '+(item.claimed_student||'No consta')+
  ' · '+item.ra+' · '+item.instrument+
  ' · Sesión: '+item.session_id+' · Finalización: '+new Date(item.finalized_at).toLocaleString('es-ES');
 const host=$id('teacherInboxScores');host.replaceChildren();
 const table=document.createElement('table');const header=document.createElement('tr');
 for(const x of ['Criterio','Nota propuesta / 10'])header.append(makeCell(x,true));
 table.append(header);
 for(const row of item.scores){const tr=document.createElement('tr');
   tr.append(makeCell(row.ce),makeCell(Number(row.score).toFixed(2)));table.append(tr)}
 host.append(table);
 const canReview=item.status==='pendiente';
 $id('teacherInboxApprove').disabled=!canReview;
 $id('teacherInboxDiscard').disabled=!canReview;
 $id('teacherInboxNote').value='';
 $id('teacherInboxReview').scrollIntoView({behavior:'smooth',block:'nearest'});
}
async function loadInbox(){
 try{
  const result=await window.epe.teacherInbox($id('teacherInboxFilter').value);
  inboxRecords=result.items;
  selectedReceipt=null;
  $id('teacherInboxReview').hidden=true;
  renderInbox();
 }catch(e){alertUser('No se pudo abrir la bandeja: '+e.message)}
}
async function reviewReceipt(decision){
 if(!selectedReceipt)return;
 const item=selectedReceipt;
 const note=$id('teacherInboxNote').value.trim();
 if(decision==='aprobar' && note.length<15){
  alertUser('Indique una observación de al menos 15 caracteres sobre las evidencias revisadas.');return;
 }
 if(!window.confirm((decision==='aprobar'?'VALIDAR':'DESCARTAR')+
   ' los resultados de '+item.student_id+' ('+item.resource_id+')? '+
   (decision==='aprobar'?'Se registrarán como notas validadas por el profesor.':'No se modificarán las calificaciones.')))return;
 try{
  const result=await window.epe.teacherReviewReceipt({
   id:item.id,decision,mode:$id('teacherInboxMode').value,note
  });
  alertUser('Entrega '+result.status+'. '+result.count+' criterios incorporados.',true);
  await loadInbox();
  if($id('teacherStudent').value.trim()===item.student_id)await refreshSummary();
 }catch(e){alertUser('No se pudo revisar: '+e.message)}
}
async function importOfflineReceipts(){
 try{
  const result=await window.epe.teacherImportReceipts();
  if(result.cancelled)return;
  let message='Se importaron '+result.imported+' entregas. Duplicadas: '+result.duplicates+'.';
  if(result.errors.length)message+=' Errores: '+result.errors.slice(0,4).join(' | ');
  alertUser(message,result.errors.length===0);
  await loadInbox();
 }catch(e){alertUser('No se pudo importar el paquete: '+e.message)}
}

async function init(){
 try{
  const data=await window.epe.catalog();units=data.units||[];
  $id('key-status').textContent=data.publicKeyConfigured
   ?'Clave pública de autorizaciones configurada.'
   :'No se ha incorporado la clave pública del profesor. Los códigos aún no se podrán validar.';
  if(units.length)buildResourceSelect(units[0]);
  renderUnits();fillCriteria();updateTeacherScope();await updateTeacherStatus();
  if(teacherUnlocked)await loadInbox();
 }catch(e){alertUser('No se pudo iniciar la aplicación: '+e.message)}
}
$id('launch').addEventListener('click',studentLaunch);
$id('studentExportReceipts').addEventListener('click',exportStudentReceipts);
$id('teacherInboxRefresh').addEventListener('click',loadInbox);
$id('teacherInboxFilter').addEventListener('change',loadInbox);
$id('teacherInboxApprove').addEventListener('click',()=>reviewReceipt('aprobar'));
$id('teacherInboxDiscard').addEventListener('click',()=>reviewReceipt('descartar'));
$id('teacherInboxImport').addEventListener('click',importOfflineReceipts);
$id('resource').addEventListener('change',updateTeacherScope);
$id('teacherScope').addEventListener('change',updateTeacherScope);
$id('teacherAuth').addEventListener('click',authenticateTeacher);
$id('teacherLogout').addEventListener('click',async()=>{
 await window.epe.teacherLogout();teacherUnlocked=false;showTeacher();$id('teacherResults').replaceChildren();
 alertUser('Sesión docente cerrada.',true);
});
$id('teacherSummary').addEventListener('click',refreshSummary);
$id('teacherSaveGrade').addEventListener('click',teacherRecord);
$id('teacherAssign').addEventListener('click',assignRecovery);
$id('teacherCreateCode').addEventListener('click',createCode);
$id('teacherCsvPreview').addEventListener('click',previewTeacherCsv);
$id('teacherCsvApprove').addEventListener('click',approveTeacherCsv);
init();

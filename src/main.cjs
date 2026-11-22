'use strict';
const {app,BrowserWindow,ipcMain,session,dialog}=require('electron');
const path=require('node:path');
const fs=require('node:fs');
const crypto=require('node:crypto');
const manifest=require('../curriculum/manifest.json');
const {openDatabase}=require('./database.cjs');
const {evaluateRA}=require('./evaluation.cjs');
const {createRecoveryPlan,validateCriterion}=require('./recovery.cjs');
const {createCredential,verifyCredential}=require('./teacher-auth.cjs');
const {verifyPermission}=require('./security.cjs');
const {scopedId,candidateIds,isLaunchPermission}=require('./activity-permissions.cjs');
const {parseGradesCsv}=require('./report-import.cjs');
const {CAPTURE_SOURCE,normalizeCandidate}=require('./grade-capture.cjs');

let db,launcher;
const activeChildren=new Map();
const authorizedStudents=new Set();
const contentRoot=path.resolve(__dirname,'..','content');
const pubPath=path.resolve(__dirname,'..','curriculum','teacher-public.pem');
let teacherUnlocked=false,lastTeacherActivity=0,loginFailures=0,loginBlockedUntil=0,pendingCsv=null;
const TEACHER_IDLE=20*60*1000;
function dataDir(){
 const portable=process.env.PORTABLE_EXECUTABLE_DIR;
 const preferred=portable?path.join(portable,'EPE_FP360_Datos'):path.join(app.getPath('userData'),'EPE_FP360_Datos');
 try{fs.mkdirSync(preferred,{recursive:true});fs.accessSync(preferred,fs.constants.W_OK);return preferred}
 catch{const fallback=path.join(app.getPath('userData'),'EPE_FP360_Datos');fs.mkdirSync(fallback,{recursive:true});return fallback}
}
function studentOK(id){return typeof id==='string'&&/^[A-Za-z0-9._-]{3,64}$/.test(id)}
function findAsset(id){
 for(const unit of manifest.units)for(const item of [unit.portfolio,...unit.exams]){
  if(item.id!==id)continue;
  const abs=path.resolve(contentRoot,unit.id.toLowerCase(),item.filename);
  if(!abs.startsWith(contentRoot+path.sep))throw new Error('Ruta inválida');
  return {unit,item,abs,available:fs.existsSync(abs)};
 }
 return null;
}
function currentCatalog(){
 return manifest.units.map(u=>({...u,portfolio:{...u.portfolio,available:findAsset(u.portfolio.id).available},
   exams:u.exams.map(e=>({...e,available:findAsset(e.id).available}))}));
}
function makeWindow(){
 launcher=new BrowserWindow({width:1280,height:880,minWidth:960,minHeight:640,backgroundColor:'#f2f6fa',
 title:'EPE FP360 Portable',webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true}});
 launcher.loadFile(path.join(__dirname,'ui','index.html'));
 launcher.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 launcher.webContents.on('will-navigate',e=>e.preventDefault());
 launcher.on('closed',()=>{teacherUnlocked=false});
}
function openAsset(abs,title,studentId,resourceId){
 const partition='persist:epe-alumno-'+crypto.createHash('sha256').update(studentId).digest('hex').slice(0,24);
 const studentSession=session.fromPartition(partition);
 studentSession.setPermissionRequestHandler((_wc,_permission,cb)=>cb(false));
 const child=new BrowserWindow({width:1280,height:900,minWidth:900,minHeight:550,title,backgroundColor:'#f4f8fb',
  webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,partition,preload:resourceId.endsWith('-PORTAFOLIO')?path.join(__dirname,'activity-preload.cjs'):undefined}});
 child.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 child.webContents.on('will-navigate',event=>event.preventDefault());
 activeChildren.set(child.webContents.id,{studentId,resourceId});
 let poller=null,polling=false,received=false;
 const poll=async()=>{
  if(received||polling||child.isDestroyed()||child.webContents.isDestroyed())return;
  polling=true;
  try{
   // Extracción de notas únicamente DESPUÉS del cierre de cada HTML original.
   const raw=await child.webContents.executeJavaScript(CAPTURE_SOURCE,true);
   if(!raw || raw.error)return;
   const record=normalizeCandidate(raw,studentId,resourceId);
   const outcome=db.receiveSubmission(record);
   if(outcome.created)console.log('EPE FP360: entrega recibida para revisión',record.ra,record.resourceId);
   received=true;
   if(poller)clearInterval(poller);
  }catch(e){
   // El HTML puede estar restaurando una copia de seguridad o aún sin finalizar.
   // Un fallo de extracción nunca cambia notas oficiales ni cierra la actividad.
   if(process.env.EPE_VERBOSE==='1')console.warn('Captura pendiente:',e.message);
  }finally{polling=false}
 };
 child.webContents.once('did-finish-load',()=>{
   poller=setInterval(poll,4000);
   poll();
 });
 child.on('closed',()=>{if(poller)clearInterval(poller);activeChildren.delete(child.webContents.id)});
 child.loadFile(abs);child.show();
}
function sameLauncher(event){
 return !!launcher&&!launcher.isDestroyed()&&event.sender.id===launcher.webContents.id;
}
function requiresTeacher(event){
 if(!sameLauncher(event))throw new Error('Origen no autorizado');
 if(!teacherUnlocked||Date.now()-lastTeacherActivity>TEACHER_IDLE){
  teacherUnlocked=false;throw new Error('Sesión docente cerrada. Vuelva a introducir su contraseña.');
 }
 lastTeacherActivity=Date.now();
}
function register(){
 ipcMain.handle('catalog',(event)=>{
  if(!sameLauncher(event))throw new Error('Acceso denegado');
  return {units:currentCatalog(),publicKeyConfigured:fs.existsSync(pubPath)};
 });
 ipcMain.handle('launch',(event,payload)=>{
  if(!sameLauncher(event))return {ok:false,error:'Acceso denegado'};
  const {studentId,resourceId,code}=payload||{};
  if(!studentOK(studentId))return {ok:false,error:'Identificador de alumno inválido (3–64 caracteres).'};
  const found=findAsset(resourceId);
  if(!found)return {ok:false,error:'Recurso desconocido'};
  if(!found.available)return {ok:false,error:'Importe primero el recurso HTML correspondiente.'};
  try{
   if(!db.hasLaunchGrant(studentId,resourceId)){
    const pub=fs.existsSync(pubPath)?fs.readFileSync(pubPath,'utf8'):'';
    let issuedFor=resourceId;
    try{
     const encoded=String(code||'').split('.')[0];
     const payload=JSON.parse(Buffer.from(encoded,'base64url').toString('utf8'));
     if(isLaunchPermission(resourceId,payload.resourceId))issuedFor=payload.resourceId;
    }catch{}
    const claim=verifyPermission(code,pub,{studentId,resourceId:issuedFor});
    db.ensureStudent(studentId);
    db.addGrant(studentId,issuedFor,claim.nonce,claim.expiresAt);
   }
   authorizedStudents.add(studentId);
   openAsset(found.abs,found.unit.id+' · '+found.unit.title,studentId,resourceId);
   return {ok:true};
  }catch(e){return {ok:false,error:String(e.message||e)}}
 });
 ipcMain.handle('activity:status',(event,payload)=>{
  const identity=activeChildren.get(event.sender.id);
  if(!identity)return {ok:false,error:'Ventana no autorizada'};
  try{
   const match=/^(RA[1-7]\.[a-j])\/(\d{3})$/.exec(String(payload?.key??''));
   if(!match)throw new Error('Identificador de actividad inválido');
   const keys=candidateIds(identity.resourceId,match[1],Number(match[2]));
   return {ok:true,authorized:keys.some(k=>db.hasGrant(identity.studentId,k))};
  }catch(e){return {ok:false,error:String(e.message||e)}}
 });
 ipcMain.handle('activity:unlock',(event,payload)=>{
  const identity=activeChildren.get(event.sender.id);
  if(!identity)return {ok:false,error:'Ventana no autorizada'};
  try{
   const match=/^(RA[1-7]\.[a-j])\/(\d{3})$/.exec(String(payload?.key??''));
   if(!match)throw new Error('Identificador de actividad inválido');
   const keys=candidateIds(identity.resourceId,match[1],Number(match[2]));
   if(keys.some(k=>db.hasGrant(identity.studentId,k)))return {ok:true};
   let accepted=null,claim=null;
   for(const k of keys){
    try{
     claim=verifyPermission(payload.code,fs.readFileSync(pubPath,'utf8'),{
      studentId:identity.studentId,resourceId:k});
     accepted=k;break;
    }catch{}
   }
   if(!accepted||!claim)throw new Error('Código no válido para esta actividad, criterio o portafolio');
   db.addGrant(identity.studentId,accepted,claim.nonce,claim.expiresAt);
   return {ok:true,scope:accepted};
  }catch(e){return {ok:false,error:String(e.message||e)}}
 });
 ipcMain.handle('teacher:status',event=>{
  if(!sameLauncher(event))throw new Error('Acceso denegado');
  if(Date.now()-lastTeacherActivity>TEACHER_IDLE)teacherUnlocked=false;
  return {configured:!!db.getTeacherCredential(),unlocked:teacherUnlocked};
 });
 ipcMain.handle('teacher:setup',(event,password)=>{
  if(!sameLauncher(event))throw new Error('Acceso denegado');
  if(db.getTeacherCredential())throw new Error('El perfil docente ya está configurado.');
  db.setTeacherCredential(createCredential(password));
  teacherUnlocked=true;lastTeacherActivity=Date.now();
  return {ok:true};
 });
 ipcMain.handle('teacher:login',(event,password)=>{
  if(!sameLauncher(event))throw new Error('Acceso denegado');
  if(Date.now()<loginBlockedUntil)throw new Error('Demasiados intentos. Espere un minuto.');
  const cred=db.getTeacherCredential();
  if(!cred)throw new Error('Configure primero la contraseña docente.');
  if(!verifyCredential(password,cred)){
   loginFailures++;
   if(loginFailures>=5){loginFailures=0;loginBlockedUntil=Date.now()+60000}
   throw new Error('Contraseña incorrecta');
  }
  loginFailures=0;loginBlockedUntil=0;teacherUnlocked=true;lastTeacherActivity=Date.now();
  return {ok:true};
 });
 ipcMain.handle('teacher:logout',event=>{
  if(!sameLauncher(event))throw new Error('Acceso denegado');
  teacherUnlocked=false;pendingCsv=null;return {ok:true};
 });
 ipcMain.handle('student:exportReceipts',async(event,id)=>{
   if(!sameLauncher(event)||!studentOK(id)||!authorizedStudents.has(id))throw new Error('El alumno debe abrir primero un recurso autorizado.');
   const receipts=db.exportStudentSubmissions(id);
   if(!receipts.length)throw new Error('No hay pruebas finalizadas recibidas para exportar.');
   const packet={type:'EPE-FP360-RECIBOS-1',exportedAt:new Date().toISOString(),studentId:id,receipts};
   const filename='EPE_FP360_ENTREGAS_'+id+'_'+new Date().toISOString().slice(0,10)+'.json';
   const save=await dialog.showSaveDialog(launcher,{
    title:'Guardar entregas para el profesor',defaultPath:path.join(app.getPath('documents'),filename),
    filters:[{name:'Paquete EPE de entregas',extensions:['json']}]});
   if(save.canceled||!save.filePath)return {ok:false,cancelled:true};
   fs.writeFileSync(save.filePath,JSON.stringify(packet,null,2),{encoding:'utf8',flag:'w',mode:0o600});
   return {ok:true,count:receipts.length,path:save.filePath};
 });
 ipcMain.handle('teacher:inbox',(event,status='pendiente')=>{
   requiresTeacher(event);
   if(!['pendiente','todas','aprobada','descartada'].includes(status))throw new Error('Filtro de bandeja inválido');
   return {ok:true,items:db.listSubmissions(status)};
 });
 ipcMain.handle('teacher:reviewReceipt',(event,payload)=>{
   requiresTeacher(event);
   const {id,decision,mode='ordinaria',note=''}=payload||{};
   if(!Number.isSafeInteger(id)||id<1||typeof note!=='string'||note.length>1000)throw new Error('Revisión inválida');
   return {ok:true,...db.reviewSubmission(id,decision,mode,note)};
 });
 ipcMain.handle('teacher:importReceipts',async(event)=>{
   requiresTeacher(event);
   const choose=await dialog.showOpenDialog(launcher,{title:'Importar entregas de equipos del alumnado',
     properties:['openFile','multiSelections'],filters:[{name:'Paquetes de entregas',extensions:['json']}]});
   requiresTeacher(event);
   if(choose.canceled)return {ok:false,cancelled:true};
   if(choose.filePaths.length>100)throw new Error('Importe un máximo de 100 paquetes por operación');
   let imported=0,duplicates=0,errors=[];
   for(const file of choose.filePaths){
    try{
     if(fs.statSync(file).size>1000000)throw new Error('Archivo demasiado grande');
     const packet=JSON.parse(fs.readFileSync(file,'utf8'));
     if(packet.type!=='EPE-FP360-RECIBOS-1'||!studentOK(packet.studentId)
       ||!Array.isArray(packet.receipts)||packet.receipts.length>100)throw new Error('Formato de paquete inválido');
     for(const raw of packet.receipts){
       // El paquete no acredita autoría. Se valida y queda PENDIENTE del profesor.
       if(raw.studentId!==packet.studentId)throw new Error('Alumno del paquete incoherente');
       const normalized=normalizeCandidate({
         version:1,variant:'grade',sessionId:raw.sessionId,finalizedAt:raw.finalizedAt,
         claimedName:raw.claimedName,claimedStudent:raw.claimedStudent,scores:raw.scores
       },raw.studentId,raw.resourceId);
       const result=db.receiveSubmission(normalized);
       if(result.created)imported++;else duplicates++;
     }
    }catch(e){errors.push(path.basename(file)+': '+e.message)}
   }
   return {ok:true,imported,duplicates,errors};
 });
 ipcMain.handle('teacher:summary',(event,id)=>{
  requiresTeacher(event);
  if(!studentOK(id))throw new Error('Identificador inválido');
  const scores=db.getGrades(id);
  return {ok:true,studentId:id,ra:manifest.units.map(u=>evaluateRA(u.ra,scores)),
   history:scores,recoveries:db.listRecoveries(id)};
 });
 ipcMain.handle('teacher:record',(event,payload)=>{
  requiresTeacher(event);
  const {studentId,ce,score,instrument,mode,note=''}=payload||{};
  if(!studentOK(studentId)||!validateCriterion(ce))throw new Error('Alumno o criterio inválido');
  const value=Number(score);
  if(score===''||score===null||!Number.isFinite(value)||value<0||value>10)throw new Error('Introduzca una nota entre 0 y 10');
  if(!['ordinaria','recuperacion'].includes(mode)||!['portafolio','prueba_objetiva','observacion','rubrica','calificacion_final_ce'].includes(instrument))throw new Error('Instrumento o modalidad inválidos');
  if(typeof note!=='string'||note.length>2000)throw new Error('Observaciones demasiado extensas');
  db.ensureStudent(studentId);
  const result=db.recordValidatedGrade(studentId,ce,value,instrument,mode,note);
  if(mode==='recuperacion'&&value>=5)db.completeRecovery(studentId,ce);
  return {ok:true,recordId:result.lastInsertRowid.toString()};
 });
 ipcMain.handle('teacher:assign',(event,payload)=>{
  requiresTeacher(event);
  const {studentId,ra,activitiesPerCriterion=20,teacherNote=''}=payload||{};
  if(!studentOK(studentId)||typeof teacherNote!=='string'||teacherNote.length>1000)throw new Error('Datos de asignación inválidos');
  if(!manifest.units.some(u=>u.ra===ra))throw new Error('RA desconocido');
  const plan=createRecoveryPlan(ra,db.getGrades(studentId),{studentId,activitiesPerCriterion});
  if(plan.pending.length===0)throw new Error('No hay criterios evaluados y pendientes en este RA.');
  db.ensureStudent(studentId);
  let assigned=0;
  for(const item of plan.pending){
   if(db.hasPendingRecovery(studentId,item.ce))continue;
   db.assignRecovery(studentId,item.ce,teacherNote);assigned++;
  }
  return {ok:true,assigned,plan};
 });
 ipcMain.handle('teacher:previewCsv',async(event,studentId)=>{
  requiresTeacher(event);
  if(!studentOK(studentId))throw new Error('Indique el identificador de alumno antes de importar');
  const choose=await dialog.showOpenDialog(launcher,{title:'Importar resultados CSV para revisión docente',
   properties:['openFile'],filters:[{name:'Resultados CSV',extensions:['csv']}]});
  requiresTeacher(event);
  if(choose.canceled||!choose.filePaths.length)return {ok:false,cancelled:true};
  const file=choose.filePaths[0],stat=fs.statSync(file);
  if(stat.size>250000)throw new Error('El archivo CSV supera el tamaño permitido.');
  const body=fs.readFileSync(file,'utf8'),parsed=parseGradesCsv(body);
  const sha256=crypto.createHash('sha256').update(body).digest('hex');
  if(db.hasImportedCsv(studentId,sha256))throw new Error('Este archivo ya fue importado para ese alumno.');
  const previewId=crypto.randomUUID();
  pendingCsv={previewId,studentId,sha256,parsed,created:Date.now()};
  return {ok:true,previewId,studentId,filename:path.basename(file),
    ra:parsed.ra,instrument:parsed.instrument,grades:parsed.grades,sha256};
 });
 ipcMain.handle('teacher:approveCsv',(event,previewId)=>{
  requiresTeacher(event);
  if(!pendingCsv||pendingCsv.previewId!==previewId)throw new Error('Vista previa de importación inexistente');
  if(Date.now()-pendingCsv.created>10*60*1000){pendingCsv=null;throw new Error('La importación ha caducado. Vuelva a seleccionar el archivo.')}
  const {studentId,sha256,parsed}=pendingCsv;
  pendingCsv=null;
  const imported=db.importValidatedCsv(studentId,parsed.grades,parsed.instrument,sha256);
  return {ok:true,imported,studentId,ra:parsed.ra};
 });
 ipcMain.handle('teacher:issue',async(event,payload)=>{
  requiresTeacher(event);
  const {studentId,resourceId,hours=48,passphrase,scope='recurso',ce=null,activity=null}=payload||{};
  const scopedResource=scopedId(resourceId,scope,ce,activity===null?null:Number(activity));
  if(!studentOK(studentId)||!findAsset(resourceId))throw new Error('Alumno o recurso inválido');
  if(!Number.isSafeInteger(hours)||hours<1||hours>720)throw new Error('Duración: entre 1 y 720 horas');
  if(typeof passphrase!=='string'||passphrase.length===0)throw new Error('Indique la frase de paso de la clave privada docente');
  const choice=await dialog.showOpenDialog(launcher,{
   title:'Seleccione la clave privada DOCENTE (nunca se almacena en el equipo del alumno)',
   properties:['openFile'],filters:[{name:'Clave PEM',extensions:['pem']}]});
  if(choice.canceled||!choice.filePaths.length)return {ok:false,cancelled:true};
  const stat=fs.statSync(choice.filePaths[0]);
  if(stat.size>32000)throw new Error('El archivo de clave es demasiado grande');
  const privateKey=crypto.createPrivateKey({key:fs.readFileSync(choice.filePaths[0]),passphrase});
  const now=Date.now();
  const claim={version:1,audience:'epe-fp360',studentId,resourceId:scopedResource,issuedAt:now,
   expiresAt:now+hours*3600000,nonce:crypto.randomBytes(20).toString('hex')};
  const encoded=Buffer.from(JSON.stringify(claim)).toString('base64url');
  const signature=crypto.sign(null,Buffer.from(encoded,'utf8'),privateKey).toString('base64url');
  const token=encoded+'.'+signature;
  const publicKey=fs.existsSync(pubPath)?fs.readFileSync(pubPath,'utf8'):'';
  verifyPermission(token,publicKey,{studentId,resourceId:scopedResource});
  return {ok:true,code:token,expiresAt:claim.expiresAt,scopeResource:scopedResource};
 });
}
app.whenReady().then(()=>{
 session.defaultSession.setPermissionRequestHandler((_wc,_permission,cb)=>cb(false));
 db=openDatabase(path.join(dataDir(),'epe-fp360.sqlite'));
 register();makeWindow();
}).catch(err=>{console.error('No se pudo iniciar EPE FP360:',err);app.quit()});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});
app.on('before-quit',()=>db?.close());
app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)makeWindow()});

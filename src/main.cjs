'use strict';
const {app,BrowserWindow,ipcMain,session}=require('electron');
const path=require('node:path');
const fs=require('node:fs');
const crypto=require('node:crypto');
const manifest=require('../curriculum/manifest.json');
const {openDatabase}=require('./database.cjs');
const {evaluateRA}=require('./evaluation.cjs');
const {verifyPermission}=require('./security.cjs');
let db,launcher;
const contentRoot=path.resolve(__dirname,'..','content');
const pubPath=path.resolve(__dirname,'..','curriculum','teacher-public.pem');
function dataDir(){
 const portable=process.env.PORTABLE_EXECUTABLE_DIR;
 const preferred=portable?path.join(portable,'EPE_FP360_Datos'):path.join(app.getPath('userData'),'EPE_FP360_Datos');
 try{fs.mkdirSync(preferred,{recursive:true});fs.accessSync(preferred,fs.constants.W_OK);return preferred}
 catch{const fallback=path.join(app.getPath('userData'),'EPE_FP360_Datos');fs.mkdirSync(fallback,{recursive:true});return fallback}
}
function safeStudent(id){return typeof id==='string'&&/^[a-zA-Z0-9._-]{3,64}$/.test(id)}
function findAsset(id){
 for(const unit of manifest.units){
  for(const item of [unit.portfolio,...unit.exams])if(item.id===id){
   const abs=path.resolve(contentRoot,unit.id.toLowerCase(),item.filename);
   if(!abs.startsWith(contentRoot+path.sep))throw new Error('Ruta de recurso inválida');
   return {unit,item,abs,available:fs.existsSync(abs)};
  }
 }
 return null;
}
function currentCatalog(){
 return manifest.units.map(u=>({...u,portfolio:{...u.portfolio,available:findAsset(u.portfolio.id).available},
   exams:u.exams.map(e=>({...e,available:findAsset(e.id).available}))}));
}
function makeWindow(){
 launcher=new BrowserWindow({width:1240,height:850,minWidth:960,minHeight:620,backgroundColor:'#f2f6fa',
  title:'EPE FP360 Portable',webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true}});
 launcher.loadFile(path.join(__dirname,'ui','index.html'));
 launcher.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 launcher.webContents.on('will-navigate',e=>e.preventDefault());
}
function openAsset(abs,title){
 const child=new BrowserWindow({width:1280,height:900,minWidth:900,minHeight:550,title,backgroundColor:'#f4f8fb',
  webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
 child.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 child.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith('file://'))event.preventDefault()});
 child.loadFile(abs);
 child.show();
}
app.whenReady().then(()=>{
 session.defaultSession.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
 db=openDatabase(path.join(dataDir(),'epe-fp360.sqlite'));
 ipcMain.handle('catalog',()=>({units:currentCatalog(),publicKeyConfigured:fs.existsSync(pubPath)}));
 ipcMain.handle('launch',(_event,payload)=>{
  const {studentId,resourceId,code}=payload||{};
  if(!safeStudent(studentId))return {ok:false,error:'Identificador: 3–64 letras, cifras, puntos, guiones o guiones bajos.'};
  const found=findAsset(resourceId);
  if(!found)return {ok:false,error:'Recurso desconocido'};
  if(!found.available)return {ok:false,error:'Falta importar este recurso HTML; consulte las instrucciones.'};
  try{
   if(!db.hasGrant(studentId,resourceId)){
    const publicKey=fs.existsSync(pubPath)?fs.readFileSync(pubPath,'utf8'):'';
    const claim=verifyPermission(code,publicKey,{studentId,resourceId});
    db.addGrant(studentId,resourceId,claim.nonce,claim.expiresAt);
   }
   openAsset(found.abs,found.unit.id+' · '+found.unit.title);
   return {ok:true};
  }catch(e){return {ok:false,error:String(e.message||e)}}
 });
 ipcMain.handle('summary',(_event,id)=>{
  if(!safeStudent(id))return {ok:false,error:'Identificador no válido'};
  const scores=db.getGrades(id);
  return {ok:true,ra:manifest.units.map(u=>evaluateRA(u.ra,scores))};
 });
 makeWindow();
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});
app.on('before-quit',()=>db?.close());
app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)makeWindow()});

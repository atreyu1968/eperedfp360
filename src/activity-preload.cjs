'use strict';
/*
 * Adaptador de acceso curricular a portafolios HTML heredados.
 * Este control es DISUASORIO: el usuario puede inspeccionar o abrir directamente
 * el HTML local. No constituye un DRM ni garantiza una evaluación inviolable.
 *
 * No se expone Node.js, SQLite, claves ni IPC genérico a los HTML de alumnado.
 */
const {ipcRenderer}=require('electron');
let currentKey='',checking=0,approvedKey='',lastBlocked=false;
let root=null,field=null,notice=null,info=null,action=null;
const ceRegex=/(?:CE\s*)?([1-7]\.[a-j])\b/i;
function visibleTask(){
 // Portafolios RA1, RA2, RA5, RA6 y RA7 (mismo formato).
 const oldHeader=document.querySelector('.numberbar .tag');
 const oldNumber=document.querySelector('.numberbar strong');
 if(oldHeader&&oldNumber){
  const matchCE=ceRegex.exec(oldHeader.textContent||'');
  const number=/Actividad\s+(\d+)\s*\/\s*(\d+)/i.exec(oldNumber.textContent||'');
  if(matchCE&&number)return {ce:'RA'+matchCE[1].toLowerCase(),index:Number(number[1]),title:'Actividad '+number[1]};
 }
 // Portafolio ampliado RA3.
 const head3=document.querySelector('.sectionhead .tag');
 const num3=document.querySelector('.panel.question .number');
 if(head3&&num3){
  const matchCE=ceRegex.exec(head3.textContent||'');
  const number=/Actividad\s+(\d+)\s+de\s+(\d+)/i.exec(num3.textContent||'');
  if(matchCE&&number)return {ce:'RA'+matchCE[1].toLowerCase(),index:Number(number[1]),title:'Actividad '+number[1]};
 }
 // Portafolio RA4: 56 actividades por criterio, 392 en total.
 const number4=document.querySelector('.panel.question .labelcap');
 if(number4){
  const match=/Actividad\s+(\d+)\s*\/\s*392\b/i.exec(number4.textContent||'');
  if(match){
   const ordinal=Number(match[1]);
   if(ordinal>=1&&ordinal<=392){
    const ceIndex=Math.floor((ordinal-1)/56),index=(ordinal-1)%56+1;
    return {ce:'RA4.'+String.fromCharCode(97+ceIndex),index,title:'Actividad '+ordinal};
   }
  }
 }
 return null;
}
function repositionOverlay(){
 if(!root)return;
 const host=document.fullscreenElement||document.documentElement;
 if(root.parentElement!==host)host.append(root);
}
function createUi(){
 if(root)return;
 root=document.createElement('div');
 root.id='epe-fp360-activity-lock';
 Object.assign(root.style,{
  position:'fixed',inset:'0',zIndex:'2147483647',
  background:'rgba(15,31,47,.98)',display:'none',justifyContent:'center',alignItems:'center',
  padding:'24px',fontFamily:'Segoe UI,Arial,sans-serif',color:'#173851'
 });
 const panel=document.createElement('div');
 Object.assign(panel.style,{maxWidth:'540px',width:'100%',background:'#ffffff',padding:'28px',
  borderRadius:'16px',boxShadow:'0 20px 70px #041b3380'});
 const icon=document.createElement('div');icon.textContent='🔒';
 Object.assign(icon.style,{fontSize:'28px',marginBottom:'10px'});
 const title=document.createElement('h2');title.textContent='Actividad bloqueada';
 Object.assign(title.style,{margin:'0 0 10px',fontSize:'23px'});
 info=document.createElement('p');
 Object.assign(info.style,{fontSize:'14px',lineHeight:'1.6',color:'#416176'});
 const label=document.createElement('label');label.textContent='Código facilitado por el profesor';
 Object.assign(label.style,{display:'block',fontWeight:'600',fontSize:'13px',marginBottom:'8px'});
 field=document.createElement('textarea');field.rows=3;field.placeholder='Pegue aquí el código de autorización';
 Object.assign(field.style,{display:'block',boxSizing:'border-box',width:'100%',fontSize:'13px',
  border:'1px solid #b6cbd9',borderRadius:'8px',padding:'12px',resize:'vertical'});
 // Muchos HTML bloquean el pegado; esta casilla de autorización sí lo permite.
 for(const eventName of ['paste','copy','cut','keydown','keyup'])field.addEventListener(eventName,e=>e.stopPropagation(),true);
 action=document.createElement('button');action.type='button';action.textContent='Desbloquear actividad';
 Object.assign(action.style,{background:'#007d85',color:'white',fontWeight:'700',
  border:'0',borderRadius:'9px',padding:'12px 15px',width:'100%',marginTop:'14px',cursor:'pointer'});
 notice=document.createElement('p');
 Object.assign(notice.style,{fontSize:'12px',minHeight:'19px',color:'#ac4433'});
 const foot=document.createElement('p');foot.textContent='También se admiten códigos de desbloqueo para todo este criterio o para el portafolio completo.';
 Object.assign(foot.style,{fontSize:'11px',color:'#6a8290',lineHeight:'1.5'});
 panel.append(icon,title,info,label,field,action,notice,foot);
 root.append(panel);
 document.documentElement.append(root);
 document.addEventListener('fullscreenchange',()=>{repositionOverlay();requestObservation()});
 action.addEventListener('click',async()=>{
  const key=currentKey,code=field.value.trim();
  if(!key||!code){notice.textContent='Introduzca el código de autorización.';return}
  action.disabled=true;notice.textContent='Comprobando autorización...';
  try{
   const result=await ipcRenderer.invoke('activity:unlock',{code,key});
   if(key!==currentKey)return;
   if(!result.ok){notice.textContent=result.error||'Autorización incorrecta';return}
   approvedKey=key;field.value='';root.style.display='none';lastBlocked=false;
  }catch(e){notice.textContent='No se pudo validar: '+e.message}
  finally{action.disabled=false}
 });
}
function lock(task){
 if(!root)createUi();
 repositionOverlay();
 if(!task){root.style.display='none';lastBlocked=false;return}
 root.style.display='flex';lastBlocked=true;
 info.textContent=task.ce+' · '+task.title+'. El profesor debe autorizar esta actividad antes de continuar.';
 if(document.activeElement!==field)field.focus({preventScroll:true});
}
function observe(){
 const task=visibleTask();
 const key=task?task.ce+'/'+String(task.index).padStart(3,'0'):'';
 if(key===currentKey){if(key&&approvedKey!==key&&!lastBlocked)lock(task);return}
 currentKey=key;
 approvedKey='';
 if(!key){lock(null);return}
 lock(task);
 const stamp=++checking;
 ipcRenderer.invoke('activity:status',{key}).then(result=>{
  if(stamp!==checking||key!==currentKey)return;
  if(result.ok&&result.authorized){approvedKey=key;root.style.display='none';lastBlocked=false}
  else{notice.textContent='Actividad pendiente de autorización.'}
 }).catch(e=>{
  if(stamp===checking&&key===currentKey)notice.textContent='No se pudo comprobar el permiso: '+e.message
 });
}
let queued=false;
function requestObservation(){
 if(queued)return;
 queued=true;
 setTimeout(()=>{queued=false;observe()},0);
}
document.addEventListener('DOMContentLoaded',()=>{
 createUi();
 // Las aplicaciones renderizan cada actividad reemplazando partes del DOM.
 const observer=new MutationObserver(records=>{
  if(records.every(rec=>rec.target===root||root.contains(rec.target)))return;
  requestObservation();
 });
 observer.observe(document.body,{subtree:true,childList:true,characterData:true});
 requestObservation();
});

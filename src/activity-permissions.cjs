'use strict';
const manifest=require('../curriculum/manifest.json');
const units=manifest.units;
const zero=n=>String(n).padStart(3,'0');
function getResource(id){
 for(const unit of units)for(const item of [unit.portfolio,...unit.exams]){
  if(item.id===id)return {unit,item};
 }
 return null;
}
function criterionId(ra,index){
 const entry=units.find(u=>u.ra===ra);
 if(!entry||!Number.isInteger(index)||index<1||index>entry.weights.length)throw new Error('Criterio fuera del currículo');
 return ra+'.'+String.fromCharCode(96+index);
}
function isCriterionFor(ce,ra){
 const entry=units.find(u=>u.ra===ra);
 if(!entry||typeof ce!=='string')return false;
 return entry.weights.some((_,i)=>criterionId(ra,i+1)===ce);
}
function taskMax(unit){return unit.activities/unit.weights.length}
function scopedId(base,scope='recurso',ce=null,number=null){
 const entry=getResource(base);
 if(!entry)throw new Error('Recurso no encontrado');
 const {unit,item}=entry;
 if(scope==='recurso')return base;
 if(item.kind!=='portfolio')throw new Error('Los permisos por criterio o actividad requieren un portafolio');
 if(scope==='portafolio')return base+'@ALL';
 if(!isCriterionFor(ce,unit.ra))throw new Error('Criterio no corresponde al RA');
 if(scope==='criterio')return base+'@'+ce;
 if(scope==='actividad'){
  if(!Number.isInteger(number)||number<1||number>taskMax(unit))throw new Error('Actividad fuera del intervalo');
  return base+'@'+ce+'/'+zero(number);
 }
 throw new Error('Ámbito de autorización desconocido');
}
function isLaunchPermission(base,candidate){
 const entry=getResource(base);
 if(!entry||typeof candidate!=='string')return false;
 if(candidate===base)return true;
 if(entry.item.kind!=='portfolio')return false;
 if(candidate===scopedId(base,'portafolio'))return true;
 const m=/^(RA[1-7]\.[a-j])(?:\/(\d{3}))?$/.exec(candidate.slice(base.length+1));
 if(!candidate.startsWith(base+'@')||!m)return false;
 try{
  return candidate===scopedId(base,m[2]?'actividad':'criterio',m[1],m[2]?Number(m[2]):null);
 }catch{return false}
}
function candidateIds(base,ce,number){
 const entry=getResource(base);
 if(!entry||entry.item.kind!=='portfolio')throw new Error('Portafolio no reconocido');
 return [scopedId(base,'portafolio'),scopedId(base,'criterio',ce),scopedId(base,'actividad',ce,number)];
}
module.exports={getResource,criterionId,isCriterionFor,taskMax,scopedId,candidateIds,isLaunchPermission};

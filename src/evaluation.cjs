'use strict';
const manifest=require('../curriculum/manifest.json');
const UNITS=manifest.units;
const ROUND=n=>Math.round(n*100)/100;

function criteriaFor(ra){
 const unit=UNITS.find(u=>u.ra===ra);
 if(!unit)throw new Error('Resultado de aprendizaje desconocido');
 return unit.weights.map((weight,i)=>({id:ra+'.'+String.fromCharCode(97+i),weight}));
}
function evaluateRA(ra,entries=[],threshold=5){
 const ces=criteriaFor(ra);
 const grades=new Map();
 for(const item of entries){
   if(!item || !item.validated || !Number.isFinite(Number(item.score)))continue;
   if(!ces.some(c=>c.id===item.ce))continue;
   const old=grades.get(item.ce);
   const at=Number(item.id||0);
   if(!old||at>Number(old.id||0))grades.set(item.ce,{...item,score:Number(item.score)});
 }
 const details=ces.map(c=>{
   const g=grades.get(c.id),status=!g?'sin_evaluar':g.score<threshold?'pendiente':'superado';
   return {...c,status,score:g?.score??null,instrument:g?.instrument??null};
 });
 const complete=details.every(x=>x.score!==null);
 const weighted=complete?ROUND(details.reduce((s,c)=>s+c.score*c.weight/100,0)):null;
 return {ra,threshold,complete,grade:weighted,criteria:details,
   pending:details.filter(x=>x.status==='pendiente').map(x=>x.id),
   notEvaluated:details.filter(x=>x.status==='sin_evaluar').map(x=>x.id),
   passed:complete&&weighted>=5&&details.every(x=>x.status==='superado')};
}
function gradeObjective(correct,wrong,blank,total){
 if(!Number.isInteger(total)||total<1||correct<0||wrong<0||blank<0||correct+wrong+blank!==total)throw new Error('Recuento de respuestas inválido');
 return ROUND(Math.max(0,(correct-0.5*wrong)/total*10));
}
module.exports={criteriaFor,evaluateRA,gradeObjective};

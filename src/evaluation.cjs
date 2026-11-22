'use strict';
const manifest=require('../curriculum/manifest.json');
const UNITS=manifest.units;
const ROUND=n=>Math.round(n*100)/100;
const DEFAULT_PORTFOLIO_WEIGHT=0.60;
const DEFAULT_EXAM_WEIGHT=0.40;
function criteriaFor(ra){
 const unit=UNITS.find(u=>u.ra===ra);
 if(!unit)throw new Error('Resultado de aprendizaje desconocido');
 return unit.weights.map((weight,i)=>({id:ra+'.'+String.fromCharCode(97+i),weight}));
}
function latest(items,predicate){
 return items.filter(predicate).sort((a,b)=>Number(b.id||0)-Number(a.id||0))[0]||null;
}
function evaluateRA(ra,entries=[],threshold=5){
 const ces=criteriaFor(ra);
 const byCe=new Map();
 for(const item of entries){
  if(!item || !item.validated || typeof item.score!=='number'
    || !Number.isFinite(item.score)||item.score<0||item.score>10)continue;
  if(!ces.some(c=>c.id===item.ce))continue;
  if(!byCe.has(item.ce))byCe.set(item.ce,[]);
  byCe.get(item.ce).push(item);
 }
 const details=ces.map(c=>{
  const items=byCe.get(c.id)||[];
  let grade=null,instrument=null,parts={},manual=false;
  const direct=latest(items,e=>e.instrument==='calificacion_final_ce'||!e.instrument);
  const recovery=latest(items,e=>e.mode==='recuperacion');
  if(direct && (!recovery || Number(direct.id||0)>=Number(recovery.id||0))){
    grade=direct.score;instrument=direct.instrument||'calificacion_final_ce';manual=true;
  }else if(recovery){
    // Una recuperación validada por el docente sustituye el CE pendiente.
    grade=recovery.score;instrument='recuperacion_validada';manual=true;
  }else{
    const portfolio=latest(items,e=>['portafolio','rubrica','observacion'].includes(e.instrument));
    const exam=latest(items,e=>e.instrument==='prueba_objetiva');
    if(portfolio)parts.portafolio=ROUND(portfolio.score);
    if(exam)parts.prueba_objetiva=ROUND(exam.score);
    if(portfolio&&exam){
      grade=ROUND(portfolio.score*DEFAULT_PORTFOLIO_WEIGHT+exam.score*DEFAULT_EXAM_WEIGHT);
      instrument='combinada_60_40';
    }else if(portfolio||exam){
      instrument=portfolio?.instrument||exam?.instrument||null;
    }
  }
  const status=grade===null?(items.length?'parcial':'sin_evaluar'):(grade<threshold?'pendiente':'superado');
  return {...c,status,score:grade===null?null:ROUND(grade),instrument,parts,manual};
 });
 const complete=details.every(x=>x.score!==null);
 const weighted=complete?ROUND(details.reduce((s,c)=>s+c.score*c.weight/100,0)):null;
 const requiresObservation=ra==='RA7';
 const observationValidated=!requiresObservation||details.every(x=>x.manual);
 return {ra,threshold,complete,grade:weighted,criteria:details,
  pending:details.filter(x=>x.status==='pendiente').map(x=>x.id),
  partial:details.filter(x=>x.status==='parcial').map(x=>x.id),
  notEvaluated:details.filter(x=>x.status==='sin_evaluar').map(x=>x.id),
  passed:complete&&observationValidated&&weighted>=5&&details.every(x=>x.status==='superado'),
  requiresObservation,observationValidated,
  instrumentPolicy:'60 % portafolio/práctica + 40 % prueba objetiva; calificación final CE validada prevalece'
 };
}
function gradeObjective(correct,wrong,blank,total){
 if(!Number.isInteger(total)||total<1||correct<0||wrong<0||blank<0||correct+wrong+blank!==total)throw new Error('Recuento de respuestas inválido');
 return ROUND(Math.max(0,(correct-0.5*wrong)/total*10));
}
module.exports={criteriaFor,evaluateRA,gradeObjective};

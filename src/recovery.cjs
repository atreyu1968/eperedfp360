'use strict';
const {criteriaFor,evaluateRA}=require('./evaluation.cjs');
function createRecoveryPlan(ra,validatedEntries,options={}){
 const threshold=Number.isFinite(options.threshold)?options.threshold:5;
 const limit=Number.isSafeInteger(options.activitiesPerCriterion)?options.activitiesPerCriterion:20;
 if(threshold<0||threshold>10||limit<1||limit>200)throw new Error('Parámetros de recuperación inválidos');
 const result=evaluateRA(ra,validatedEntries,threshold);
 const byId=new Map(result.criteria.map(c=>[c.id,c]));
 return {ra,studentId:options.studentId||null,generatedAt:new Date().toISOString(),threshold,
  pending:result.pending.map(ce=>({ce,initialScore:byId.get(ce).score,
    phases:['refuerzo','portafolio','evaluacion_docente'],suggestedActivities:limit,teacherValidationRequired:true})),
  unassessed:result.notEvaluated,alreadyPassed:result.criteria.filter(c=>c.status==='superado').map(c=>c.id),
  note:'Plan orientativo: requiere asignación y validación del profesor. No modifica las notas existentes.'};
}
function validateCriterion(ce){
 const match=/^(RA[1-7])\.([a-j])$/.exec(String(ce||''));
 if(!match)return false;
 return criteriaFor(match[1]).some(c=>c.id===ce);
}
module.exports={createRecoveryPlan,validateCriterion};

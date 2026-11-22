'use strict';

/**
 * Ejecutado exclusivamente por Electron en el contexto de la página de cada
 * portafolio / examen original. El contenido de la página puede ser modificado
 * por el alumno: TODO resultado devuelto es una PROPUESTA no validada.
 *
 * Compatible con cinco familias reales de las 20 aplicaciones.
 * No toma la identidad declarada como identidad verificada.
 */
const CAPTURE_SOURCE = String.raw`(() => {
  try {
    if (typeof state === 'undefined' || !state || typeof state !== 'object') return null;
    if (state.finalized !== true && state.finished !== true) return null;
    let raw = null, variant = null;
    if (typeof scoreAll === 'function') {raw = scoreAll(); variant = 'scoreAll';}
    else if (typeof gradeAll === 'function') {raw = gradeAll(); variant = 'gradeAll';}
    else if (typeof grading === 'function') {raw = grading(); variant = 'grading';}
    else if (typeof grades === 'function') {raw = grades(); variant = 'grades';}
    else if (typeof grade === 'function') {raw = grade(); variant = 'grade';}
    if (!raw || !variant) return {error:'No hay calificador compatible'};
    const input = raw.byCE || raw.data || raw.per || raw.ce;
    if (!input) return {error:'Calificador sin desglose de criterios'};
    const entries = Array.isArray(input)
      ? input.map(x => [x.id || x.ce, x])
      : Object.entries(input);
    const scores = entries.map(([key, value]) => ({
      ce: String(key).trim().toLowerCase().replace(/^ra/, ''),
      score: typeof value === 'number' ? value :
        Number(value?.score ?? value?.grade ?? value?.note)
    }));
    const student = state.student || {};
    return {
      version:1,
      variant,
      sessionId:String(state.sessionId || state.id || state.attemptId || '').slice(0,128),
      finalizedAt: String(state.finalizedAt || state.finishedAt || '').slice(0,50),
      claimedStudent:String(student.code || student.id || '').slice(0,100),
      claimedName:String(student.name || '').slice(0,150),
      scores
    };
  } catch(e) {
    return {error:'No se pudo leer el resultado: '+String(e.message || e).slice(0,250)};
  }
})()`;

const curriculum=require('../curriculum/manifest.json');
const byRa=new Map(curriculum.units.map(u=>[u.ra,u]));
function normalizeCandidate(payload,studentId,resourceId){
  if(!payload || payload.version!==1 || typeof studentId!=='string'
    || !/^[A-Za-z0-9._-]{3,64}$/.test(studentId))throw new Error('Resultado o alumno inválido');
  if(typeof resourceId!=='string')throw new Error('Recurso inválido');
  const unit=curriculum.units.find(u=>[u.portfolio,...u.exams].some(x=>x.id===resourceId));
  if(!unit)throw new Error('Resultado fuera del catálogo');
  if(!['grade','gradeAll','grades','grading','scoreAll'].includes(payload.variant))throw new Error('Formato desconocido');
  if(!/^[A-Za-z0-9_.-]{4,128}$/.test(payload.sessionId))throw new Error('Sesión sin identificador válido');
  if(!Array.isArray(payload.scores)||payload.scores.length!==unit.weights.length)throw new Error('Número de criterios incorrecto');
  const date=Date.parse(payload.finalizedAt);
  if(!Number.isFinite(date)||date<Date.UTC(2024,0,1)||date>Date.now()+86400000)throw new Error('Fecha de cierre inválida');
  const seen=new Set();
  const scores=payload.scores.map(({ce,score})=>{
    const str=String(ce||'').toLowerCase().replace(/^ra/,'');
    const match=new RegExp('^'+unit.ra.slice(2)+'\\.([a-z])$').exec(str);
    if(!match)throw new Error('CE ajeno a '+unit.ra);
    const index=match[1].charCodeAt(0)-97;
    if(index>=unit.weights.length||seen.has(str))throw new Error('Criterio duplicado o fuera de rango');
    seen.add(str);
    if(typeof score!=='number'||!Number.isFinite(score)||score<0||score>10+1e-6)throw new Error('Nota de CE inválida');
    return {ce:unit.ra+'.'+match[1],score:Math.round(Math.min(score,10)*100)/100};
  });
  const finishedAt=new Date(date).toISOString();
  return {
    studentId, resourceId, ra:unit.ra, sessionId:payload.sessionId,
    finalizedAt:finishedAt, scores:scores.sort((a,b)=>a.ce.localeCompare(b.ce)),
    claimedStudent:String(payload.claimedStudent||'').slice(0,100),
    claimedName:String(payload.claimedName||'').slice(0,150),
    instrument:resourceId.includes('-EXAMEN-')?'prueba_objetiva':'portafolio',
    source:'html_local_sin_firma'
  };
}
module.exports={CAPTURE_SOURCE,normalizeCandidate};

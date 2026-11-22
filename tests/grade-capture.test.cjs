'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {CAPTURE_SOURCE,normalizeCandidate}=require('../src/grade-capture.cjs');

function run(variant,data,state={finalized:true,sessionId:'EPE-UD5-TEST-777',finalizedAt:'2026-11-22T15:00:00.000Z',
 student:{name:'Alumno Ejemplo',code:'GA2-015'}}){
 const ctx={state,[variant]:()=>data};
 return vm.runInNewContext(CAPTURE_SOURCE,ctx);
}
test('captura de los 5 motores de notas de las aplicaciones originales',()=>{
 const suffix='abcdef';
 const names=suffix.split('').map((letter,i)=>['5.'+letter,{score:7,grade:7,note:7}]);
 for(const [variant,gradeData] of [
  ['grade',{data:Object.fromEntries(names)}],
  ['gradeAll',{byCE:Object.fromEntries(names.map(([k,v])=>[k,7]))}],
  ['grading',{byCE:Object.fromEntries(names)}],
  ['grades',{byCE:Object.fromEntries(names)}],
  ['scoreAll',{per:Object.fromEntries(names)}]
 ]){
  const result=run(variant,gradeData);
  assert.equal(result.variant,variant);
  const normalized=normalizeCandidate(result,'GA2-015','UD5-PORTAFOLIO');
  assert.equal(normalized.scores.length,6);
  assert.equal(normalized.scores[0].score,7);
 }
});
test('rechaza resultados no finalizados y CE falsificados',()=>{
 const output=run('grade',{data:{'5.a':{score:7}}},{finalized:false});
 assert.equal(output,null);
 const data=run('grade',{data:Object.fromEntries('abcdef'.split('').map(l=>['5.'+l,{score:6}]))});
 data.scores[2].ce='6.c';
 assert.throws(()=>normalizeCandidate(data,'GA2-015','UD5-PORTAFOLIO'),/CE ajeno/);
});
test('valida el número de criterios y la nota',()=>{
 const data=run('grades',{byCE:Object.fromEntries('abcdef'.split('').map(l=>['5.'+l,{score:8}]))});
 data.scores[0].score=15;
 assert.throws(()=>normalizeCandidate(data,'GA2-015','UD5-PORTAFOLIO'),/Nota/);
});

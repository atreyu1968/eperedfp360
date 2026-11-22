'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {criteriaFor,evaluateRA,gradeObjective}=require('../src/evaluation.cjs');
test('siete RA y 49 criterios con pesos 100%',()=>{
 const counts=[6,8,6,7,6,6,10];let n=0;
 for(let i=1;i<=7;i++){const cs=criteriaFor('RA'+i);assert.equal(cs.length,counts[i-1]);assert.equal(cs.reduce((a,b)=>a+b.weight,0),100);n+=cs.length}
 assert.equal(n,49);
});
test('recuperación por criterio, sin tratar ausencias como cero',()=>{
 const ra='RA5';const init=evaluateRA(ra,[{id:1,ce:'RA5.a',score:8,validated:true}]);
 assert.equal(init.grade,null);assert.equal(init.notEvaluated.length,5);
 const complete=criteriaFor(ra).map((c,i)=>({id:i+1,ce:c.id,score:i===1?3:8,validated:true}));
 assert.deepEqual(evaluateRA(ra,complete).pending,['RA5.b']);
 const reexamine=[...complete,{id:20,ce:'RA5.b',score:7,validated:true,mode:'recuperacion'}];
 assert.equal(evaluateRA(ra,reexamine).pending.length,0);
 assert.equal(evaluateRA(ra,reexamine).passed,true);
});
test('nota objetiva con penalización 0,5 y blancos neutros',()=>{
 assert.equal(gradeObjective(80,10,10,100),7.5);
 assert.equal(gradeObjective(0,100,0,100),0);
 assert.equal(gradeObjective(100,0,0,100),10);
});

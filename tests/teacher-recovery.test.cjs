'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {passwordAcceptable,createCredential,verifyCredential}=require('../src/teacher-auth.cjs');
const {createRecoveryPlan,validateCriterion}=require('../src/recovery.cjs');
test('cuenta docente: contraseña y verificación criptográfica',()=>{
 assert.equal(passwordAcceptable('corta'),false);
 const secret='ejemplo-docente-2026-seguro';
 const cred=createCredential(secret);
 assert.ok(verifyCredential(secret,cred));
 assert.equal(verifyCredential('clave-incorrecta',cred),false);
 assert.notEqual(createCredential(secret),cred);
});
test('recuperación RA5 por CE sin perder las notas',()=>{
 const marks=['a','b','c','d','e','f'].map((letter,i)=>({
  id:i+1,ce:'RA5.'+letter,score:letter==='b'||letter==='d'?3:7,validated:true
 }));
 const plan=createRecoveryPlan('RA5',marks,{studentId:'GA2-015',activitiesPerCriterion:30});
 assert.deepEqual(plan.pending.map(x=>x.ce),['RA5.b','RA5.d']);
 assert.equal(plan.pending[0].suggestedActivities,30);
 assert.equal(marks[1].score,3);
 assert.equal(plan.alreadyPassed.length,4);
});
test('criterios válidos en 49 CE',()=>{
 assert.equal(validateCriterion('RA1.f'),true);
 assert.equal(validateCriterion('RA7.j'),true);
 assert.equal(validateCriterion('RA2.i'),false);
 assert.equal(validateCriterion('RA8.a'),false);
});

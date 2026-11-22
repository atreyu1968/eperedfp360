'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {scopedId,candidateIds,taskMax,getResource,isLaunchPermission}=require('../src/activity-permissions.cjs');
test('permisos para 2.552 actividades',()=>{
 let total=0;
 for(let i=1;i<=7;i++){
  const unit=getResource('UD'+i+'-PORTAFOLIO').unit;
  const per=taskMax(unit);
  assert.ok(Number.isInteger(per));
  for(let c=0;c<unit.weights.length;c++)for(let q=1;q<=per;q++){
   const ce=unit.ra+'.'+String.fromCharCode(97+c);
   const id=scopedId(unit.portfolio.id,'actividad',ce,q);
   assert.ok(id.endsWith('/'+String(q).padStart(3,'0')));
   total++;
  }
 }
 assert.equal(total,2552);
});
test('recurso, criterio, actividad y portafolio completo',()=>{
 assert.equal(scopedId('UD3-PORTAFOLIO','criterio','RA3.a'),'UD3-PORTAFOLIO@RA3.a');
 assert.equal(scopedId('UD3-PORTAFOLIO','actividad','RA3.a',60),'UD3-PORTAFOLIO@RA3.a/060');
 assert.equal(scopedId('UD4-PORTAFOLIO','actividad','RA4.g',56),'UD4-PORTAFOLIO@RA4.g/056');
 assert.deepEqual(candidateIds('UD4-PORTAFOLIO','RA4.a',1),
 ['UD4-PORTAFOLIO@ALL','UD4-PORTAFOLIO@RA4.a','UD4-PORTAFOLIO@RA4.a/001']);
});
test('no se permite emitir códigos imposibles',()=>{
 assert.throws(()=>scopedId('UD4-PORTAFOLIO','actividad','RA4.g',57),/intervalo/);
 assert.throws(()=>scopedId('UD2-PORTAFOLIO','actividad','RA2.z',1),/Criterio/);
 assert.throws(()=>scopedId('UD1-EXAMEN-100','actividad','RA1.a',1),/portafolio/);
 assert.throws(()=>scopedId('desconocido','recurso'),/no encontrado/);
});

test('un código de criterio o actividad habilita apertura solo del portafolio pertinente',()=>{
 assert.equal(isLaunchPermission('UD1-PORTAFOLIO','UD1-PORTAFOLIO'),true);
 assert.equal(isLaunchPermission('UD1-PORTAFOLIO','UD1-PORTAFOLIO@ALL'),true);
 assert.equal(isLaunchPermission('UD1-PORTAFOLIO','UD1-PORTAFOLIO@RA1.a'),true);
 assert.equal(isLaunchPermission('UD1-PORTAFOLIO','UD1-PORTAFOLIO@RA1.f/060'),true);
 assert.equal(isLaunchPermission('UD1-PORTAFOLIO','UD1-PORTAFOLIO@RA1.g/001'),false);
 assert.equal(isLaunchPermission('UD1-PORTAFOLIO','UD1-PORTAFOLIO@RA1.a/061'),false);
 assert.equal(isLaunchPermission('UD1-PORTAFOLIO','UD2-PORTAFOLIO@RA2.a/001'),false);
 assert.equal(isLaunchPermission('UD1-EXAMEN-100','UD1-EXAMEN-100@RA1.a/001'),false);
});

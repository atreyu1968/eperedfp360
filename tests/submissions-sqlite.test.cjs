'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
let nativeAvailable=true;
try{require.resolve('better-sqlite3')}catch{nativeAvailable=false}
test('SQLite: recepción, deduplicación y validación exclusiva del profesor', {skip:!nativeAvailable}, t=>{
 let db;
 try{db=require('../src/database.cjs').openDatabase(':memory:')}
 catch(e){t.skip('SQLite nativo no disponible para la versión de Node.js de este runner: '+e.message);return}
 try{
  const scores='abcdef'.split('').map(x=>({ce:'RA5.'+x,score:x==='b'?3.4:7.8}));
  const item={
    studentId:'GA2-015',resourceId:'UD5-PORTAFOLIO',ra:'RA5',
    sessionId:'EPE-UD5-2026-ABCDEF',finalizedAt:'2026-11-22T15:00:00.000Z',
    scores,claimedName:'Alumno Ejemplo',claimedStudent:'GA2-015',
    instrument:'portafolio',source:'html_local_sin_firma'
  };
  const inserted=db.receiveSubmission(item);
  assert.equal(inserted.created,true);
  assert.equal(db.receiveSubmission(item).created,false);
  assert.equal(db.getGrades(item.studentId).length,0,'No hay notas oficiales antes de validación');
  assert.equal(db.listSubmissions().length,1);
  assert.equal(db.exportStudentSubmissions(item.studentId).length,1);
  const reviewed=db.reviewSubmission(inserted.id,'aprobar','ordinaria','He revisado las evidencias correspondientes.');
  assert.equal(reviewed.count,6);
  assert.equal(db.getGrades(item.studentId).length,6);
  assert.equal(db.listSubmissions('pendiente').length,0);
  assert.throws(()=>db.reviewSubmission(inserted.id,'aprobar','ordinaria','Repetir'),/ya revisada/);
  const second={...item,sessionId:'EPE-UD5-2026-GHIJKL'};
  const received=db.receiveSubmission(second);
  assert.equal(db.reviewSubmission(received.id,'descartar','ordinaria','El documento no corresponde a este alumno').count,0);
  assert.equal(db.getGrades(item.studentId).length,6);
 }finally{db.close()}
});

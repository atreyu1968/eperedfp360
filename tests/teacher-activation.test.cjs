'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {verifyTeacherActivation}=require('../src/teacher-auth.cjs');

test('alta docente: la clave maestra correcta coincide con el certificado de GitHub',()=>{
 const secret='Clave-Maestra-EPE-FP360-Para-Prueba-2026';
 const seed=crypto.scryptSync(secret,'epe-fp360-teacher-ed25519-v1',32,{
  N:16384,r:8,p:1,maxmem:64*1024*1024
 });
 const prefix=Buffer.from('302e020100300506032b657004220420','hex');
 const key=crypto.createPrivateKey({key:Buffer.concat([prefix,seed]),format:'der',type:'pkcs8'});
 const publicPem=crypto.createPublicKey(key).export({format:'pem',type:'spki'});
 assert.equal(verifyTeacherActivation(secret,publicPem),true);
 assert.equal(verifyTeacherActivation('clave-incorrecta-que-no-debe-servir',publicPem),false);
 assert.equal(verifyTeacherActivation('corta',publicPem),false);
 assert.equal(verifyTeacherActivation(secret,'clave no válida'),false);
 seed.fill(0);
});

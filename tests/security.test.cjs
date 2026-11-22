'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {verifyPermission}=require('../src/security.cjs');
test('autorización Ed25519 ligada a recurso y estudiante',()=>{
 const keys=crypto.generateKeyPairSync('ed25519');
 const publicKey=keys.publicKey.export({type:'spki',format:'pem'});
 const now=Date.now();
 const data={version:1,audience:'epe-fp360',studentId:'GA2-015',
  resourceId:'UD1-PORTAFOLIO',issuedAt:now,expiresAt:now+60000,
  nonce:crypto.randomBytes(20).toString('hex')};
 const body=Buffer.from(JSON.stringify(data)).toString('base64url');
 const signature=crypto.sign(null,Buffer.from(body,'utf8'),keys.privateKey).toString('base64url');
 const code=body+'.'+signature;
 assert.equal(verifyPermission(code,publicKey,{studentId:'GA2-015',resourceId:'UD1-PORTAFOLIO'}).nonce,data.nonce);
 assert.throws(()=>verifyPermission(code,publicKey,{studentId:'OTRO-015',resourceId:'UD1-PORTAFOLIO'}),/no válido/);
 assert.throws(()=>verifyPermission(code,publicKey,{studentId:'GA2-015',resourceId:'UD2-PORTAFOLIO'}),/no válido/);
 assert.throws(()=>verifyPermission(code,publicKey,{studentId:'GA2-015',resourceId:'UD1-PORTAFOLIO',now:now+120000}),/caducado/);
 assert.throws(()=>verifyPermission(body+'.AAAA',publicKey,{studentId:'GA2-015',resourceId:'UD1-PORTAFOLIO'}),/firma/);
});

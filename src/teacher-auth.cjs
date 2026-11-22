'use strict';
const crypto=require('node:crypto');

function passwordAcceptable(password){
 return typeof password==='string'&&password.length>=14&&password.length<=256;
}
function createCredential(password){
 if(!passwordAcceptable(password))throw new Error('La contraseña debe tener entre 14 y 256 caracteres.');
 const salt=crypto.randomBytes(24);
 const hash=crypto.scryptSync(password,salt,64,{maxmem:64*1024*1024});
 return ['scrypt-v1',salt.toString('base64url'),hash.toString('base64url')].join(':');
}
function verifyCredential(password,stored){
 if(typeof password!=='string'||typeof stored!=='string')return false;
 const parts=stored.split(':');
 if(parts.length!==3||parts[0]!=='scrypt-v1')return false;
 try{
  const salt=Buffer.from(parts[1],'base64url'),expected=Buffer.from(parts[2],'base64url');
  if(salt.length!==24||expected.length!==64)return false;
  const actual=crypto.scryptSync(password,salt,64,{maxmem:64*1024*1024});
  return crypto.timingSafeEqual(actual,expected);
 }catch{return false}
}

function verifyTeacherActivation(master,publicPem){
 if(typeof master!=='string'||master.length<24||master.length>512
   ||typeof publicPem!=='string'||!publicPem.includes('BEGIN PUBLIC KEY'))return false;
 let seed,der;
 try{
  seed=crypto.scryptSync(master,'epe-fp360-teacher-ed25519-v1',32,
   {N:16384,r:8,p:1,maxmem:64*1024*1024});
  der=Buffer.concat([Buffer.from('302e020100300506032b657004220420','hex'),seed]);
  const privateKey=crypto.createPrivateKey({key:der,format:'der',type:'pkcs8'});
  const actual=crypto.createPublicKey(privateKey).export({format:'der',type:'spki'});
  const expected=crypto.createPublicKey(publicPem).export({format:'der',type:'spki'});
  return actual.length===expected.length&&crypto.timingSafeEqual(actual,expected);
 }catch{return false}
 finally{if(seed)seed.fill(0);if(der)der.fill(0)}
}
module.exports={passwordAcceptable,createCredential,verifyCredential,verifyTeacherActivation};

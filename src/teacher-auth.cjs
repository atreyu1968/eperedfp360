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
module.exports={passwordAcceptable,createCredential,verifyCredential};

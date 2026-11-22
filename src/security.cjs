'use strict';
const crypto=require('node:crypto');
const MAX_CODE=16000;
function verifyPermission(code,publicKey,{studentId,resourceId,now=Date.now()}){
 if(typeof code!=='string'||code.length>MAX_CODE)throw new Error('Código inválido');
 if(typeof publicKey!=='string'||!publicKey.includes('BEGIN PUBLIC KEY'))throw new Error('No se ha configurado la clave pública docente.');
 const parts=code.trim().split('.');
 if(parts.length!==2)throw new Error('El código no tiene un formato válido');
 const [p,s]=parts;
 const verified=crypto.verify(null,Buffer.from(p,'utf8'),publicKey,Buffer.from(s,'base64url'));
 if(!verified)throw new Error('La firma del código es incorrecta');
 let claim;
 try{claim=JSON.parse(Buffer.from(p,'base64url').toString('utf8'))}catch{throw new Error('Datos del código ilegibles')}
 if(claim.version!==1||claim.audience!=='epe-fp360'||claim.studentId!==studentId||claim.resourceId!==resourceId)throw new Error('Código no válido para este alumno o recurso');
 if(!Number.isSafeInteger(claim.expiresAt)||claim.expiresAt<=now)throw new Error('Código caducado');
 if(!Number.isSafeInteger(claim.issuedAt)||claim.issuedAt>now+300000)throw new Error('Fecha de emisión no válida');
 if(typeof claim.nonce!=='string'||claim.nonce.length<20)throw new Error('Identificador de permiso inválido');
 return claim;
}
module.exports={verifyPermission};

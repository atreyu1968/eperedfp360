/**
 * EPE FP360 · generación reproducible de par Ed25519 para GitHub Actions.
 *
 * El secreto NO se escribe en stdout, archivos ni log.
 * Repetir la compilación con la misma clave maestra mantiene el mismo par de claves.
 * La clave privada SOLO queda cifrada, fuera del paquete portable.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const master=process.env.EPE_FP360_MASTER_SECRET;
if(typeof master!=='string'||master.length<24||master.length>512){
  console.error('Se requiere EPE_FP360_MASTER_SECRET de 24–512 caracteres en Secrets de GitHub.');
  process.exit(2);
}
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.join(root,'teacher-secrets');
const publicPath=path.join(root,'curriculum','teacher-public.pem');
const privatePath=path.join(dir,'private.pem');
fs.mkdirSync(dir,{recursive:true});

if(fs.existsSync(privatePath)){
  console.error('Existe una clave docente privada en el directorio. Abortando sin sobrescribirla.');
  process.exit(2);
}
const seed=crypto.scryptSync(master,'epe-fp360-teacher-ed25519-v1',32,{N:16384,r:8,p:1,maxmem:64*1024*1024});
const prefix=Buffer.from('302e020100300506032b657004220420','hex');
const der=Buffer.concat([prefix,seed]);
let key;
try{key=crypto.createPrivateKey({key:der,format:'der',type:'pkcs8'})}
finally{seed.fill(0);der.fill(0)}
const publicKey=crypto.createPublicKey(key).export({format:'pem',type:'spki'});
const privateKey=key.export({format:'pem',type:'pkcs8',cipher:'aes-256-cbc',passphrase:master});
if(fs.existsSync(publicPath)){
  const existing=fs.readFileSync(publicPath,'utf8');
  if(existing!==publicKey)throw Error('La clave pública existente NO coincide con la clave maestra actual');
}else{
  fs.writeFileSync(publicPath,publicKey,{mode:0o644,flag:'wx'});
}
fs.writeFileSync(privatePath,privateKey,{mode:0o600,flag:'wx'});
console.log('Claves docentes preparadas de forma reproducible: pública para la aplicación, privada cifrada para entrega exclusiva al profesor.');
console.log('No cambie EPE_FP360_MASTER_SECRET entre versiones: cambiaría la identidad firmante de los permisos.');

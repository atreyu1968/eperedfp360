import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const password=process.env.EPE_TEACHER_KEY_PASSWORD;
if(!password||password.length<14){console.error('Defina EPE_TEACHER_KEY_PASSWORD con al menos 14 caracteres. No introduzca la contraseña en la línea de comandos.');process.exit(2)}
const dir=path.join(root,'teacher-secrets');fs.mkdirSync(dir,{recursive:true});
const priv=path.join(dir,'private.pem'),pub=path.join(root,'curriculum/teacher-public.pem');
if(fs.existsSync(priv)||fs.existsSync(pub)){console.error('Ya existen claves. Se cancela para evitar invalidar autorizaciones anteriores.');process.exit(1)}
const pair=crypto.generateKeyPairSync('ed25519',{publicKeyEncoding:{type:'spki',format:'pem'},privateKeyEncoding:{type:'pkcs8',format:'pem',cipher:'aes-256-cbc',passphrase:password}});
fs.writeFileSync(priv,pair.privateKey,{mode:0o600,flag:'wx'});fs.writeFileSync(pub,pair.publicKey,{flag:'wx'});
console.log('Claves creadas. La privada está en teacher-secrets/private.pem (cifrada); NO distribuirla. La pública irá al ejecutable del alumnado.');

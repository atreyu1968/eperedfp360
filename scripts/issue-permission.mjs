import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const args=Object.fromEntries(process.argv.slice(2).filter(x=>x.startsWith('--')&&x.includes('=')).map(x=>{const i=x.indexOf('=');return [x.slice(2,i),x.slice(i+1)]}));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'curriculum/manifest.json'),'utf8'));
const valid=new Set(manifest.units.flatMap(u=>[u.portfolio,...u.exams].map(x=>x.id)));
if(!args.student||!/^[A-Za-z0-9._-]{3,64}$/.test(args.student)||!valid.has(args.resource)){console.error('Uso: npm run token:issue -- --student=GA2-015 --resource=UD3-PORTAFOLIO --hours=48');process.exit(2)}
const hours=Number(args.hours??48);
if(!Number.isSafeInteger(hours)||hours<1||hours>720)throw new Error('Horas fuera de rango (1–720)');
const password=process.env.EPE_TEACHER_KEY_PASSWORD;
if(!password)throw new Error('Falta EPE_TEACHER_KEY_PASSWORD');
const privateKey=crypto.createPrivateKey({key:fs.readFileSync(path.join(root,'teacher-secrets/private.pem')),passphrase:password});
const now=Date.now(),claim={version:1,audience:'epe-fp360',studentId:args.student,resourceId:args.resource,issuedAt:now,expiresAt:now+hours*3600000,nonce:crypto.randomBytes(20).toString('hex')};
const payload=Buffer.from(JSON.stringify(claim)).toString('base64url');
const signature=crypto.sign(null,Buffer.from(payload,'utf8'),privateKey).toString('base64url');
const code=payload+'.'+signature;
console.log('Código de autorización para '+args.student+' / '+args.resource+'\n'+code+'\nCaduca: '+new Date(claim.expiresAt).toISOString());
